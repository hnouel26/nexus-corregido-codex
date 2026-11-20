"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { AgentCard } from "@/components/agent-card";
import { CreateAgentModal } from "@/components/create-agent-modal";
import VoiceAssistant from "@/components/voice-assistant";
import { Bot, Plus } from "lucide-react";

export default function AgentsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [lastResponse, setLastResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { data: agents = [], isLoading, refetch } = trpc.agents.list.useQuery();

  const active = agents.filter((a) => a.isActive);
  const inactive = agents.filter((a) => !a.isActive);

  const handleVoiceCommand = async (command: string) => {
    setIsProcessing(true);
    // Aquí se integraría con el sistema de agentes para ejecutar el comando
    // Por ahora simulamos una respuesta
    setTimeout(() => {
      setLastResponse(`Comando recibido: "${command}". Ejecutando análisis de compliance...`);
      setIsProcessing(false);
    }, 2000);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bot className="w-7 h-7 text-[#003d7a]" />
            Agentes
          </h1>
          <p className="text-gray-500 mt-1">
            Procesos autónomos del OS — ejecutan tareas con Claude y tus herramientas
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 bg-[#003d7a] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#002d5a] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo agente
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse h-48" />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-2xl">
          <Bot className="w-14 h-14 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-1">Sin agentes</h3>
          <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
            Los agentes son procesos autónomos que pueden consultar Snowflake, analizar datos, y ejecutar tareas usando Claude.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 bg-[#003d7a] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#002d5a] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Crear primer agente
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {active.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Activos ({active.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {active.map((a) => (
                  <AgentCard key={a.id} agent={a} onRefetch={refetch} />
                ))}
              </div>
            </section>
          )}
          {inactive.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Inactivos ({inactive.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {inactive.map((a) => (
                  <AgentCard key={a.id} agent={a} onRefetch={refetch} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {showCreate && (
        <CreateAgentModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); refetch(); }}
        />
      )}

      {/* Voice Assistant */}
      <div className="mt-8">
        <VoiceAssistant
          onCommand={handleVoiceCommand}
          lastResponse={lastResponse}
          isProcessing={isProcessing}
        />
      </div>
    </div>
  );
}
