import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useSesion } from "@/hooks/use-sesion";
import { avanceModulos, etiquetaEstadoModulo, type ModuloId } from "@/lib/recorrido-modulos";
import {
  Home,
  ClipboardList,
  BarChart3,
  ListTodo,
  Route as RouteIcon,
  LayoutDashboard,
  UserRound,
  HelpCircle,
} from "lucide-react";

/**
 * Menú principal en orden cronológico del proceso de transformación digital.
 * La demostración no forma parte del recorrido: vive en la barra superior.
 */
export const navItems: {
  id: string;
  to: string;
  label: string;
  icon: typeof Home;
  modulo?: ModuloId;
}[] = [
  { id: "inicio", to: "/inicio", label: "Inicio", icon: Home },
  { id: "perfil", to: "/perfil", label: "Perfil de empresa", icon: UserRound, modulo: "perfil" },
  {
    id: "diagnostico",
    to: "/diagnostico",
    label: "Diagnóstico",
    icon: ClipboardList,
    modulo: "diagnostico",
  },
  { id: "resultados", to: "/resultados", label: "Resultados", icon: BarChart3, modulo: "resultados" },
  {
    id: "plan-de-accion",
    to: "/plan-de-accion",
    label: "Plan de Acción",
    icon: ListTodo,
    modulo: "plan-de-accion",
  },
  { id: "roadmap", to: "/roadmap", label: "Roadmap", icon: RouteIcon, modulo: "roadmap" },
  {
    id: "dashboard",
    to: "/dashboard",
    label: "Indicadores",
    icon: LayoutDashboard,
    modulo: "indicadores",
  },
  { id: "ayuda", to: "/ayuda", label: "Ayuda", icon: HelpCircle },
];

interface AppSidebarProps {
  collapsed?: boolean;
  className?: string;
}

export function AppSidebar({ collapsed = false, className }: AppSidebarProps) {
  const currentPath = useRouterState({
    select: (state) => state.location.pathname,
  });
  const { sesion, isHydrated } = useSesion();
  const avances = avanceModulos(sesion);

  return (
    <aside
      className={cn(
        "hidden h-full flex-col border-r border-border bg-sidebar transition-all duration-200 md:flex",
        collapsed ? "w-[4.5rem]" : "w-64",
        className
      )}
      aria-label="Navegación principal"
    >
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              currentPath === item.to || currentPath.startsWith(`${item.to}/`);
            const Icon = item.icon;
            const avance = item.modulo && isHydrated ? avances[item.modulo] : null;
            return (
              <li key={item.id}>
                <Link
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-[14px] px-3 py-2.5 text-[0.9375rem] transition-colors",
                    isActive
                      ? "bg-primary/10 font-semibold text-primary ring-1 ring-primary/25"
                      : "font-medium text-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                  aria-current={isActive ? "page" : undefined}
                  title={
                    avance
                      ? `${item.label} · ${etiquetaEstadoModulo[avance.estado]} (${avance.porcentaje}%)`
                      : item.label
                  }
                >
                  <Icon
                    className={cn("h-5 w-5 shrink-0", isActive ? "text-primary" : "text-primary/70")}
                    aria-hidden="true"
                  />
                  {!collapsed && (
                    <>
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {avance && avance.porcentaje > 0 && (
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            avance.estado === "completada"
                              ? "bg-success/12 text-success"
                              : "bg-primary/10 text-primary"
                          )}
                        >
                          {avance.porcentaje}%
                        </span>
                      )}
                    </>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <p className="text-xs text-muted-foreground">
          {collapsed ? "v0.3" : "MVP Alfa · v0.3"}
        </p>
      </div>
    </aside>
  );
}
