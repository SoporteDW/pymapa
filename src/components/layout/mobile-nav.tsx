import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { navItems } from "./app-sidebar";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const currentPath = useRouterState({
    select: (state) => state.location.pathname,
  });

  // Cierra el menú al cambiar de vista para no tapar el contenido.
  useEffect(() => {
    setOpen(false);
  }, [currentPath]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Abrir menú de navegación"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
        <div className="flex h-full flex-col">
          <div className="border-b border-border p-4">
            <span className="text-lg font-semibold text-foreground">Pyme Digital</span>
            <span className="ml-2 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              MVP Alfa
            </span>
          </div>
          <nav className="flex-1 overflow-y-auto p-3" aria-label="Navegación principal">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const isActive =
                  currentPath === item.to || currentPath.startsWith(`${item.to}/`);
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <Link
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="border-t border-border p-4">
            <p className="text-xs text-muted-foreground">MVP Alfa · v0.2</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
