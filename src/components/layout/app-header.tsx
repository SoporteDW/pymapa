import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { HelpCircle, Settings, User } from "lucide-react";
import type { Empresa } from "@/types";

interface AppHeaderProps {
  empresa?: Empresa;
  onMenuToggle?: () => void;
}

export function AppHeader({ empresa, onMenuToggle }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card px-4 shadow-sm">
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <Button variant="ghost" size="icon" onClick={onMenuToggle} aria-label="Abrir menú de navegación">
            <Settings className="h-5 w-5" aria-hidden="true" />
          </Button>
        )}
        <Link to="/inicio" className="flex items-center gap-2 text-lg font-semibold text-foreground hover:text-primary">
          <span aria-label="Pyme Digital">Pyme Digital</span>
          <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Alfa</span>
        </Link>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {empresa && (
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {empresa.nombre || "Sin empresa seleccionada"}
          </span>
        )}
        <Button variant="ghost" size="icon" asChild aria-label="Ayuda">
          <Link to="/ayuda">
            <HelpCircle className="h-5 w-5" aria-hidden="true" />
          </Link>
        </Button>
        <Button variant="ghost" size="icon" asChild aria-label="Perfil de empresa">
          <Link to="/perfil">
            <User className="h-5 w-5" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </header>
  );
}
