"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, CheckCircle2, XCircle, AlertCircle, Wrench, Terminal, Ban } from "lucide-react";

interface LogEntry {
  ts: string;
  level: "info" | "tool_call" | "tool_result" | "tool_error" | "error" | "done";
  message: string;
  data?: unknown;
}

interface RunState {
  status: string;
  logs: LogEntry[];
  output: string | null;
}

const LEVEL_STYLES: Record<string, string> = {
  info: "text-gray-300",
  tool_call: "text-[#91D1ED]",
  tool_result: "text-green-400",
  tool_error: "text-red-400",
  error: "text-red-400",
  done: "text-green-300 font-semibold",
};

const LEVEL_ICONS: Record<string, React.ReactNode> = {
  info: <Terminal className="w-3.5 h-3.5 opacity-60 flex-shrink-0" />,
  tool_call: <Wrench className="w-3.5 h-3.5 flex-shrink-0 text-[#91D1ED]" />,
  tool_result: <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-green-400" />,
  tool_error: <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-red-400" />,
  error: <XCircle className="w-3.5 h-3.5 flex-shrink-0 text-red-400" />,
  done: <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-green-300" />,
};

interface AgentRunLogsProps {
  runId: string;
  initialStatus: string;
  onComplete?: (status: string) => void;
}

export function AgentRunLogs({ runId, initialStatus, onComplete }: AgentRunLogsProps) {
  const [state, setState] = useState<RunState>({
    status: initialStatus,
    logs: [],
    output: null,
  });
  const [connected, setConnected] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const logsEndRef = useRef<HTMLDivElement>(null);
  const isTerminal = ["COMPLETED", "FAILED", "CANCELLED"].includes(state.status);

  useEffect(() => {
    setState({ status: initialStatus, logs: [], output: null });
    setConnected(false);
    const es = new EventSource(`/api/agent-runs/${runId}/stream`);

    es.onopen = () => { setConnected(true); setState((previous) => ({ ...previous, logs: [] })); };

    es.onmessage = (e) => {
      const msg = JSON.parse(e.data) as {
        type: string;
        level?: string;
        ts?: string;
        message?: string;
        data?: unknown;
        status?: string;
        output?: string;
      };

      if (msg.type === "log") {
        setState((prev) => ({
          ...prev,
          logs: [
            ...prev.logs,
            { ts: msg.ts!, level: msg.level as LogEntry["level"], message: msg.message!, data: msg.data },
          ],
        }));
      } else if (msg.type === "status") {
        setState((prev) => ({ ...prev, status: msg.status! }));
      } else if (msg.type === "done") {
        setState((prev) => ({ ...prev, status: msg.status!, output: msg.output ?? null }));
        onCompleteRef.current?.(msg.status!);
        es.close();
      } else if (msg.type === "error") {
        setState((prev) => ({
          ...prev,
          status: "FAILED",
          logs: [...prev.logs, { ts: new Date().toISOString(), level: "error", message: msg.message! }],
        }));
        es.close();
      }
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
    };

    return () => es.close();
  }, [runId, initialStatus]);

  // Auto-scroll
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.logs]);

  return (
    <div className="space-y-3">
      {/* Status bar */}
      <div className="flex items-center gap-3">
        <StatusBadge status={state.status} />
        {!isTerminal && connected && (
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            En ejecución
          </span>
        )}
      </div>

      {/* Terminal */}
      <div className="bg-gray-950 rounded-xl border border-gray-800 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-800 bg-gray-900">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <div className="w-3 h-3 rounded-full bg-green-500/60" />
          </div>
          <span className="text-gray-500 text-xs ml-2 font-mono">agent-run · {runId.slice(-8)}</span>
          {!isTerminal && (
            <Loader2 className="w-3.5 h-3.5 text-gray-500 animate-spin ml-auto" />
          )}
        </div>

        <div className="p-4 font-mono text-xs space-y-1 max-h-72 overflow-y-auto">
          {state.logs.length === 0 && !isTerminal && (
            <span className="text-gray-600">Esperando logs...</span>
          )}
          {state.logs.map((log, i) => (
            <div key={i} className={`flex gap-2 leading-relaxed ${LEVEL_STYLES[log.level] ?? "text-gray-400"}`}>
              <span className="text-gray-600 flex-shrink-0 pt-0.5">
                {new Date(log.ts).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
              <span className="pt-0.5">{LEVEL_ICONS[log.level]}</span>
              <span className="break-all">{log.message}</span>
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </div>

      {/* Output */}
      {state.output && state.status === "COMPLETED" && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Resultado</p>
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
            {state.output}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; class: string; icon: React.ReactNode }> = {
    PENDING: { label: "Pendiente", class: "bg-gray-100 text-gray-600", icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    RUNNING: { label: "Ejecutando", class: "bg-blue-100 text-blue-700", icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    COMPLETED: { label: "Completado", class: "bg-green-100 text-green-700", icon: <CheckCircle2 className="w-3 h-3" /> },
    FAILED: { label: "Error", class: "bg-red-100 text-red-700", icon: <XCircle className="w-3 h-3" /> },
    CANCELLED: { label: "Cancelado", class: "bg-gray-100 text-gray-500", icon: <Ban className="w-3 h-3" /> },
  };
  const s = map[status] ?? map.PENDING;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${s.class}`}>
      {s.icon} {s.label}
    </span>
  );
}
