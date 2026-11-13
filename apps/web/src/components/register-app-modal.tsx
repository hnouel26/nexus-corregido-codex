"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc/client";
import { X } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Nombre requerido").max(100),
  description: z.string().max(500).optional(),
  url: z.string().url("URL inválida — incluye http:// o https://"),
  icon: z.string().max(10).default("🔧"),
  category: z.enum(["DASHBOARD", "TOOL", "DATABASE", "INTEGRATION", "INTERNAL", "EXTERNAL"]).default("TOOL"),
  healthUrl: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#0085D5"),
  isPinned: z.boolean().default(false),
});

type FormValues = z.infer<typeof schema>;

const CATEGORY_OPTIONS = [
  { value: "DASHBOARD", label: "Dashboard" },
  { value: "TOOL", label: "Herramienta" },
  { value: "DATABASE", label: "Base de datos" },
  { value: "INTEGRATION", label: "Integración" },
  { value: "INTERNAL", label: "App interna" },
  { value: "EXTERNAL", label: "App externa" },
];

const COLORS = ["#0085D5", "#FE5900", "#FEC341", "#91D1ED", "#22c55e", "#8b5cf6", "#ec4899", "#14b8a6"];

const SUGGESTED_ICONS = ["📊", "🔧", "🗄️", "🔗", "⚙️", "🚀", "📈", "🤖", "📋", "🌐", "🔍", "💡"];

interface RegisterAppModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function RegisterAppModal({ onClose, onSuccess }: RegisterAppModalProps) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { icon: "🔧", category: "TOOL", color: "#0085D5", isPinned: false },
  });

  const selectedColor = watch("color");
  const selectedIcon = watch("icon");

  const createApp = trpc.apps.create.useMutation({
    onSuccess,
    onError: (err) => alert(`Error: ${err.message}`),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">Registrar app</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit((d) => createApp.mutate(d))} className="p-6 space-y-5">
          {/* Icon picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Icono</label>
            <div className="flex gap-2 flex-wrap">
              {SUGGESTED_ICONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setValue("icon", emoji)}
                  className={`w-9 h-9 rounded-lg text-xl flex items-center justify-center transition-all ${
                    selectedIcon === emoji
                      ? "ring-2 ring-[#0085D5] ring-offset-1 bg-blue-50 scale-110"
                      : "hover:bg-gray-100 hover:scale-105"
                  }`}
                >
                  {emoji}
                </button>
              ))}
              <input
                {...register("icon")}
                placeholder="✏️"
                className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center"
              />
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <input
              {...register("name")}
              placeholder="KPI Dashboard"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0085D5] focus:border-transparent"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <input
              {...register("description")}
              placeholder="Breve descripción"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0085D5] focus:border-transparent"
            />
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL *</label>
            <input
              {...register("url")}
              placeholder="http://localhost:3001  o  https://mi-app.com"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0085D5] focus:border-transparent"
            />
            {errors.url && <p className="text-red-500 text-xs mt-1">{errors.url.message}</p>}
          </div>

          {/* Category + Health URL */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select
                {...register("category")}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0085D5] focus:border-transparent"
              >
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Health URL <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                {...register("healthUrl")}
                placeholder="http://localhost:3001/health"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0085D5] focus:border-transparent"
              />
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setValue("color", c)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    selectedColor === c ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Pin */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              {...register("isPinned")}
              className="w-4 h-4 rounded border-gray-300 text-[#0085D5] focus:ring-[#0085D5]"
            />
            <span className="text-sm text-gray-700">Fijar en la parte superior</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createApp.isPending}
              className="flex-1 px-4 py-2.5 bg-[#0085D5] text-white rounded-lg text-sm font-medium hover:bg-[#0072b8] transition-colors disabled:opacity-50"
            >
              {createApp.isPending ? "Registrando..." : "Registrar app"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
