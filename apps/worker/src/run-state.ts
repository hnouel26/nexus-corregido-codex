import type { PrismaClient } from "@prisma/client";
type Store = Pick<PrismaClient["agentRun"], "updateMany">;
// Never replay a previously running job automatically: its external side
// effects may have already happened before the worker lost its lock.
export async function claimRun(store: Store, id: string): Promise<boolean> {
  const claimed = await store.updateMany({ where: { id, status: "PENDING" }, data: {
    status: "RUNNING", startedAt: new Date(), logs: [],
  } });
  if (claimed.count) return true;
  await failInterruptedRun(store, id);
  return false;
}
export async function failInterruptedRun(store: Store, id: string) {
  return store.updateMany({ where: { id, status: { in: ["PENDING", "RUNNING"] } }, data: {
    status: "FAILED", endedAt: new Date(),
    logs: [{ ts: new Date().toISOString(), level: "error", message: "El worker interrumpió la ejecución; revisa efectos externos antes de reintentar." }],
  } });
}
