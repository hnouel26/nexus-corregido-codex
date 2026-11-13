"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { X, Zap, CheckCircle2, XCircle, Loader2, Play } from "lucide-react";

interface Action {
  name: string;
  label: string;
  description: string;
}

interface PluginTestModalProps {
  pluginName: string;
  displayName: string;
  icon: string;
  actions: Action[];
  onClose: () => void;
}

export function PluginTestModal({ pluginName, displayName, icon, actions, onClose }: PluginTestModalProps) {
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; detail?: string } | null>(null);
  const [selectedAction, setSelectedAction] = useState(actions[0]?.name ?? "");
  const [actionInput, setActionInput] = useState("");
  const [executeResult, setExecuteResult] = useState<unknown>(null);
  const [executeError, setExecuteError] = useState<string | null>(null);

  const testMutation = trpc.tools.test.useMutation({
    onSuccess: (r) => setTestResult(r),
    onError: (err) => setTestResult({ ok: false, message: err.message }),
  });

  const executeMutation = trpc.tools.execute.useMutation({
    onSuccess: (r) => { setExecuteResult(r.result); setExecuteError(null); },
    onError: (err) => { setExecuteError(err.message); setExecuteResult(null); },
  });

  const handleExecute = () => {
    let params: Record<string, unknown> = {};
    try {
      params = actionInput.trim() ? JSON.parse(actionInput) : {};
    } catch {
      setExecuteError("JSON inválido en los parámetros");
      return;
    }
    setExecuteResult(null);
    setExecuteError(null);
    executeMutation.mutate({ pluginName, action: selectedAction, params });
  };

  // Smart default params per action
  const getDefaultParams = (action: string) => {
    const defaults: Record<string, string> = {
      complete: JSON.stringify({ prompt: "¿Cuál es 2 + 2? Responde brevemente.", maxTokens: 50 }, null, 2),
      query: JSON.stringify({ sql: "SELECT CURRENT_TIMESTAMP() AS ts, CURRENT_USER() AS user" }, null, 2),
      queryRaw: JSON.stringify({ sql: "SELECT 1 AS test" }, null, 2),
    };
    return defaults[action] ?? "{}";
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{icon}</span>
            <h2 className="text-lg font-semibold text-gray-900">{displayName}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Connection test */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Test de conexión</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => testMutation.mutate({ pluginName })}
                disabled={testMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0085D5] text-white rounded-lg text-sm font-medium hover:bg-[#0072b8] transition-colors disabled:opacity-50"
              >
                {testMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                Probar conexión
              </button>

              {testResult && (
                <div className={`flex items-center gap-2 text-sm font-medium ${testResult.ok ? "text-green-600" : "text-red-600"}`}>
                  {testResult.ok ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  {testResult.message}
                </div>
              )}
            </div>
            {testResult?.detail && (
              <p className="text-xs text-gray-400 mt-2 font-mono">{testResult.detail}</p>
            )}
          </div>

          {/* Execute action */}
          {actions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Ejecutar acción</h3>

              {/* Action selector */}
              <div className="flex gap-2 mb-3 flex-wrap">
                {actions.map((a) => (
                  <button
                    key={a.name}
                    onClick={() => {
                      setSelectedAction(a.name);
                      setActionInput(getDefaultParams(a.name));
                      setExecuteResult(null);
                      setExecuteError(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedAction === a.name
                        ? "bg-[#0085D5] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>

              {/* Params input */}
              <div className="mb-3">
                <label className="block text-xs text-gray-500 mb-1.5">
                  Parámetros (JSON)
                </label>
                <textarea
                  value={actionInput || getDefaultParams(selectedAction)}
                  onChange={(e) => setActionInput(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#0085D5] focus:border-transparent resize-none"
                />
              </div>

              <button
                onClick={handleExecute}
                disabled={executeMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {executeMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Ejecutar
              </button>

              {/* Result */}
              {(executeResult !== null || executeError) && (
                <div className={`mt-4 rounded-xl p-4 text-xs font-mono overflow-auto max-h-64 ${
                  executeError ? "bg-red-50 border border-red-200 text-red-700" : "bg-gray-900 text-green-400"
                }`}>
                  {executeError
                    ? executeError
                    : JSON.stringify(executeResult, null, 2)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
