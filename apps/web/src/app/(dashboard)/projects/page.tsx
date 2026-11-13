"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { ProjectCard } from "@/components/project-card";
import { CreateProjectModal } from "@/components/create-project-modal";
import { Plus, FolderOpen, Search } from "lucide-react";

export default function ProjectsPage() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const { data: projects, isLoading, refetch } = trpc.projects.list.useQuery();

  const filtered = projects?.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proyectos</h1>
          <p className="text-gray-500 mt-1">
            {projects?.length ?? 0} proyecto{projects?.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 bg-[#0085D5] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#0072b8] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo proyecto
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar proyectos..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0085D5] focus:border-transparent max-w-md"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-full mb-2" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered?.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-gray-600 font-medium mb-1">
            {search ? "Sin resultados" : "No hay proyectos"}
          </h3>
          <p className="text-gray-400 text-sm mb-6">
            {search ? "Prueba con otro término" : "Crea tu primer proyecto para empezar"}
          </p>
          {!search && (
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 bg-[#0085D5] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#0072b8] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Crear proyecto
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered?.map((project) => (
            <ProjectCard key={project.id} project={project} onRefetch={refetch} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); refetch(); }}
        />
      )}
    </div>
  );
}
