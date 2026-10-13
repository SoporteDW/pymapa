import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { HelpCircle, LogIn, LogOut, PanelLeft, User } from "lucide-react";
import type { ReactNode } from "react";
import type { Empresa } from "@/types";
import { BrandLogo } from "./brand-logo";
import { useAuth } from "@/hooks/use-auth";

interface AppHeaderProps {
  empresa?: Empresa;
  /** PKG-02A: contexto productivo (sin perfil legacy, nombre desde PostgreSQL). */
  produccion?: boolean;
  nombreEmpresaProductiva?: string | null;
  onToggleSidebar?: () => void;
  mobileNav?: ReactNode;
}

export function AppHeader({ empresa, produccion = false, nombreEmpresaProductiva, onToggleSidebar, mobileNav }: AppHeaderProps) {
  const nombreVisible = produccion ? nombreEmpresaProductiva : empresa?.nombre;
  const { isHydrated, user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const cerrarSesion = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    await navigate({ to: "/acceso", replace: true });
  };

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
        <Link to="/diagnostico-productivo" aria-label="pymapa, ir al inicio" className="ml-1 flex items-center">
          <BrandLogo sinBadge={produccion} />
        </Link>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        {nombreVisible && (
          <span className="hidden max-w-[14rem] truncate text-sm text-muted-foreground xl:inline">
            {nombreVisible}
          </span>
        )}
        <Button variant="ghost" size="icon" className="rounded-full" asChild>
          <Link to="/ayuda" aria-label="Centro de ayuda">
            <HelpCircle className="h-5 w-5 text-primary" aria-hidden="true" />
          </Link>
        </Button>
        <Button variant="ghost" size="icon" className="rounded-full" asChild>
          <Link to="/empresa" search={{ editar: true }} aria-label="Perfil de empresa">
            <User className="h-5 w-5 text-primary" aria-hidden="true" />
          </Link>
        </Button>
        {isHydrated && user ? (
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => void cerrarSesion()}
            aria-label="Cerrar sesión"
          >
            <LogOut className="h-5 w-5 text-primary" aria-hidden="true" />
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="rounded-full" asChild>
            <Link to="/acceso" aria-label="Iniciar sesión">
              <LogIn className="h-5 w-5 text-primary" aria-hidden="true" />
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
}
