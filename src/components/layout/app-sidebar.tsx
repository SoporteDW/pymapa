import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Check,
  ClipboardList,
  HelpCircle,
  Home,
  LayoutDashboard,
  LifeBuoy,
  LineChart,
  ListTodo,
  Lock,
  Route as RouteIcon,
  Users,
  UserRound,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useJourney } from "@/hooks/use-journey";
import type { EtapaJourneyId } from "@/lib/journey/etapas";

/**
 * Macroentrega 5 · El menú refleja las cuatro etapas visibles del journey:
 * Preparar → Diagnosticar → Actuar → Seguir.
 *
 * Las capacidades existentes (Resultados, Roadmap, Indicadores, Colaboración,
 * Apoyo) no desaparecen: quedan como vistas de consulta subordinadas a su
 * etapa. Los menús son consulta; entrar en ellos no permite saltarse el
 * recorrido (cada módulo aplica su propio bloqueo suave).
 */
const iconos: Record<string, typeof Home> = {
  "/perfil": UserRound,
  "/diagnostico": ClipboardList,
  "/resultados": BarChart3,
  "/diagnostico/especializados": ClipboardList,
  "/plan-de-accion": ListTodo,
  "/roadmap": RouteIcon,
  "/colaboracion": Users,
  "/apoyo": LifeBuoy,
  "/seguimiento": LineChart,
  "/dashboard": LayoutDashboard,
};

/** Enlaces fuera de las etapas (no forman parte del avance). */
export const navItems = [
  { id: "inicio", to: "/inicio", label: "Inicio", icon: Home },
  { id: "perfil", to: "/perfil", label: "Perfil de empresa", icon: UserRound },
  { id: "diagnostico", to: "/diagnostico", label: "Diagnóstico", icon: ClipboardList },
  { id: "resultados", to: "/resultados", label: "Resultados", icon: BarChart3 },
  { id: "plan-de-accion", to: "/plan-de-accion", label: "Plan de Acción", icon: ListTodo },
  { id: "roadmap", to: "/roadmap", label: "Roadmap", icon: RouteIcon },
  { id: "dashboard", to: "/dashboard", label: "Indicadores", icon: LayoutDashboard },
  { id: "seguimiento", to: "/seguimiento", label: "Seguimiento", icon: LineChart },
  { id: "ayuda", to: "/ayuda", label: "Ayuda", icon: HelpCircle },
];

interface AppSidebarProps {
  collapsed?: boolean;
  className?: string;
}

export function AppSidebar({ collapsed = false, className }: AppSidebarProps) {
  const currentPath = useRouterState({ select: (state) => state.location.pathname });
  const { hidratado, etapas, activa } = useJourney();

  const esActual = (ruta: string) =>
    currentPath === ruta || currentPath.startsWith(`${ruta}/`);

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
          <li>
            <ItemMenu
              to="/inicio"
              label="Inicio"
              icon={Home}
              activo={currentPath === "/inicio"}
              collapsed={collapsed}
            />
          </li>
        </ul>

        <ol className="mt-4 space-y-4">
          {etapas.map(({ etapa, estado, etiqueta }) => {
            const Icono = iconos[etapa.ruta] ?? ClipboardList;
            const bloqueada = hidratado && estado === "pendiente";
            const esActiva = hidratado && etapa.id === (activa as EtapaJourneyId);
            return (
              <li key={etapa.id}>
                {!collapsed && (
                  <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Etapa {etapa.numero}
                  </p>
                )}
                <ItemMenu
                  to={etapa.ruta}
                  label={etapa.titulo}
                  icon={Icono}
                  activo={esActual(etapa.ruta)}
                  collapsed={collapsed}
                  destacado={esActiva}
                  sufijo={
                    !hidratado ? null : estado === "completada" ? (
                      <Check className="size-3.5 text-success" aria-hidden="true" />
                    ) : bloqueada ? (
                      <Lock className="size-3.5 text-muted-foreground" aria-hidden="true" />
                    ) : (
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        {etiqueta}
                      </span>
                    )
                  }
                />
                {!collapsed && etapa.consultas.length > 0 && (
                  <ul className="mt-1 space-y-0.5 border-l border-sidebar-border pl-3 ml-4">
                    {etapa.consultas.map((consulta) => {
                      const IconoConsulta = iconos[consulta.ruta] ?? BarChart3;
                      return (
                        <li key={consulta.ruta}>
                          <Link
                            to={consulta.ruta}
                            className={cn(
                              "flex items-center gap-2 rounded-[14px] px-2.5 py-1.5 text-[0.8125rem] transition-colors",
                              esActual(consulta.ruta)
                                ? "bg-primary/10 font-semibold text-primary"
                                : "text-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            )}
                            aria-current={esActual(consulta.ruta) ? "page" : undefined}
                          >
                            <IconoConsulta className="size-4 shrink-0 text-primary/60" aria-hidden="true" />
                            <span className="min-w-0 flex-1 leading-tight">{consulta.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>

        <ul className="mt-4 space-y-1 border-t border-sidebar-border pt-3">
          <li>
            <ItemMenu
              to="/ayuda"
              label="Ayuda"
              icon={HelpCircle}
              activo={currentPath === "/ayuda"}
              collapsed={collapsed}
            />
          </li>
        </ul>
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <p className="text-xs text-muted-foreground">{collapsed ? "v0.4" : "MVP Alfa · v0.4"}</p>
      </div>
    </aside>
  );
}

function ItemMenu({
  to,
  label,
  icon: Icon,
  activo,
  collapsed,
  destacado = false,
  sufijo = null,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  activo: boolean;
  collapsed: boolean;
  destacado?: boolean;
  sufijo?: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      title={label}
      aria-current={activo ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-[14px] px-3 py-2.5 text-[0.9375rem] transition-colors",
        activo
          ? "bg-primary/10 font-semibold text-primary ring-1 ring-primary/25"
          : destacado
            ? "font-semibold text-foreground hover:bg-sidebar-accent"
            : "font-medium text-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      <Icon
        className={cn("h-5 w-5 shrink-0", activo ? "text-primary" : "text-primary/70")}
        aria-hidden="true"
      />
      {!collapsed && (
        <>
          <span className="min-w-0 flex-1 leading-tight">{label}</span>
          {sufijo}
        </>
      )}
    </Link>
  );
}
