"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { AppTile } from "@/components/app-tile";
import { RegisterAppModal } from "@/components/register-app-modal";
import { Plus, AppWindow, Search } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  DASHBOARD: "Dashboards",
  TOOL: "Herramientas",
  DATABASE: "Bases de datos",
  INTEGRATION: "Integraciones",
  INTERNAL: "Internas",
  EXTERNAL: "Externas",
};

export default function AppsPage() {
  const [search, setSearch] = useState("");
  const [showRegister, setShowRegister] = useState(false);

  const { data: apps = [], isLoading, refetch } = trpc.apps.list.useQuery();

  const filtered = apps.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.description?.toLowerCase().includes(search.toLowerCase())
  );

  const pinned = filtered.filter((a) => a.isPinned);
  const byCategory = filtered.reduce<Record<string, typeof filtered>>((acc, app) => {
    if (app.isPinned) return acc;
    const cat = app.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(app);
    return acc;
  }, {});

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Apps</h1>
          <p className="text-gray-500 mt-1">
            {apps.length} app{apps.length !== 1 ? "s" : ""} registrada{apps.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowRegister(true)}
          className="inline-flex items-center gap-2 bg-[#0085D5] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#0072b8] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Registrar app
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar apps..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0085D5] focus:border-transparent max-w-md"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse h-28" />
          ))}
        </div>
      ) : apps.length === 0 ? (
        <EmptyState onRegister={() => setShowRegister(true)} />
      ) : (
        <div className="space-y-8">
          {/* Pinned */}
          {pinned.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Fijadas
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {pinned.map((app) => (
                  <AppTile key={app.id} app={app} onRefetch={refetch} />
                ))}
              </div>
            </section>
          )}

          {/* By category */}
          {Object.entries(byCategory).map(([cat, catApps]) => (
            <section key={cat}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {CATEGORY_LABELS[cat] ?? cat}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {catApps.map((app) => (
                  <AppTile key={app.id} app={app} onRefetch={refetch} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {showRegister && (
        <RegisterAppModal
          onClose={() => setShowRegister(false)}
          onSuccess={() => { setShowRegister(false); refetch(); }}
        />
      )}
    </div>
  );
}

function EmptyState({ onRegister }: { onRegister: () => void }) {
  return (
    <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-2xl">
      <AppWindow className="w-14 h-14 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-600 mb-1">Sin apps registradas</h3>
      <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
        Registra tus herramientas, dashboards e integraciones para acceder a todo desde un solo lugar.
      </p>
      <button
        onClick={onRegister}
        className="inline-flex items-center gap-2 bg-[#0085D5] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#0072b8] transition-colors"
      >
        <Plus className="w-4 h-4" />
        Registrar primera app
      </button>
    </div>
  );
}
