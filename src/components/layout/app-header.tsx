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

      <div className="flex items-center gap-2 sm:gap-3">
        {nombreVisible && (
          <span className="hidden max-w-[14rem] truncate text-sm text-muted-foreground xl:inline">
            {nombreVisible}
          </span>
        )}
        <nav aria-label="Accesos rápidos" className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/ayuda"
            aria-label="Ayuda"
            title="Ayuda"
            className="inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-2 text-sm text-primary hover:bg-accent sm:px-3"
          >
            <HelpCircle className="h-5 w-5" aria-hidden="true" />
            <span className="hidden sm:inline">Ayuda</span>
          </Link>
          <Link
            to="/empresa"
            aria-label="Mi empresa"
            title="Mi empresa"
            className="inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-2 text-sm text-primary hover:bg-accent sm:px-3"
          >
            <User className="h-5 w-5" aria-hidden="true" />
            <span className="hidden sm:inline">Mi empresa</span>
          </Link>
        </nav>
        {isHydrated && user ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-full"
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
