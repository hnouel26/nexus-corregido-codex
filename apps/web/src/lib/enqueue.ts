import { prisma } from "./db";

export async function enqueueRun(agentId: string, input: string | null) {
  const run = await prisma.agentRun.create({ data: { agentId, input, status: "PENDING", logs: [] } });
  try {
    const { agentQueue } = await import("./queue");
    await agentQueue.add("run-agent", { agentRunId: run.id }, {
      jobId: run.id, attempts: 1, removeOnComplete: 100, removeOnFail: 50,
    });
  } catch {
    await prisma.agentRun.updateMany({ where: { id: run.id, status: "PENDING" }, data: {
      status: "FAILED", endedAt: new Date(),
      logs: [{ ts: new Date().toISOString(), level: "error", message: "Cola no disponible" }],
    } });
    throw new Error("No se pudo encolar la ejecución. Comprueba Redis.");
  }
  return run;
}
