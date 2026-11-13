"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { useDebounce } from "@/lib/hooks/use-debounce";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

type ResultSection = {
  label: string;
  items: { id: string; title: string; subtitle?: string; href: string; icon: string }[];
};

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 200);

  const { data } = trpc.search.global.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length >= 2, placeholderData: (previous) => previous }
  );

  const sections: ResultSection[] = [];
  if (data) {
    if (data.projects.length > 0)
      sections.push({
        label: "Proyectos",
        items: data.projects.map((p) => ({
          id: p.id,
          title: p.name,
          subtitle: p.description ?? p.status,
          href: `/projects/${p.id}`,
          icon: "📁",
        })),
      });
    if (data.tasks.length > 0)
      sections.push({
        label: "Tareas",
        items: data.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          subtitle: t.project.name,
          href: `/projects/${t.projectId}`,
          icon: "✓",
        })),
      });
    if (data.agents.length > 0)
      sections.push({
        label: "Agentes",
        items: data.agents.map((a) => ({
          id: a.id,
          title: a.name,
          subtitle: a.trigger,
          href: `/agents/${a.id}`,
          icon: "🤖",
        })),
      });
    if (data.apps.length > 0)
      sections.push({
        label: "Apps",
        items: data.apps.map((a) => ({
          id: a.id,
          title: a.name,
          subtitle: a.category,
          href: a.url,
          icon: a.icon ?? "🔗",
        })),
      });
  }

  // Static nav shortcuts (always shown when query is empty)
  const navItems: ResultSection = {
    label: "Navegar",
    items: [
      { id: "nav-dash",   title: "Dashboard",      subtitle: "Inicio del sistema",    href: "/dashboard",      icon: "⬛" },
      { id: "nav-apps",   title: "Apps",            subtitle: "Launcher de apps",      href: "/apps",           icon: "⊞" },
      { id: "nav-proj",   title: "Proyectos",       subtitle: "Gestión de proyectos",  href: "/projects",       icon: "📁" },
      { id: "nav-agent",  title: "Agentes",         subtitle: "AI agents",             href: "/agents",         icon: "🤖" },
      { id: "nav-tools",  title: "Herramientas",    subtitle: "Plugins conectados",    href: "/tools",          icon: "🔌" },
      { id: "nav-notif",  title: "Notificaciones",  subtitle: "Centro de alertas",     href: "/notifications",  icon: "🔔" },
    ],
  };

  const displaySections = query.length < 2 ? [navItems] : sections.length > 0 ? sections : [];

  const allItems = displaySections.flatMap((s) => s.items);

  const navigate = useCallback(
    (href: string) => {
      onClose();
      setQuery("");
      if (href.startsWith("http")) window.open(href, "_blank", "noopener,noreferrer");
      else router.push(href);
    },
    [onClose, router]
  );

  // Reset selection on new results
  useEffect(() => { setSelected(0); }, [debouncedQuery]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setSelected(0);
    }
  }, [open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.max(0, Math.min(s + 1, allItems.length - 1))); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
      if (e.key === "Enter" && allItems[selected]) { navigate(allItems[selected].href); }
      if (e.key === "Escape") { onClose(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, allItems, selected, navigate, onClose]);

  if (!open) return null;

  let itemIndex = -1;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-xl mx-4 bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <span className="text-white/40 text-lg">⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar proyectos, tareas, agentes, apps..."
            className="flex-1 bg-transparent text-white placeholder-white/30 outline-none text-sm"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-white/30 hover:text-white/60 text-xs">✕</button>
          )}
          <kbd className="hidden sm:block text-white/20 text-xs border border-white/10 rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[360px] overflow-y-auto py-2">
          {displaySections.length === 0 && query.length >= 2 && (
            <p className="text-white/30 text-sm text-center py-8">Sin resultados para &ldquo;{query}&rdquo;</p>
          )}
          {displaySections.map((section) => (
            <div key={section.label}>
              <p className="px-4 py-1.5 text-[11px] font-semibold text-white/30 uppercase tracking-wider">{section.label}</p>
              {section.items.map((item) => {
                itemIndex++;
                const idx = itemIndex;
                const isSelected = selected === idx;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.href)}
                    onMouseEnter={() => setSelected(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      isSelected ? "bg-[#0085D5]/20 text-white" : "text-white/70 hover:bg-white/5"
                    }`}
                  >
                    <span className="text-base w-6 text-center flex-shrink-0">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      {item.subtitle && <p className="text-xs text-white/40 truncate">{item.subtitle}</p>}
                    </div>
                    {isSelected && <span className="text-white/30 text-xs">↵</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-white/10 text-white/20 text-xs">
          <span><kbd className="border border-white/10 rounded px-1">↑</kbd><kbd className="border border-white/10 rounded px-1 ml-0.5">↓</kbd> navegar</span>
          <span><kbd className="border border-white/10 rounded px-1">↵</kbd> abrir</span>
          <span><kbd className="border border-white/10 rounded px-1">ESC</kbd> cerrar</span>
        </div>
      </div>
    </div>
  );
}
