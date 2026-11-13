"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { TaskList } from "@/components/task-list";
import { CreateTaskModal } from "@/components/create-task-modal";
import { ArrowLeft, Plus, MoreVertical, Archive, Trash2, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const { data: project, isLoading, refetch } = trpc.projects.get.useQuery({ id });
  const updateStatus = trpc.projects.updateStatus.useMutation({
    onSuccess: () => refetch(),
  });
  const deleteProject = trpc.projects.delete.useMutation({
    onSuccess: () => router.push("/projects"),
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-48" />
          <div className="h-4 bg-gray-100 rounded w-96" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Proyecto no encontrado</p>
        <Link href="/projects" className="text-[#0085D5] hover:underline mt-2 block">
          Volver a proyectos
        </Link>
      </div>
    );
  }

  const todoTasks = project.tasks.filter((t) => t.status === "TODO");
  const inProgressTasks = project.tasks.filter((t) => t.status === "IN_PROGRESS");
  const doneTasks = project.tasks.filter((t) => t.status === "DONE");

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/projects"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: project.color }}
              />
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <StatusBadge status={project.status} />
            </div>
            {project.description && (
              <p className="text-gray-500 mt-1 ml-7">{project.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateTask(true)}
            className="inline-flex items-center gap-2 bg-[#0085D5] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0072b8] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva tarea
          </button>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-10 bg-white rounded-xl shadow-lg border border-gray-200 z-20 py-1 min-w-48">
                  {project.status !== "COMPLETED" && (
                    <button
                      onClick={() => { updateStatus.mutate({ id, status: "COMPLETED" }); setShowMenu(false); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Marcar completado
                    </button>
                  )}
                  {project.status !== "ARCHIVED" && (
                    <button
                      onClick={() => { updateStatus.mutate({ id, status: "ARCHIVED" }); setShowMenu(false); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Archive className="w-4 h-4 text-orange-500" />
                      Archivar
                    </button>
                  )}
                  <hr className="my-1" />
                  <button
                    onClick={() => {
                      if (confirm("¿Eliminar este proyecto y todas sus tareas?")) {
                        deleteProject.mutate({ id });
                      }
                      setShowMenu(false);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Task Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TaskList
          title="Por hacer"
          count={todoTasks.length}
          tasks={todoTasks}
          color="#6b7280"
          onRefetch={refetch}
          projectId={id}
          onAddTask={() => setShowCreateTask(true)}
        />
        <TaskList
          title="En progreso"
          count={inProgressTasks.length}
          tasks={inProgressTasks}
          color="#0085D5"
          onRefetch={refetch}
          projectId={id}
        />
        <TaskList
          title="Completadas"
          count={doneTasks.length}
          tasks={doneTasks}
          color="#22c55e"
          onRefetch={refetch}
          projectId={id}
        />
      </div>

      {showCreateTask && (
        <CreateTaskModal
          projectId={id}
          onClose={() => setShowCreateTask(false)}
          onSuccess={() => { setShowCreateTask(false); refetch(); }}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700",
    ARCHIVED: "bg-gray-100 text-gray-600",
    COMPLETED: "bg-blue-100 text-blue-700",
  };
  const labels: Record<string, string> = {
    ACTIVE: "Activo",
    ARCHIVED: "Archivado",
    COMPLETED: "Completado",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] ?? ""}`}>
      {labels[status] ?? status}
    </span>
  );
}
