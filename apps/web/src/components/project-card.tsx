"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { MoreVertical, Archive, Trash2, CheckCircle, FolderOpen } from "lucide-react";

type Project = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  color: string;
  _count: { tasks: number };
  createdAt: Date;
};

interface ProjectCardProps {
  project: Project;
  onRefetch: () => void;
}

export function ProjectCard({ project, onRefetch }: ProjectCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const updateStatus = trpc.projects.updateStatus.useMutation({ onSuccess: onRefetch });
  const deleteProject = trpc.projects.delete.useMutation({ onSuccess: onRefetch });

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:shadow-md hover:border-[#0085D5] transition-all">
      <Link href={`/projects/${project.id}`} className="block p-5">
        <div className="flex items-start gap-3">
          <div
            className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
            style={{ backgroundColor: project.color }}
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{project.name}</h3>
            {project.description && (
              <p className="text-sm text-gray-500 line-clamp-2 mt-1">{project.description}</p>
            )}
            <div className="flex items-center gap-3 mt-3">
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <FolderOpen className="w-3 h-3" />
                {project._count.tasks} tareas
              </div>
              <StatusDot status={project.status} />
            </div>
          </div>
        </div>
      </Link>

      <div className="border-t border-gray-100 px-5 py-2 flex justify-end">
        <div className="relative">
          <button
            onClick={(e) => { e.preventDefault(); setShowMenu(!showMenu); }}
            className="p-1.5 rounded hover:bg-gray-100 transition-colors text-gray-400"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 bottom-8 bg-white rounded-xl shadow-lg border border-gray-200 z-20 py-1 min-w-44">
                {project.status !== "COMPLETED" && (
                  <button
                    onClick={() => { updateStatus.mutate({ id: project.id, status: "COMPLETED" }); setShowMenu(false); }}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Completar
                  </button>
                )}
                {project.status !== "ARCHIVED" && (
                  <button
                    onClick={() => { updateStatus.mutate({ id: project.id, status: "ARCHIVED" }); setShowMenu(false); }}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Archive className="w-4 h-4 text-orange-500" />
                    Archivar
                  </button>
                )}
                <hr className="my-1" />
                <button
                  onClick={() => {
                    if (confirm(`¿Eliminar "${project.name}"?`)) {
                      deleteProject.mutate({ id: project.id });
                    }
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
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
  );
}

function StatusDot({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    ACTIVE: { color: "bg-green-500", label: "Activo" },
    ARCHIVED: { color: "bg-gray-400", label: "Archivado" },
    COMPLETED: { color: "bg-blue-500", label: "Completado" },
  };
  const c = config[status] ?? { color: "bg-gray-400", label: status };
  return (
    <div className="flex items-center gap-1">
      <div className={`w-1.5 h-1.5 rounded-full ${c.color}`} />
      <span className="text-xs text-gray-400">{c.label}</span>
    </div>
  );
}
