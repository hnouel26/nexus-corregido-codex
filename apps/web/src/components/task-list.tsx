"use client";

import { trpc } from "@/lib/trpc/client";
import { Plus, Circle, Clock, CheckCircle2, XCircle } from "lucide-react";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
};

interface TaskListProps {
  title: string;
  count: number;
  tasks: Task[];
  color: string;
  onRefetch: () => void;
  projectId: string;
  onAddTask?: () => void;
}

const priorityConfig = {
  LOW: { label: "Baja", color: "text-gray-400 bg-gray-100" },
  MEDIUM: { label: "Media", color: "text-blue-600 bg-blue-100" },
  HIGH: { label: "Alta", color: "text-orange-600 bg-orange-100" },
  URGENT: { label: "Urgente", color: "text-red-600 bg-red-100" },
};

const statusIcon = {
  TODO: <Circle className="w-4 h-4 text-gray-400" />,
  IN_PROGRESS: <Clock className="w-4 h-4 text-[#0085D5]" />,
  DONE: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  CANCELLED: <XCircle className="w-4 h-4 text-gray-300" />,
};

const nextStatus: Record<string, "TODO" | "IN_PROGRESS" | "DONE" | "CANCELLED"> = {
  TODO: "IN_PROGRESS",
  IN_PROGRESS: "DONE",
  DONE: "TODO",
};

export function TaskList({ title, count, tasks, color, onRefetch, onAddTask }: TaskListProps) {
  const updateStatus = trpc.tasks.updateStatus.useMutation({ onSuccess: onRefetch });
  const deleteTask = trpc.tasks.delete.useMutation({ onSuccess: onRefetch });

  return (
    <div className="bg-gray-50 rounded-xl p-4">
      {/* Column header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <h3 className="font-semibold text-gray-700 text-sm">{title}</h3>
          <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">
            {count}
          </span>
        </div>
        {onAddTask && (
          <button
            onClick={onAddTask}
            className="p-1 rounded hover:bg-gray-200 transition-colors text-gray-500"
            title="Nueva tarea"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tasks */}
      <div className="space-y-2">
        {tasks.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-4">Sin tareas</p>
        )}
        {tasks.map((task) => {
          const priority = priorityConfig[task.priority as keyof typeof priorityConfig];
          return (
            <div
              key={task.id}
              className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-sm transition-shadow group"
            >
              <div className="flex items-start gap-2">
                <button
                  onClick={() => {
                    const next = nextStatus[task.status];
                    if (next) updateStatus.mutate({ id: task.id, status: next });
                  }}
                  className="mt-0.5 flex-shrink-0"
                >
                  {statusIcon[task.status as keyof typeof statusIcon]}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium text-gray-800 ${task.status === "DONE" ? "line-through text-gray-400" : ""}`}>
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{task.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    {priority && (
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${priority.color}`}>
                        {priority.label}
                      </span>
                    )}
                    {task.dueDate && (
                      <span className="text-xs text-gray-400">
                        {new Date(task.dueDate).toLocaleDateString("es-MX", { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (confirm(`¿Eliminar "${task.title}"?`)) {
                      deleteTask.mutate({ id: task.id });
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all flex-shrink-0"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
