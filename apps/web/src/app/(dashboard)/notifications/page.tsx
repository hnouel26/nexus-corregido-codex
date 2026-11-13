"use client";

import { trpc } from "@/lib/trpc/client";
import { Bell, CheckCheck, Trash2 } from "lucide-react";

const TYPE_STYLES = {
  INFO: "border-l-[#0085D5] bg-blue-50",
  SUCCESS: "border-l-green-500 bg-green-50",
  WARNING: "border-l-[#FEC341] bg-yellow-50",
  ERROR: "border-l-[#FE5900] bg-red-50",
};

const TYPE_ICONS: Record<string, string> = {
  INFO: "ℹ️",
  SUCCESS: "✅",
  WARNING: "⚠️",
  ERROR: "❌",
};

export default function NotificationsPage() {
  const { data: notifications = [], refetch } = trpc.notifications.list.useQuery();
  const markAllRead = trpc.notifications.markAllRead.useMutation({ onSuccess: () => { void refetch(); } });
  const markRead = trpc.notifications.markRead.useMutation({ onSuccess: () => { void refetch(); } });
  const deleteNotif = trpc.notifications.delete.useMutation({ onSuccess: () => { void refetch(); } });
  const clearAll = trpc.notifications.clearAll.useMutation({ onSuccess: () => { void refetch(); } });

  const unread = notifications.filter((n) => !n.isRead);
  const read = notifications.filter((n) => n.isRead);

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-7 h-7 text-[#FE5900]" />
            Notificaciones
          </h1>
          {unread.length > 0 && (
            <p className="text-sm text-gray-500 mt-1">{unread.length} sin leer</p>
          )}
        </div>
        <div className="flex gap-2">
          {unread.length > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              className="inline-flex items-center gap-1.5 text-sm text-[#0085D5] hover:underline"
            >
              <CheckCheck className="w-4 h-4" />
              Marcar todas como leídas
            </button>
          )}
          {read.length > 0 && (
            <button
              onClick={() => { if (confirm("¿Borrar todas las leídas?")) clearAll.mutate(); }}
              className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 ml-4"
            >
              <Trash2 className="w-4 h-4" />
              Limpiar leídas
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
          <Bell className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <h3 className="text-gray-500 font-medium">Sin notificaciones</h3>
          <p className="text-gray-400 text-sm mt-1">Los agentes y apps enviarán alertas aquí</p>
        </div>
      ) : (
        <div className="space-y-6">
          {unread.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Sin leer</h2>
              <div className="space-y-2">
                {unread.map((n) => (
                  <NotifRow
                    key={n.id}
                    notif={n}
                    onRead={() => markRead.mutate({ id: n.id })}
                    onDelete={() => deleteNotif.mutate({ id: n.id })}
                  />
                ))}
              </div>
            </section>
          )}
          {read.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Leídas</h2>
              <div className="space-y-2">
                {read.map((n) => (
                  <NotifRow
                    key={n.id}
                    notif={n}
                    onDelete={() => deleteNotif.mutate({ id: n.id })}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function NotifRow({
  notif,
  onRead,
  onDelete,
}: {
  notif: { id: string; title: string; message: string | null; type: string; isRead: boolean; createdAt: Date; link: string | null };
  onRead?: () => void;
  onDelete: () => void;
}) {
  const style = TYPE_STYLES[notif.type as keyof typeof TYPE_STYLES] ?? TYPE_STYLES.INFO;
  const icon = TYPE_ICONS[notif.type] ?? "ℹ️";

  return (
    <div
      className={`flex items-start gap-4 p-4 rounded-xl border-l-4 ${style} ${
        notif.isRead ? "opacity-60" : ""
      }`}
    >
      <span className="text-lg flex-shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 text-sm">{notif.title}</p>
        {notif.message && <p className="text-xs text-gray-600 mt-0.5">{notif.message}</p>}
        <p className="text-xs text-gray-400 mt-1.5">
          {new Date(notif.createdAt).toLocaleString("es-MX", {
            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
          })}
        </p>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        {!notif.isRead && onRead && (
          <button
            onClick={onRead}
            className="p-1.5 rounded-lg hover:bg-white/60 transition-colors text-gray-400 hover:text-gray-700"
            title="Marcar como leída"
          >
            <CheckCheck className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg hover:bg-white/60 transition-colors text-gray-400 hover:text-red-500"
          title="Eliminar"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
