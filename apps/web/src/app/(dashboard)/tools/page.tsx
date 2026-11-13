"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PluginCard } from "@/components/plugin-card";
import { Wrench } from "lucide-react";

export default function ToolsPage() {
  const { data: plugins = [], isLoading, refetch } = trpc.tools.listPlugins.useQuery();

  const connected = plugins.filter((p) => p.isConnected);
  const available = plugins.filter((p) => !p.isConnected);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Wrench className="w-7 h-7 text-[#0085D5]" />
          Herramientas
        </h1>
        <p className="text-gray-500 mt-1">
          Servicios del OS — conecta APIs y fuentes de datos para que los agentes los usen
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse h-48" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {connected.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Conectados ({connected.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {connected.map((plugin) => (
                  <PluginCard key={plugin.name} plugin={plugin} onRefetch={refetch} />
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Disponibles ({available.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {available.map((plugin) => (
                <PluginCard key={plugin.name} plugin={plugin} onRefetch={refetch} />
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
