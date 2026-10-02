import { CommandPaletteProvider } from "@/components/layout/command-palette";
import { MobileHeader, MobileTabBar } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { getCurrentUser } from "@/lib/auth/dal";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <CommandPaletteProvider>
      <Sidebar userName={user.name} />
      <MobileHeader />
      <main className="min-h-dvh pb-28 lg:pb-16 lg:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 pt-8 md:px-8 md:pt-12">{children}</div>
      </main>
      <MobileTabBar />
    </CommandPaletteProvider>
  );
}
