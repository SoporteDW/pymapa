import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { FlaskConical, HelpCircle, PanelLeft, User } from "lucide-react";
import type { ReactNode } from "react";
import type { Empresa } from "@/types";
import { BrandLogo } from "./brand-logo";

interface AppHeaderProps {
  empresa?: Empresa;
  onToggleSidebar?: () => void;
  mobileNav?: ReactNode;
}

export function AppHeader({ empresa, onToggleSidebar, mobileNav }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-3 sm:px-6">
      <div className="flex items-center gap-1 sm:gap-2">
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
        <Link to="/inicio" aria-label="pymapa, ir al inicio" className="ml-1 flex items-center">
          <BrandLogo />
        </Link>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        {empresa?.nombre && (
          <span className="hidden max-w-[14rem] truncate text-sm text-muted-foreground xl:inline">
            {empresa.nombre}
          </span>
        )}
        <Button variant="outline" size="sm" className="hidden sm:inline-flex" asChild>
          <Link to="/demostracion">
            <FlaskConical className="mr-1 h-4 w-4" aria-hidden="true" />
            Ver demostraciones
          </Link>
        </Button>
        <Button variant="ghost" size="icon" className="sm:hidden" asChild>
          <Link to="/demostracion" aria-label="Ver demostraciones">
            <FlaskConical className="h-5 w-5 text-primary" aria-hidden="true" />
          </Link>
        </Button>
        <Button variant="ghost" size="icon" className="rounded-full" asChild>
          <Link to="/ayuda" aria-label="Centro de ayuda">
            <HelpCircle className="h-5 w-5 text-primary" aria-hidden="true" />
          </Link>
        </Button>
        <Button variant="ghost" size="icon" className="rounded-full" asChild>
          <Link to="/perfil" aria-label="Perfil de empresa">
            <User className="h-5 w-5 text-primary" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </header>
  );
}
