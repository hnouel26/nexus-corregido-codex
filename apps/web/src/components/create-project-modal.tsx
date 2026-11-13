"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc/client";
import { X } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Nombre requerido").max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#0085D5"),
});

type FormValues = z.infer<typeof schema>;

const COLORS = [
  "#0085D5", "#FE5900", "#FEC341", "#91D1ED",
  "#22c55e", "#8b5cf6", "#ec4899", "#14b8a6",
];

interface CreateProjectModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateProjectModal({ onClose, onSuccess }: CreateProjectModalProps) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { color: "#0085D5" },
  });

  const selectedColor = watch("color");

  const createProject = trpc.projects.create.useMutation({
    onSuccess,
    onError: (err) => alert(`Error: ${err.message}`),
  });

  const onSubmit = (data: FormValues) => {
    createProject.mutate(data);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Nuevo proyecto</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre *
            </label>
            <input
              {...register("name")}
              placeholder="Mi proyecto"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0085D5] focus:border-transparent"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              {...register("description")}
              placeholder="Descripción opcional..."
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0085D5] focus:border-transparent resize-none"
            />
          </div>

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
              disabled={createProject.isPending}
              className="flex-1 px-4 py-2.5 bg-[#0085D5] text-white rounded-lg text-sm font-medium hover:bg-[#0072b8] transition-colors disabled:opacity-50"
            >
              {createProject.isPending ? "Creando..." : "Crear proyecto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
