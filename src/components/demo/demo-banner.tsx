import { Button } from "@/components/ui/button";
import { useModoDemo } from "@/hooks/use-modo-demo";
import { FlaskConical, LogOut } from "lucide-react";

/**
 * Aviso permanente y discreto mientras el Modo Demostración está activo, con
 * la salida siempre disponible. Los datos reales quedan respaldados aparte.
 */
export function DemoBanner() {
  const { isHydrated, demoActiva, modo, estado, salirDemo } = useModoDemo();

  if (!isHydrated || !demoActiva) return null;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/20 bg-primary/5 px-4 py-2 text-xs text-primary"
    >
      <span className="flex items-center gap-2">
        <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="font-semibold">Modo demostración · datos simulados</span>
        {estado.perfilNombre && (
          <span className="text-primary/80">
            {estado.perfilNombre}
            {modo === "paso_a_paso" ? " · recorrido paso a paso" : " · escenario completo"}
          </span>
        )}
      </span>
      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={salirDemo}>
        <LogOut className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
        Salir de demostración
      </Button>
    </div>
  );
}
