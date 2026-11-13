import { prisma } from "@/lib/db";
import { enqueueRun } from "@/lib/enqueue";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const agent = await prisma.agent.findUnique({
    where: { webhookToken: params.token },
  });

  if (!agent) {
    return NextResponse.json({ error: "Token inválido" }, { status: 404 });
  }
  if (!agent.isActive) {
    return NextResponse.json({ error: "Agente inactivo" }, { status: 403 });
  }
  if (agent.trigger !== "WEBHOOK") {
    return NextResponse.json({ error: "Este agente no acepta webhooks" }, { status: 400 });
  }

  // Parse optional JSON body as input
  let input: string | null = null;
  try {
    const body = await req.json() as unknown;
    input = typeof body === "string" ? body : JSON.stringify(body);
  } catch {
    // no body or non-JSON — that's fine
  }

  if ((input?.length ?? 0) > 50000) return NextResponse.json({ error: "Input demasiado grande" }, { status: 413 });
  let run;
  try { run = await enqueueRun(agent.id, input ?? "(webhook trigger)"); }
  catch { return NextResponse.json({ error: "Cola no disponible" }, { status: 503 }); }

  return NextResponse.json({
    success: true,
    runId: run.id,
    status: "queued",
    agent: agent.name,
  });
}

// Allow GET to verify webhook is active
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const agent = await prisma.agent.findUnique({
    where: { webhookToken: params.token },
    select: { name: true, isActive: true, trigger: true },
  });

  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    agent: agent.name,
    active: agent.isActive,
    trigger: agent.trigger,
  });
}
