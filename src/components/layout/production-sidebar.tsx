import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, Building2, ClipboardList, HelpCircle, LineChart, ListTodo, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { navegacionProductiva } from "@/lib/production/entrada";

/**
 * PKG-02A · Navegación del journey productivo. Sin rutas legacy, sin
 * progreso demo y sin etiqueta "MVP Alfa": todo estado viene del servidor.
 */
const iconos = {
  diagnostico: ClipboardList,
  resultados: BarChart3,
  plan: ListTodo,
  seguimiento: LineChart,
  empresa: Building2,
} as const;

export function ProductionNavList({ onNavigate, collapsed = false }: { onNavigate?: () => void; collapsed?: boolean }) {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const activo = (to: string) => currentPath === to || currentPath.startsWith(`${to}/`);
  return (
    <ul className="space-y-1">
      {navegacionProductiva.map((item) => {
        const Icon = iconos[item.id];
        // Las capacidades (incluida OP-01) forman parte del diagnóstico.
        const esActivo = item.id === "diagnostico" ? activo(item.to) || currentPath.startsWith("/capacidad/") : activo(item.to);
        return (
          <li key={item.id}>
            <Link
              to={item.to}
              search={item.id === "empresa" ? { editar: true } : {}}
              {...(onNavigate ? { onClick: onNavigate } : {})}
              title={item.label}
              aria-current={esActivo ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-[14px] px-3 py-2.5 text-[0.9375rem] transition-colors",
                esActivo
                  ? "bg-primary/10 font-semibold text-primary ring-1 ring-primary/25"
                  : "font-medium text-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="h-5 w-5 shrink-0 text-primary/70" aria-hidden="true" />
              {!collapsed && <span className="min-w-0 flex-1 leading-tight">{item.label}</span>}
            </Link>
          </li>
        );
      })}
      <li>
        <Link
          to="/ayuda"
          {...(onNavigate ? { onClick: onNavigate } : {})}
          className="flex items-center gap-3 rounded-[14px] px-3 py-2.5 text-[0.9375rem] font-medium text-foreground/75 hover:bg-sidebar-accent"
        >
          <HelpCircle className="h-5 w-5 shrink-0 text-primary/70" aria-hidden="true" />
          {!collapsed && <span>Ayuda</span>}
        </Link>
      </li>
    </ul>
  );
}

export function ProductionSidebar({ collapsed = false, className }: { collapsed?: boolean; className?: string }) {
  return (
    <aside
      className={cn(
        "hidden h-full flex-col border-r border-border bg-sidebar transition-all duration-200 md:flex",
        collapsed ? "w-[4.5rem]" : "w-64",
        className,
      )}
      aria-label="Navegación principal"
    >
      <nav className="flex-1 overflow-y-auto p-3">
        <ProductionNavList collapsed={collapsed} />
      </nav>
    </aside>
  );
}
