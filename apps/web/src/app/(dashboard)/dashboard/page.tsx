import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { AppWindow, FolderOpen, CheckSquare, Bell, Plus, ExternalLink, Circle, Clock, CheckCircle2 } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const [pinnedApps, recentProjects, taskCounts, recentNotifications] = await Promise.all([
    prisma.app.findMany({
      where: { userId, isActive: true, isPinned: true },
      orderBy: { order: "asc" },
      take: 8,
    }),
    prisma.project.findMany({
      where: { userId, status: "ACTIVE" },
      take: 4,
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { tasks: true } },
        tasks: {
          where: { status: { in: ["TODO", "IN_PROGRESS"] } },
          take: 3,
          orderBy: { priority: "desc" },
        },
      },
    }),
    prisma.task.groupBy({
      by: ["status"],
      where: { project: { userId } },
      _count: { status: true },
    }),
    prisma.notification.findMany({
      where: { userId, isRead: false },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const tasksDone = taskCounts.find((t) => t.status === "DONE")?._count.status ?? 0;
  const tasksInProgress = taskCounts.find((t) => t.status === "IN_PROGRESS")?._count.status ?? 0;
  const tasksTodo = taskCounts.find((t) => t.status === "TODO")?._count.status ?? 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className="p-8 space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting}, {session?.user?.name?.split(" ")[0] ?? "Usuario"}
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          {new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Pinned Apps (Quick Launch) */}
      {pinnedApps.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Acceso rápido</h2>
            <Link href="/apps" className="text-xs text-[#0085D5] hover:underline">Ver todas</Link>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
            {pinnedApps.map((app) => (
              <a
                key={app.id}
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-100 transition-colors group"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-sm"
                  style={{ backgroundColor: app.color + "20", border: `1px solid ${app.color}30` }}
                >
                  {app.icon}
                </div>
                <span className="text-xs text-gray-600 text-center truncate w-full font-medium group-hover:text-gray-900">
                  {app.name}
                </span>
              </a>
            ))}
            <Link
              href="/apps"
              className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="w-11 h-11 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center">
                <Plus className="w-5 h-5 text-gray-400" />
              </div>
              <span className="text-xs text-gray-400 text-center">Más</span>
            </Link>
          </div>
        </section>
      )}

      {pinnedApps.length === 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Acceso rápido</h2>
          </div>
          <Link
            href="/apps"
            className="flex items-center gap-4 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-[#0085D5] hover:bg-blue-50/30 transition-all group"
          >
            <AppWindow className="w-8 h-8 text-gray-300 group-hover:text-[#0085D5] transition-colors" />
            <div>
              <p className="text-sm font-medium text-gray-500 group-hover:text-[#0085D5]">Registra tus apps</p>
              <p className="text-xs text-gray-400">KPI dashboards, nfi-regulatory, ALERE y más</p>
            </div>
          </Link>
        </section>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon="✅" label="Completadas" value={tasksDone} color="#22c55e" />
        <StatCard icon="⚡" label="En progreso" value={tasksInProgress} color="#0085D5" />
        <StatCard icon="📋" label="Pendientes" value={tasksTodo} color="#FE5900" />
      </div>

      {/* Main content: Projects + Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Projects (2/3) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-[#0085D5]" />
              Proyectos activos
            </h2>
            <Link href="/projects" className="text-xs text-[#0085D5] hover:underline">Ver todos</Link>
          </div>

          {recentProjects.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
              <p className="text-gray-400 text-sm mb-3">Sin proyectos activos</p>
              <Link href="/projects" className="text-sm text-[#0085D5] hover:underline">Crear proyecto</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentProjects.map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm hover:border-[#0085D5]/40 transition-all">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: project.color }} />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-800 text-sm truncate">{project.name}</h3>
                        <p className="text-xs text-gray-400">{project._count.tasks} tareas</p>
                      </div>
                    </div>
                    {project.tasks.length > 0 && (
                      <div className="space-y-1.5 ml-5">
                        {project.tasks.map((task) => (
                          <div key={task.id} className="flex items-center gap-2">
                            {task.status === "IN_PROGRESS" ? (
                              <Clock className="w-3.5 h-3.5 text-[#0085D5] flex-shrink-0" />
                            ) : (
                              <Circle className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                            )}
                            <span className="text-xs text-gray-600 truncate">{task.title}</span>
                            <PriorityDot priority={task.priority} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Notifications (1/3) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#FE5900]" />
              Notificaciones
              {recentNotifications.length > 0 && (
                <span className="text-xs bg-[#FE5900] text-white px-1.5 py-0.5 rounded-full font-bold">
                  {recentNotifications.length}
                </span>
              )}
            </h2>
            <Link href="/notifications" className="text-xs text-[#0085D5] hover:underline">Ver todas</Link>
          </div>

          {recentNotifications.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
              <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-xs">Sin notificaciones</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentNotifications.map((n) => (
                <div key={n.id} className={`p-3 rounded-lg border text-sm ${NOTIF_STYLES[n.type as keyof typeof NOTIF_STYLES]}`}>
                  <p className="font-medium leading-tight">{n.title}</p>
                  {n.message && <p className="text-xs opacity-70 mt-0.5 line-clamp-2">{n.message}</p>}
                  <p className="text-xs opacity-50 mt-1">
                    {new Date(n.createdAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const NOTIF_STYLES = {
  INFO: "bg-blue-50 border-blue-100 text-blue-800",
  SUCCESS: "bg-green-50 border-green-100 text-green-800",
  WARNING: "bg-yellow-50 border-yellow-100 text-yellow-800",
  ERROR: "bg-red-50 border-red-100 text-red-800",
};

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold" style={{ color }}>{value}</p>
      </div>
    </div>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    URGENT: "bg-red-400",
    HIGH: "bg-orange-400",
    MEDIUM: "bg-blue-300",
    LOW: "bg-gray-300",
  };
  return <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ml-auto ${colors[priority] ?? "bg-gray-300"}`} />;
}
