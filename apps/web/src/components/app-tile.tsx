"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { ExternalLink, Pin, PinOff, Pencil, Trash2, MoreVertical, Wifi, WifiOff } from "lucide-react";

type App = {
  id: string;
  name: string;
  description: string | null;
  url: string;
  icon: string;
  category: string;
  color: string;
  isPinned: boolean;
  isHealthy: boolean | null;
  healthUrl: string | null;
};

interface AppTileProps {
  app: App;
  onRefetch: () => void;
}

export function AppTile({ app, onRefetch }: AppTileProps) {
  const [showMenu, setShowMenu] = useState(false);

  const togglePin = trpc.apps.togglePin.useMutation({ onSuccess: onRefetch });
  const deleteApp = trpc.apps.delete.useMutation({ onSuccess: onRefetch });
  const checkHealth = trpc.apps.checkHealth.useMutation({ onSuccess: onRefetch });

  const handleOpen = () => window.open(app.url, "_blank", "noopener,noreferrer");

  return (
    <div className="group relative bg-white rounded-xl border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all">
      {/* Ping de salud */}
      {app.healthUrl && (
        <div
          className="absolute top-2 right-2"
          title={app.isHealthy === null ? "Sin verificar" : app.isHealthy ? "Online" : "Offline"}
        >
          {app.isHealthy === null ? (
            <div className="w-2 h-2 rounded-full bg-gray-300" />
          ) : app.isHealthy ? (
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-red-400" />
          )}
        </div>
      )}

      {/* Tile content */}
      <button
        onClick={handleOpen}
        className="w-full p-5 text-center flex flex-col items-center gap-3"
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm"
          style={{ backgroundColor: app.color + "20", border: `1px solid ${app.color}30` }}
        >
          {app.icon}
        </div>
        <div className="min-w-0 w-full">
          <p className="text-sm font-semibold text-gray-800 truncate">{app.name}</p>
          {app.description && (
            <p className="text-xs text-gray-400 truncate mt-0.5">{app.description}</p>
          )}
        </div>
      </button>

      {/* Actions (hover) */}
      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="p-1.5 bg-white rounded-lg shadow border border-gray-200 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute left-0 top-8 bg-white rounded-xl shadow-lg border border-gray-200 z-20 py-1 min-w-44">
                <button
                  onClick={() => { handleOpen(); setShowMenu(false); }}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <ExternalLink className="w-4 h-4 text-[#0085D5]" />
                  Abrir
                </button>
                <button
                  onClick={() => { togglePin.mutate({ id: app.id }); setShowMenu(false); }}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  {app.isPinned ? (
                    <><PinOff className="w-4 h-4 text-gray-400" /> Desfijar</>
                  ) : (
                    <><Pin className="w-4 h-4 text-[#FEC341]" /> Fijar</>
                  )}
                </button>
                {app.healthUrl && (
                  <button
                    onClick={() => { checkHealth.mutate({ id: app.id }); setShowMenu(false); }}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {app.isHealthy ? (
                      <Wifi className="w-4 h-4 text-green-500" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-red-400" />
                    )}
                    Verificar salud
                  </button>
                )}
                <hr className="my-1" />
                <button
                  onClick={() => {
                    if (confirm(`¿Eliminar "${app.name}"?`)) {
                      deleteApp.mutate({ id: app.id });
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

      {/* Pin badge */}
      {app.isPinned && (
        <div className="absolute bottom-2 right-2">
          <Pin className="w-3 h-3 text-[#FEC341]" />
        </div>
      )}
    </div>
  );
}
