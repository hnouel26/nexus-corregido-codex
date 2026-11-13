import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { CommandPaletteProvider } from "@/components/command-palette-provider";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <CommandPaletteProvider>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar user={session.user} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </CommandPaletteProvider>
  );
}
