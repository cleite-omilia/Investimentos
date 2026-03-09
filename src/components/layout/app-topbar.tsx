"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { PortfolioSwitcher } from "@/components/layout/portfolio-switcher";
import { NotificationBell } from "@/components/layout/notification-bell";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/ativos": "Ativos",
  "/operacoes": "Operações",
  "/projetos": "Projetos",
  "/aportes": "Aportes",
  "/reserva": "Reserva de Emergência",
  "/alocacao": "Alocação",
  "/familia": "Família",
  "/notificacoes": "Notificações",
  "/configuracoes": "Configurações",
};

export function AppTopbar() {
  const pathname = usePathname();
  const pageTitle = pageTitles[pathname] || "Investimentos";

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <h1 className="text-sm font-medium">{pageTitle}</h1>

      <div className="ml-auto flex items-center gap-2">
        <PortfolioSwitcher />
        <NotificationBell />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
