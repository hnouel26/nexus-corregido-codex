"use client";

import { useForm } from "react-hook-form";
import { trpc } from "@/lib/trpc/client";
import { X, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface Field {
  key: string;
  label: string;
  type: string;
  placeholder?: string;
  required: boolean;
  hint?: string;
}

interface PluginConfigModalProps {
  plugin: {
    name: string;
    displayName: string;
    icon: string;
    configFields: Field[];
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function PluginConfigModal({ plugin, onClose, onSuccess }: PluginConfigModalProps) {
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const { register, handleSubmit, formState: { errors } } = useForm<Record<string, string>>();

  const connect = trpc.tools.connect.useMutation({
    onSuccess,
    onError: (err) => alert(`Error: ${err.message}`),
  });

  const onSubmit = (data: Record<string, string>) => {
    // Filter out empty optional fields
    const config = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v && v.trim() !== "")
    );
    connect.mutate({ pluginName: plugin.name, config });
  };

  const togglePassword = (key: string) =>
    setShowPasswords((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 sticky top-0 bg-white">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{plugin.icon}</span>
            <h2 className="text-lg font-semibold text-gray-900">
              Configurar {plugin.displayName}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {plugin.configFields.map((field) => {
            const isPassword = field.type === "password";
            const showValue = showPasswords[field.key];

            return (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label}
                  {!field.required && (
                    <span className="text-gray-400 font-normal ml-1">(opcional)</span>
                  )}
                </label>

                <div className="relative">
                  {field.type === "textarea" ? (
                    <textarea
                      {...register(field.key, { required: field.required ? `${field.label} requerido` : false })}
                      placeholder={field.placeholder}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0085D5] focus:border-transparent resize-none"
                    />
                  ) : (
                    <input
                      {...register(field.key, { required: field.required ? `${field.label} requerido` : false })}
                      type={isPassword && !showValue ? "password" : "text"}
                      placeholder={field.placeholder}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0085D5] focus:border-transparent pr-10"
                    />
                  )}
                  {isPassword && (
                    <button
                      type="button"
                      onClick={() => togglePassword(field.key)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>

                {field.hint && <p className="text-xs text-gray-400 mt-1">{field.hint}</p>}
                {errors[field.key] && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors[field.key]?.message as string}
                  </p>
                )}
              </div>
            );
          })}

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
            🔒 Las credenciales se encriptan con AES-256-GCM antes de guardarse en la base de datos.
          </div>

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
              disabled={connect.isPending}
              className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {connect.isPending ? "Guardando..." : "Guardar y conectar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
