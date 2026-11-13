"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { AgentRunLogs } from "@/components/agent-run-logs";
import { describeCron } from "@/lib/cron";
import { ArrowLeft, Play, Bot, Loader2, Clock, CheckCircle2, XCircle, Ban, Zap, Copy, Check } from "lucide-react";
import Link from "next/link";

export default function AgentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [showInputBox, setShowInputBox] = useState(false);

  const { data: agent, isLoading, refetch } = trpc.agents.get.useQuery({ id });
  const runMutation = trpc.agents.run.useMutation({
    onSuccess: (run) => {
      setActiveRunId(run.id);
      setShowInputBox(false);
      setInputText("");
      refetch();
    },
    onError: (err) => alert(`Error: ${err.message}`),
  });

  if (isLoading) {
    return <div className="p-8"><div className="animate-pulse h-6 bg-gray-200 rounded w-48" /></div>;
  }
  if (!agent) {
    return <div className="p-8 text-gray-500">Agente no encontrado. <Link href="/agents" className="text-[#0085D5] hover:underline">Volver</Link></div>;
  }

  const lastRun = agent.runs[0];
  const displayRun = activeRunId
    ? agent.runs.find((r) => r.id === activeRunId) ?? agent.runs[0]
    : agent.runs[0];

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/agents" className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="w-12 h-12 bg-[#003d7a]/10 rounded-xl flex items-center justify-center">
          <Bot className="w-6 h-6 text-[#003d7a]" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{agent.name}</h1>
          {agent.description && <p className="text-gray-500 text-sm mt-0.5">{agent.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {agent.isActive ? (
            <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">Activo</span>
          ) : (
            <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-medium">Inactivo</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Agent info + trigger */}
        <div className="space-y-4">
          {/* Info card */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">Configuración</h2>
            <InfoRow label="Modelo" value={<span className="font-mono text-xs">{agent.model}</span>} />
            <InfoRow label="Trigger" value={agent.trigger} />
            <InfoRow label="Runs totales" value={String(agent.runs.length)} />
            {agent.agentTools.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1.5">Herramientas</p>
                <div className="flex flex-wrap gap-1.5">
                  {agent.agentTools.map((at) => (
                    <span key={at.tool.name} className="text-xs bg-blue-50 text-[#0085D5] px-2 py-0.5 rounded font-medium">
                      {at.tool.displayName}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* System prompt preview */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">System Prompt</h2>
            <p className="text-xs text-gray-600 font-mono whitespace-pre-wrap line-clamp-6">{agent.systemPrompt}</p>
          </div>

          {/* Trigger */}
          {agent.isActive && agent.trigger === "MANUAL" && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Ejecutar manualmente</h2>
              {showInputBox ? (
                <div className="space-y-3">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Input para el agente (opcional)..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0085D5] resize-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setShowInputBox(false)} className="flex-1 px-3 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
                      Cancelar
                    </button>
                    <button
                      onClick={() => runMutation.mutate({ id, input: inputText || undefined })}
                      disabled={runMutation.isPending}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#0085D5] text-white rounded-lg text-sm font-medium hover:bg-[#0072b8] disabled:opacity-50"
                    >
                      {runMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      Ejecutar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowInputBox(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0085D5] text-white rounded-lg text-sm font-medium hover:bg-[#0072b8] transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Ejecutar ahora
                </button>
              )}
            </div>
          )}

          {agent.trigger === "WEBHOOK" && agent.webhookToken && (
            <WebhookPanel token={agent.webhookToken} />
          )}

          {agent.trigger === "SCHEDULE" && agent.cronExpr && (
            <SchedulePanel cronExpr={agent.cronExpr} />
          )}
        </div>

        {/* Right: Runs */}
        <div className="lg:col-span-2 space-y-4">
          {/* Active/selected run logs */}
          {displayRun && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#0085D5]" />
                  {activeRunId === displayRun.id ? "Run activo" : "Último run"}
                </h2>
                <span className="text-xs text-gray-400">
                  {new Date(displayRun.createdAt).toLocaleString("es-MX", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <AgentRunLogs
                runId={displayRun.id}
                initialStatus={displayRun.status}
                onComplete={() => { refetch(); setActiveRunId(null); }}
              />
            </div>
          )}

          {/* Run history */}
          {agent.runs.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Historial de runs</h2>
              <div className="space-y-2">
                {agent.runs.map((run) => (
                  <button
                    key={run.id}
                    onClick={() => setActiveRunId(run.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      (activeRunId ?? displayRun?.id) === run.id
                        ? "bg-blue-50 border border-[#0085D5]/20"
                        : "hover:bg-gray-50 border border-transparent"
                    }`}
                  >
                    <RunStatusIcon status={run.status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-600 truncate">{run.input ?? "(sin input)"}</p>
                      {run.output && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">{run.output.slice(0, 80)}...</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {run.startedAt && run.endedAt
                        ? `${Math.round((new Date(run.endedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)}s`
                        : "—"
                      }
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {agent.runs.length === 0 && !runMutation.isPending && (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
              <Clock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Sin runs aún — ejecuta el agente para empezar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-medium text-gray-800">{value}</span>
    </div>
  );
}

function WebhookPanel({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${baseUrl}/api/webhooks/${token}`;

  const copy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <h2 className="text-sm font-semibold text-gray-700">🔗 Webhook URL</h2>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded-lg break-all border border-gray-200">
          {url}
        </code>
        <button onClick={copy}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors flex-shrink-0"
          title="Copiar URL">
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-500" />}
        </button>
      </div>
      <div className="bg-gray-900 rounded-lg p-3">
        <p className="text-xs text-gray-500 mb-1 font-mono">Ejemplo curl:</p>
        <code className="text-xs text-green-400 font-mono break-all">
          {`curl -X POST ${url} \\\n  -H "Content-Type: application/json" \\\n  -d '{"input": "analiza ventas del mes"}'`}
        </code>
      </div>
    </div>
  );
}

function SchedulePanel({ cronExpr }: { cronExpr: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
      <h2 className="text-sm font-semibold text-gray-700">⏰ Schedule</h2>
      <div className="flex items-center gap-2">
        <code className="text-xs font-mono bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1.5 rounded-lg">
          {cronExpr}
        </code>
        <span className="text-xs text-gray-500">{describeCron(cronExpr)}</span>
      </div>
      <p className="text-xs text-gray-400">El agente se ejecuta automáticamente según este schedule.</p>
    </div>
  );
}

function RunStatusIcon({ status }: { status: string }) {
  const map: Record<string, React.ReactNode> = {
    COMPLETED: <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />,
    FAILED: <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />,
    RUNNING: <Loader2 className="w-4 h-4 text-[#0085D5] animate-spin flex-shrink-0" />,
    PENDING: <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />,
    CANCELLED: <Ban className="w-4 h-4 text-gray-300 flex-shrink-0" />,
  };
  return <>{map[status] ?? map.PENDING}</>;
}
