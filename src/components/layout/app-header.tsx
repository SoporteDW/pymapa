import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { HelpCircle, PanelLeft, User } from "lucide-react";
import type { ReactNode } from "react";
import type { Empresa } from "@/types";

interface AppHeaderProps {
  empresa?: Empresa;
  onToggleSidebar?: () => void;
  mobileNav?: ReactNode;
}

export function AppHeader({ empresa, onToggleSidebar, mobileNav }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card px-3 shadow-sm sm:px-4">
      <div className="flex items-center gap-2">
        {mobileNav}
        {onToggleSidebar && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="hidden md:inline-flex"
            aria-label="Mostrar u ocultar el menú lateral"
          >
            <PanelLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
        )}
        <Link
          to="/inicio"
          className="flex items-center gap-2 text-base font-semibold text-foreground hover:text-primary sm:text-lg"
        >
          <span>Pyme Digital</span>
          <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            MVP Alfa
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-1 sm:gap-3">
        {empresa?.nombre && (
          <span className="hidden max-w-[16rem] truncate text-sm text-muted-foreground lg:inline">
            {empresa.nombre}
          </span>
        )}
        <Button variant="ghost" size="icon" asChild>
          <Link to="/ayuda" aria-label="Ayuda">
            <HelpCircle className="h-5 w-5" aria-hidden="true" />
          </Link>
        </Button>
        <Button variant="ghost" size="icon" asChild>
          <Link to="/perfil" aria-label="Perfil de empresa">
            <User className="h-5 w-5" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </header>
  );
}
