import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LifeBuoy } from "lucide-react";
import type { PuntoApoyo } from "@/lib/apoyo/puntos-apoyo";

/**
 * Alerta diferenciada de Punto de Apoyo: informa que la actividad requiere una
 * intervención adicional. No bloquea el recorrido.
 */
export function PuntoApoyoBadge({ punto }: { punto: PuntoApoyo }) {
  return (
    <Badge
      variant="outline"
      className="rounded-full border-brand-ia/50 bg-brand-ia/10 font-medium text-info-foreground"
      title={punto.descripcion}
    >
      <LifeBuoy className="mr-1 h-3 w-3" aria-hidden="true" />
      {punto.titulo}
    </Badge>
  );
}

export function PuntosApoyoLista({
  puntos,
  className,
  detallado = false,
}: {
  puntos: PuntoApoyo[];
  className?: string;
  detallado?: boolean;
}) {
  if (puntos.length === 0) return null;

  if (detallado) {
    return (
      <div className={cn("rounded-xl border border-brand-ia/40 bg-brand-ia/5 p-4", className)}>
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <LifeBuoy className="h-4 w-4 text-info" aria-hidden="true" />
          Puntos de apoyo
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Esta actividad requiere una intervención adicional. Puedes avanzar igual: solo debes
          prever este apoyo.
        </p>
        <ul className="mt-3 space-y-2">
          {puntos.map((punto) => (
            <li key={punto.tipo} className="text-sm">
              <span className="font-medium text-foreground">{punto.titulo}.</span>{" "}
              <span className="text-muted-foreground">{punto.descripcion}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {puntos.map((punto) => (
        <PuntoApoyoBadge key={punto.tipo} punto={punto} />
      ))}
    </div>
  );
}
