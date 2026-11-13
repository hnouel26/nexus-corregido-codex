"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { trpc } from "@/lib/trpc/client";
import {
  LayoutDashboard,
  FolderOpen,
  Bot,
  Settings,
  LogOut,
  Wrench,
  AppWindow,
  Bell,
  Search,
} from "lucide-react";

interface SidebarProps {
  user: { name?: string | null; email?: string | null };
}

const navItems: Array<{ href: string; icon: typeof Bot; label: string; soon?: boolean }> = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/apps", icon: AppWindow, label: "Apps" },
  { href: "/projects", icon: FolderOpen, label: "Proyectos" },
  { href: "/agents", icon: Bot, label: "Agentes" },
  { href: "/tools", icon: Wrench, label: "Herramientas" },
];

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const { data: unread = 0 } = trpc.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  return (
    <aside className="w-64 bg-[#003d7a] text-white flex flex-col h-full flex-shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#0085D5] rounded-lg flex items-center justify-center">
            <span className="font-bold text-sm">N</span>
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight">Nexus</span>
            <p className="text-white/40 text-xs -mt-0.5">Personal OS</p>
          </div>
        </div>
      </div>

      {/* Search / Ctrl+K */}
      <div className="px-3 py-2">
        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }))}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/8 hover:bg-white/12 transition-colors text-white/40 hover:text-white/70 text-sm"
        >
          <Search className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1 text-left">Buscar...</span>
          <kbd className="text-[10px] border border-white/15 rounded px-1.5 py-0.5 font-mono">⌃K</kbd>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-1 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <div key={item.href}>
              {item.soon ? (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/35 cursor-not-allowed select-none">
                  <item.icon className="w-5 h-5" />
                  <span className="text-sm">{item.label}</span>
                  <span className="ml-auto text-xs bg-white/8 px-1.5 py-0.5 rounded text-white/40">
                    Pronto
                  </span>
                </div>
              ) : (
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? "bg-[#0085D5] text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-white/10 p-3 space-y-0.5">
        {/* Notifications */}
        <Link
          href="/notifications"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
            pathname === "/notifications"
              ? "bg-[#0085D5] text-white"
              : "text-white/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          <div className="relative">
            <Bell className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#FE5900] rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </div>
          <span className="text-sm font-medium">Notificaciones</span>
          {unread > 0 && (
            <span className="ml-auto text-xs bg-[#FE5900] px-1.5 py-0.5 rounded-full font-bold">
              {unread}
            </span>
          )}
        </Link>

        <Link
          href="/settings"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
            pathname === "/settings"
              ? "bg-[#0085D5] text-white"
              : "text-white/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-sm">Configuración</span>
        </Link>

        {/* User */}
        <div className="flex items-center gap-3 px-3 py-2 mt-1">
          <div className="w-8 h-8 bg-[#FE5900] rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-semibold">
              {(user.name?.[0] ?? user.email?.[0] ?? "U").toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.name ?? "Usuario"}</p>
            <p className="text-xs text-white/50 truncate">{user.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-1.5 rounded hover:bg-white/10 transition-colors text-white/50 hover:text-white"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
