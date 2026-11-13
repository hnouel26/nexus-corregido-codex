import { claimRun, failInterruptedRun } from "./run-state";
import { Worker } from "bullmq";
import { prisma } from "@nexus/db";
import { getPlugin, decryptConfig, getEncryptionKey, executePluginAction } from "@nexus/plugins";
import type { ClaudeTool } from "@nexus/plugins";
import OpenAI from "openai";
import { connection, agentQueue } from "./queue";
import { runAgentLoop, RunCancelledError } from "./agent-loop";
import { startScheduler } from "./scheduler";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";
// ── Log helper ────────────────────────────────────────────────────────────────
type LogLevel = "info" | "tool_call" | "tool_result" | "tool_error" | "error" | "done";

interface LogEntry {
  ts: string;
  level: LogLevel;
  message: string;
  data?: unknown;
}

async function appendLog(runId: string, level: LogLevel, message: string, data?: unknown) {
  const entry: LogEntry = { ts: new Date().toISOString(), level, message, data };
  const run = await prisma.agentRun.findUnique({ where: { id: runId }, select: { logs: true } });
  const logs = Array.isArray(run?.logs) ? run.logs as unknown as LogEntry[] : [];
  logs.push(entry);
  await prisma.agentRun.updateMany({ where: { id: runId, status: "RUNNING" }, data: { logs: JSON.parse(JSON.stringify(logs)) } });
}

// ── Notification helper ────────────────────────────────────────────────────────
async function notifyAgentRun(runId: string, status: "COMPLETED" | "FAILED", detail?: string) {
  try {
    const run = await prisma.agentRun.findUnique({
      where: { id: runId },
      include: { agent: { select: { name: true, userId: true, id: true } } },
    });
    if (!run) return;

    const isOk = status === "COMPLETED";
    const preview = detail ? ` — ${detail.slice(0, 120)}` : "";
    await prisma.notification.create({
      data: {
        title: isOk ? `Agente completado: ${run.agent.name}` : `Agente fallido: ${run.agent.name}`,
        message: isOk
          ? `La ejecución finalizó correctamente.${preview}`
          : `La ejecución falló.${preview}`,
        type: isOk ? "SUCCESS" : "ERROR",
        link: `/agents/${run.agentId}?run=${runId}`,
        sourceType: "agent_run",
        sourceId: runId,
        userId: run.agent.userId,
      },
    });
  } catch {
    // Non-critical — never let a notification failure crash the worker
  }
}

async function executeAgent(agentRunId: string) {
  const run = await prisma.agentRun.findUnique({
    where: { id: agentRunId },
    include: {
      agent: {
        include: { agentTools: { include: { tool: true } } },
      },
    },
  });

  if (!run) throw new Error("AgentRun no encontrado");

  const { agent } = run;
  const owner = await prisma.user.findUnique({ where: { id: agent.userId }, select: { role: true } });
  if (owner?.role !== "ADMIN") throw new Error("Solo administradores pueden ejecutar agentes con servicios compartidos");
  if (!agent.isActive) throw new Error("Agente inactivo");
  await appendLog(agentRunId, "info", `Agente: ${agent.name} (${agent.model})`);

  // Get OpenAI API key: env var takes priority, then openai tool config
  let apiKey = OPENAI_API_KEY;
  if (!apiKey) {
    const provider = await prisma.tool.findUnique({ where: { name: "openai" } });
    if (provider?.isActive) apiKey = decryptConfig(provider.config as string, getEncryptionKey()).apiKey ?? "";
  }
  if (!apiKey) throw new Error("No hay API key de OpenAI configurada (env OPENAI_API_KEY o plugin OpenAI)");

  const openai = new OpenAI({ apiKey, timeout: 60_000, maxRetries: 1 });

  // Build tools from agent's connected plugins
  const claudeTools: ClaudeTool[] = [];
  const pluginMap: Record<string, { config: Record<string, string>; pluginName: string }> = {};

  for (const agentTool of agent.agentTools) {
    if (!agentTool.tool.isActive || agentTool.tool.name === "openai") continue;
    const plugin = getPlugin(agentTool.tool.name);
    if (!plugin) continue;
    const config = decryptConfig(agentTool.tool.config as string, getEncryptionKey());
    const tools = plugin.toClaudeTools();
    for (const t of tools) {
      claudeTools.push(t);
      pluginMap[t.name] = { config, pluginName: agentTool.tool.name };
    }
  }

  // Convert to OpenAI function-calling format
  const openAiTools: OpenAI.ChatCompletionTool[] = claudeTools.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema as Record<string, unknown>,
    },
  }));

  if (openAiTools.length > 0) {
    await appendLog(agentRunId, "info", `Herramientas disponibles: ${openAiTools.map((t) => t.function.name).join(", ")}`);
  }

  return runAgentLoop({
    messages: [
      { role: "system", content: agent.systemPrompt },
      { role: "user", content: run.input ?? "Ejecuta tu tarea." },
    ],
    request: async (messages) => openai.chat.completions.create({
      model: agent.model, max_tokens: 4096, messages,
      tools: openAiTools.length ? openAiTools : undefined,
    }),
    isCancelled: async () => {
      const current = await prisma.agentRun.findUnique({ where: { id: agentRunId }, select: { status: true } });
      return !current || current.status !== "RUNNING";
    },
    log: (level, message, data) => appendLog(agentRunId, level, message, data),
    executeTool: async (name, input) => {
      const entry = pluginMap[name];
      if (!entry) throw new Error(`Herramienta no encontrada: ${name}`);
      const action = name.slice(entry.pluginName.length + 2);
      return executePluginAction(getPlugin(entry.pluginName)!, action, input, entry.config);
    },
  });
}
const worker = new Worker("agent-runs", async (job) => {
  const { agentRunId } = job.data as { agentRunId: string };
  if (!await claimRun(prisma.agentRun, agentRunId)) return;
  try {
    const output = await executeAgent(agentRunId);
    const updated = await prisma.agentRun.updateMany({
      where: { id: agentRunId, status: "RUNNING" },
      data: { status: "COMPLETED", endedAt: new Date(), output },
    });
    if (updated.count) await notifyAgentRun(agentRunId, "COMPLETED", output);
  } catch (error) {
    if (error instanceof RunCancelledError) return;
    const message = error instanceof Error ? error.message : String(error);
    await appendLog(agentRunId, "error", message);
    const updated = await prisma.agentRun.updateMany({
      where: { id: agentRunId, status: "RUNNING" },
      data: { status: "FAILED", endedAt: new Date() },
    });
    if (updated.count) await notifyAgentRun(agentRunId, "FAILED", message);
    throw error;
  }
}, { connection, concurrency: 5 });
worker.on("error", (error) => console.error("[Worker]", error));
worker.on("failed", (job, error) => {
  console.error(`[Worker] ${job?.id}`, error.message);
  if (job?.data.agentRunId) void failInterruptedRun(prisma.agentRun, job.data.agentRunId).catch((failure) => console.error("[Worker] Reconcile", failure));
});
const scheduler = startScheduler();
async function shutdown() {
  scheduler.stop();
  await worker.close();
  await agentQueue.close();
  await connection.quit();
  await prisma.$disconnect();
}
process.once("SIGTERM", () => { void shutdown(); });
process.once("SIGINT", () => { void shutdown(); });
console.log("[Worker] Nexus listo");
