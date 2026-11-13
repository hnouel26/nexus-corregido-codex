import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
export const dynamic = "force-dynamic";
const terminal = new Set(["COMPLETED", "FAILED", "CANCELLED"]);
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  const where = { id: params.id, agent: { userId: session.user.id } };
  const exists = await prisma.agentRun.findFirst({ where, select: { id: true } });
  if (!exists) return new Response("Not found", { status: 404 });
  const encoder = new TextEncoder();
  let closed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let logCount = 0;
  let close = () => {};
  const stream = new ReadableStream({
    start(controller) {
      close = () => {
        if (closed) return;
        closed = true;
        clearTimeout(timer);
        req.signal.removeEventListener("abort", close);
        try { controller.close(); } catch { /* already cancelled */ }
      };
      const send = (data: unknown) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)); }
        catch { close(); }
      };
      const poll = async () => {
        if (closed) return;
        try {
          const run = await prisma.agentRun.findFirst({ where, select: { status: true, logs: true, output: true } });
          if (closed) return;
          if (!run) { send({ type: "error", message: "Run no encontrado" }); close(); return; }
          const logs = Array.isArray(run.logs) ? run.logs : [];
          for (const log of logs.slice(logCount)) send({ type: "log", ...(log as object) });
          logCount = logs.length;
          send({ type: "status", status: run.status });
          if (terminal.has(run.status)) {
            send({ type: "done", status: run.status, output: run.output });
            close();
          } else if (!closed) timer = setTimeout(() => { void poll(); }, 800);
        } catch {
          send({ type: "error", message: "No se pudo leer la ejecución" });
          close();
        }
      };
      req.signal.addEventListener("abort", close, { once: true });
      if (req.signal.aborted) { close(); return; }
      send({ type: "connected", runId: params.id });
      void poll();
    },
    cancel() { close(); },
  });
  return new Response(stream, { headers: {
    "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive", "X-Accel-Buffering": "no",
  } });
}
