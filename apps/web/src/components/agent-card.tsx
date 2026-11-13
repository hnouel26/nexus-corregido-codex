"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Play, Pause, Trash2, Bot, Clock, CheckCircle2, XCircle, Loader2, Zap } from "lucide-react";
import { useState } from "react";

type AgentSummary = {
  id: string;
  name: string;
  description: string | null;
  model: string;
  trigger: string;
  cronExpr: string | null;
  webhookToken: string | null;
  isActive: boolean;
  _count: { runs: number };
  runs: Array<{ status: string; createdAt: Date }>;
  agentTools: Array<{ tool: { name: string; displayName: string } }>;
};

interface AgentCardProps {
  agent: AgentSummary;
  onRefetch: () => void;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  COMPLETED: <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />,
  FAILED: <XCircle className="w-3.5 h-3.5 text-red-400" />,
  RUNNING: <Loader2 className="w-3.5 h-3.5 text-[#0085D5] animate-spin" />,
  PENDING: <Clock className="w-3.5 h-3.5 text-gray-400" />,
  CANCELLED: <XCircle className="w-3.5 h-3.5 text-gray-300" />,
};

export function AgentCard({ agent, onRefetch }: AgentCardProps) {
  const [running, setRunning] = useState(false);

  const run = trpc.agents.run.useMutation({
    onMutate: () => setRunning(true),
    onSettled: () => setRunning(false),
    onSuccess: onRefetch,
    onError: (err) => alert(`Error: ${err.message}`),
  });
  const toggle = trpc.agents.toggleActive.useMutation({ onSuccess: onRefetch });
  const del = trpc.agents.delete.useMutation({ onSuccess: onRefetch });

  const lastRun = agent.runs[0];

  return (
    <div className={`bg-white rounded-xl border-2 transition-all ${
      agent.isActive ? "border-gray-200 hover:border-[#0085D5]/40" : "border-gray-100 opacity-60"
    }`}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 bg-[#003d7a]/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Bot className="w-5 h-5 text-[#003d7a]" />
          </div>
          <div className="flex-1 min-w-0">
            <Link href={`/agents/${agent.id}`}>
              <h3 className="font-semibold text-gray-900 hover:text-[#0085D5] truncate transition-colors">
                {agent.name}
              </h3>
            </Link>
            {agent.description && (
              <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{agent.description}</p>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-mono">
            {agent.model.replace("claude-", "")}
          </span>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
            {agent.trigger === "MANUAL" ? "▶ Manual" : agent.trigger === "SCHEDULE" ? `⏰ ${agent.cronExpr ?? "Schedule"}` : "🔗 Webhook"}
          </span>
          {agent.agentTools.map((at) => (
            <span key={at.tool.name} className="text-xs bg-blue-50 text-[#0085D5] px-2 py-1 rounded-md">
              {at.tool.displayName}
            </span>
          ))}
        </div>

        {/* Last run */}
        {lastRun && (
          <div className="flex items-center gap-2 mb-4 text-xs text-gray-500">
            {STATUS_ICON[lastRun.status]}
            <span>Último: {new Date(lastRun.createdAt).toLocaleDateString("es-MX", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
            <span className="ml-auto text-gray-400">{agent._count.runs} runs</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {agent.trigger === "MANUAL" && agent.isActive && (
            <button
              onClick={() => run.mutate({ id: agent.id })}
              disabled={running}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#0085D5] text-white rounded-lg text-sm font-medium hover:bg-[#0072b8] transition-colors disabled:opacity-50"
            >
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {running ? "Corriendo..." : "Ejecutar"}
            </button>
          )}
          <Link
            href={`/agents/${agent.id}`}
            className="px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            title="Ver detalle"
          >
            <Zap className="w-4 h-4" />
          </Link>
          <button
            onClick={() => toggle.mutate({ id: agent.id })}
            className="px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            title={agent.isActive ? "Desactivar" : "Activar"}
          >
            <Pause className="w-4 h-4" />
          </button>
          <button
            onClick={() => { if (confirm(`¿Eliminar "${agent.name}"?`)) del.mutate({ id: agent.id }); }}
            className="px-3 py-2 border border-red-100 text-red-400 rounded-lg text-sm hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
