import { Cron } from "croner";
import { prisma } from "@nexus/db";
import { agentQueue } from "./queue";
import { scheduledSlot } from "./schedule-utils";

export async function fireScheduledAgents(now = new Date()) {
  const agents = await prisma.agent.findMany({
    where: { trigger: "SCHEDULE", isActive: true, cronExpr: { not: null } },
    select: { id: true, cronExpr: true },
  });
  for (const agent of agents) {
    const slot = scheduledSlot(agent.cronExpr!, now, process.env.SCHEDULE_TIMEZONE ?? "UTC");
    if (!slot) continue;
    let run;
    try {
      run = await prisma.agentRun.create({ data: {
        agentId: agent.id, status: "PENDING", input: "(scheduled run)",
        scheduledKey: `${agent.id}:${slot}`, logs: [],
      } });
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") continue;
      throw error;
    }
    try {
      await agentQueue.add("run-agent", { agentRunId: run.id }, {
        jobId: run.id, attempts: 1, removeOnComplete: 100, removeOnFail: 50,
      });
    } catch (error) {
      await prisma.agentRun.updateMany({ where: { id: run.id, status: "PENDING" }, data: {
        status: "FAILED", endedAt: new Date(),
        logs: [{ ts: new Date().toISOString(), level: "error", message: "No se pudo encolar la ejecución" }],
      } });
      console.error("[Scheduler] Queue error", error);
    }
  }
}
export function startScheduler() {
  return new Cron("* * * * *", { timezone: "UTC", protect: true }, async () => {
    try { await fireScheduledAgents(); }
    catch (error) { console.error("[Scheduler]", error); }
  });
}
