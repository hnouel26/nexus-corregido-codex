"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc/client";
import { CRON_PRESETS, describeCron, isValidCron } from "@/lib/cron";
import { X } from "lucide-react";
import { useState } from "react";
import VoiceInput from "./voice-input";

const MODELS = [
  { value: "gpt-4o",       label: "GPT-4o (Recomendado)"  },
  { value: "gpt-4o-mini",  label: "GPT-4o Mini (Rápido)"  },
  { value: "gpt-4-turbo",  label: "GPT-4 Turbo (Potente)" },
];

const schema = z.object({
  name:         z.string().min(1, "Nombre requerido").max(100),
  description:  z.string().max(500).optional(),
  systemPrompt: z.string().min(1, "System prompt requerido"),
  model:        z.string().default("gpt-4o"),
  trigger:      z.enum(["MANUAL", "SCHEDULE", "WEBHOOK"]).default("MANUAL"),
  cronExpr:     z.string().optional(),
  toolIds:      z.array(z.string()).default([]),
});

type FormValues = z.infer<typeof schema>;

interface Props { onClose: () => void; onSuccess: () => void; }

export function CreateAgentModal({ onClose, onSuccess }: Props) {
  const [cronPreset, setCronPreset] = useState("0 8 * * *");
  const [customCron, setCustomCron] = useState("");
  const [useCustomCron, setUseCustomCron] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: { model: "gpt-4o", trigger: "MANUAL", toolIds: [] },
    });

  const trigger = watch("trigger");

  const { data: plugins = [] } = trpc.tools.listPlugins.useQuery();
  const connectedTools = plugins.filter((p) => p.isConnected && p.name !== "openai");

  const createAgent = trpc.agents.create.useMutation({
    onSuccess,
    onError: (err) => alert(`Error: ${err.message}`),
  });

  const onSubmit = (data: FormValues) => {
    const cronExpr = data.trigger === "SCHEDULE"
      ? (useCustomCron ? customCron : cronPreset)
      : undefined;

    if (data.trigger === "SCHEDULE" && cronExpr && !isValidCron(cronExpr)) {
      alert("Expresión cron inválida");
      return;
    }

    createAgent.mutate({ ...data, cronExpr });
  };

  const toggleTool = (toolName: string) => {
    const current = watch("toolIds") ?? [];
    setValue(
      "toolIds",
      current.includes(toolName)
        ? current.filter((id) => id !== toolName)
        : [...current, toolName]
    );
  };

  const activeCron = useCustomCron ? customCron : cronPreset;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Nuevo agente</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <input {...register("name")} placeholder="Análisis de OTD semanal"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0085D5] focus:border-transparent" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <input {...register("description")} placeholder="Consulta Snowflake y genera reporte de OTD"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0085D5] focus:border-transparent" />
          </div>

          {/* System Prompt */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">System Prompt *</label>
              <VoiceInput
                onTranscript={(text) => {
                  const current = watch("systemPrompt") || "";
                  setValue("systemPrompt", current + (current ? " " : "") + text);
                }}
                isListening={isListening}
                onListeningChange={setIsListening}
                language="es-ES"
              />
            </div>
            <textarea {...register("systemPrompt")}
              placeholder={"Eres un analista de datos de NFI con acceso a Snowflake.\nCuando se te pida un análisis, consulta los datos necesarios y presenta un resumen claro en español con números concretos."}
              rows={5}
              disabled={isListening}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0085D5] resize-none font-mono disabled:bg-gray-100" />
            {errors.systemPrompt && <p className="text-red-500 text-xs mt-1">{errors.systemPrompt.message}</p>}
          </div>

          {/* Model + Trigger */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
              <select {...register("model")}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0085D5]">
                {MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trigger</label>
              <select {...register("trigger")}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0085D5]">
                <option value="MANUAL">▶ Manual</option>
                <option value="SCHEDULE">⏰ Schedule (cron)</option>
                <option value="WEBHOOK">🔗 Webhook</option>
              </select>
            </div>
          </div>

          {/* Cron config */}
          {trigger === "SCHEDULE" && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-amber-800">⏰ Configuración de schedule</p>

              {/* Presets */}
              <div>
                <label className="block text-xs text-amber-700 mb-2">Frecuencia</label>
                <div className="flex flex-wrap gap-2">
                  {CRON_PRESETS.filter((p) => p.value !== "").map((p) => (
                    <button key={p.value} type="button"
                      onClick={() => { setCronPreset(p.value); setUseCustomCron(false); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        !useCustomCron && cronPreset === p.value
                          ? "bg-amber-600 text-white"
                          : "bg-white text-amber-700 border border-amber-300 hover:bg-amber-100"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                  <button type="button"
                    onClick={() => setUseCustomCron(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      useCustomCron
                        ? "bg-amber-600 text-white"
                        : "bg-white text-amber-700 border border-amber-300 hover:bg-amber-100"
                    }`}
                  >
                    Personalizado
                  </button>
                </div>
              </div>

              {/* Custom cron input */}
              {useCustomCron && (
                <div>
                  <label className="block text-xs text-amber-700 mb-1">Expresión cron (5 campos)</label>
                  <input
                    value={customCron}
                    onChange={(e) => setCustomCron(e.target.value)}
                    placeholder="0 8 * * 1-5"
                    className={`w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 ${
                      customCron && !isValidCron(customCron)
                        ? "border-red-300 focus:ring-red-300 bg-red-50"
                        : "border-amber-300 focus:ring-amber-400"
                    }`}
                  />
                  {customCron && !isValidCron(customCron) && (
                    <p className="text-red-600 text-xs mt-1">Expresión inválida — formato: min hora dia mes diasemana</p>
                  )}
                </div>
              )}

              {/* Preview */}
              {activeCron && isValidCron(activeCron) && (
                <p className="text-xs text-amber-700">
                  <span className="font-mono bg-amber-100 px-1.5 py-0.5 rounded">{activeCron}</span>
                  {" → "}{describeCron(activeCron)}
                </p>
              )}
            </div>
          )}

          {/* Webhook info */}
          {trigger === "WEBHOOK" && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-blue-800 mb-1">🔗 Webhook</p>
              <p className="text-xs text-blue-700">
                Tras crear el agente, obtendrás una URL única. Envía un <code className="bg-blue-100 px-1 rounded">POST</code> a esa URL para dispararla desde Make, n8n, o cualquier sistema externo. El body JSON se pasa como input al agente.
              </p>
            </div>
          )}

          {/* Tools */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Herramientas del agente</label>
            <p className="text-xs text-gray-500 mb-2">Los horarios se ejecutan en la zona configurada en SCHEDULE_TIMEZONE (UTC por defecto).</p>
            {connectedTools.length === 0 ? (
              <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
                No hay herramientas conectadas. Ve a <strong>/tools</strong> para conectar Snowflake u otras integraciones.
              </p>
            ) : (
              <div className="space-y-2">
                {connectedTools.map((plugin) => {
                  const selected = (watch("toolIds") ?? []).includes(plugin.name);
                  return (
                    <label key={plugin.name}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selected ? "border-[#0085D5] bg-blue-50" : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <input type="checkbox" checked={selected}
                        onChange={() => toggleTool(plugin.name)}
                        className="w-4 h-4 rounded border-gray-300 text-[#0085D5] focus:ring-[#0085D5]" />
                      <span className="text-xl">{plugin.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{plugin.displayName}</p>
                        <p className="text-xs text-gray-500">{plugin.description}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={createAgent.isPending}
              className="flex-1 px-4 py-2.5 bg-[#003d7a] text-white rounded-lg text-sm font-medium hover:bg-[#002d5a] disabled:opacity-50">
              {createAgent.isPending ? "Creando..." : "Crear agente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
