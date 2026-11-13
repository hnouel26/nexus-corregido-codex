"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc/client";
import { X } from "lucide-react";

const schema = z.object({
  title: z.string().min(1, "Título requerido").max(200),
  description: z.string().max(2000).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"]).default("TODO"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  dueDate: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface CreateTaskModalProps {
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateTaskModal({ projectId, onClose, onSuccess }: CreateTaskModalProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: "TODO", priority: "MEDIUM" },
  });

  const createTask = trpc.tasks.create.useMutation({
    onSuccess,
    onError: (err) => alert(`Error: ${err.message}`),
  });

  const onSubmit = (data: FormValues) => {
    createTask.mutate({
      ...data,
      projectId,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Nueva tarea</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input
              {...register("title")}
              placeholder="Nombre de la tarea"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0085D5] focus:border-transparent"
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              {...register("description")}
              placeholder="Detalles opcionales..."
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0085D5] focus:border-transparent resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                {...register("status")}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0085D5] focus:border-transparent"
              >
                <option value="TODO">Por hacer</option>
                <option value="IN_PROGRESS">En progreso</option>
                <option value="DONE">Completada</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
              <select
                {...register("priority")}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0085D5] focus:border-transparent"
              >
                <option value="LOW">Baja</option>
                <option value="MEDIUM">Media</option>
                <option value="HIGH">Alta</option>
                <option value="URGENT">Urgente</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha límite</label>
            <input
              {...register("dueDate")}
              type="date"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0085D5] focus:border-transparent"
            />
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
              disabled={createTask.isPending}
              className="flex-1 px-4 py-2.5 bg-[#0085D5] text-white rounded-lg text-sm font-medium hover:bg-[#0072b8] transition-colors disabled:opacity-50"
            >
              {createTask.isPending ? "Creando..." : "Crear tarea"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
