"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PluginConfigModal } from "./plugin-config-modal";
import { PluginTestModal } from "./plugin-test-modal";
import { CheckCircle2, Circle, Zap, Settings, Unplug } from "lucide-react";

interface PluginCardProps {
  plugin: {
    name: string;
    displayName: string;
    description: string;
    icon: string;
    category: string;
    isConnected: boolean;
    configFields: Array<{ key: string; label: string; type: string; required: boolean; hint?: string; placeholder?: string }>;
    actions: Array<{ name: string; label: string; description: string }>;
  };
  onRefetch: () => void;
}

export function PluginCard({ plugin, onRefetch }: PluginCardProps) {
  const [showConfig, setShowConfig] = useState(false);
  const [showTest, setShowTest] = useState(false);

  const disconnect = trpc.tools.disconnect.useMutation({
    onSuccess: onRefetch,
  });

  return (
    <div className={`bg-white rounded-xl border-2 transition-all ${
      plugin.isConnected
        ? "border-[#0085D5]/30 shadow-sm"
        : "border-gray-200 hover:border-gray-300"
    }`}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-2xl flex-shrink-0">
            {plugin.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">{plugin.displayName}</h3>
              {plugin.isConnected ? (
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{plugin.category}</p>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{plugin.description}</p>

        {/* Actions preview */}
        {plugin.isConnected && plugin.actions.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Acciones disponibles</p>
            <div className="flex flex-wrap gap-1.5">
              {plugin.actions.map((a) => (
                <span
                  key={a.name}
                  className="text-xs bg-blue-50 text-[#0085D5] px-2 py-1 rounded-md font-medium"
                >
                  {a.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-2">
          {plugin.isConnected ? (
            <>
              <button
                onClick={() => setShowTest(true)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#0085D5] text-white rounded-lg text-sm font-medium hover:bg-[#0072b8] transition-colors"
              >
                <Zap className="w-4 h-4" />
                Probar
              </button>
              <button
                onClick={() => setShowConfig(true)}
                className="px-3 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                title="Reconfigurar"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (confirm(`¿Desconectar ${plugin.displayName}?`)) {
                    disconnect.mutate({ pluginName: plugin.name });
                  }
                }}
                className="px-3 py-2 border border-red-200 text-red-500 rounded-lg text-sm hover:bg-red-50 transition-colors"
                title="Desconectar"
              >
                <Unplug className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowConfig(true)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              Conectar
            </button>
          )}
        </div>
      </div>

      {showConfig && (
        <PluginConfigModal
          plugin={plugin}
          onClose={() => setShowConfig(false)}
          onSuccess={() => { setShowConfig(false); onRefetch(); }}
        />
      )}

      {showTest && (
        <PluginTestModal
          pluginName={plugin.name}
          displayName={plugin.displayName}
          icon={plugin.icon}
          actions={plugin.actions}
          onClose={() => setShowTest(false)}
        />
      )}
    </div>
  );
}
