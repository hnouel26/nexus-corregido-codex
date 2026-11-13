import { auth } from "@/lib/auth";

export default async function SettingsPage() {
  const session = await auth();
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Configuración</h1>
      <p className="text-gray-500 mb-8">Ajustes de tu cuenta y plataforma</p>

      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg">
        <h2 className="font-semibold text-gray-900 mb-4">Cuenta</h2>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-500">Nombre</p>
            <p className="font-medium text-gray-800">{session?.user?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium text-gray-800">{session?.user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
