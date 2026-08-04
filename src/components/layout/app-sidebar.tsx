import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  Home,
  ClipboardList,
  BarChart3,
  ListTodo,
  Route as RouteIcon,
  LayoutDashboard,
  UserRound,
  HelpCircle,
  FlaskConical,
} from "lucide-react";

export const navItems = [
  { id: "inicio", to: "/inicio", label: "Inicio", icon: Home },
  { id: "diagnostico", to: "/diagnostico", label: "Diagnóstico", icon: ClipboardList },
  { id: "resultados", to: "/resultados", label: "Resultados", icon: BarChart3 },
  { id: "plan-de-accion", to: "/plan-de-accion", label: "Plan de acción", icon: ListTodo },
  { id: "roadmap", to: "/roadmap", label: "Roadmap", icon: RouteIcon },
  { id: "dashboard", to: "/dashboard", label: "Indicadores", icon: LayoutDashboard },
  { id: "demostracion", to: "/demostracion", label: "Demostración", icon: FlaskConical },
  { id: "perfil", to: "/perfil", label: "Perfil de empresa", icon: UserRound },
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

  return (
    <aside
      className={cn(
        "hidden h-full flex-col border-r border-border bg-sidebar transition-all duration-200 md:flex",
        collapsed ? "w-[4.5rem]" : "w-60",
        className
      )}
      aria-label="Navegación principal"
    >
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1.5">
          {navItems.map((item) => {
            const isActive =
              currentPath === item.to || currentPath.startsWith(`${item.to}/`);
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <Link
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.9375rem] font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                  aria-current={isActive ? "page" : undefined}
                  title={item.label}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0",
                      isActive ? "text-primary-foreground" : "text-primary"
                    )}
                    aria-hidden="true"
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <p className="text-xs text-muted-foreground">
          {collapsed ? "v0.2" : "MVP Alfa · v0.2"}
        </p>
      </div>
    </aside>
  );
}

