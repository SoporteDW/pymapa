import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { etapas, type EstadoEtapa } from "@/lib/recorrido";
import type { EtapaId } from "@/types";

interface JourneyMapProps {
  estados: Record<EtapaId, EstadoEtapa>;
  className?: string;
}

/** Mapa del recorrido en cinco etapas: Preparar, Diagnosticar, Interpretar, Actuar y Seguir. */
export function JourneyMap({ estados, className }: JourneyMapProps) {
  return (
    <nav aria-label="Mapa del recorrido" className={className}>
      <ol className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {etapas.map((etapa) => {
          const estado = estados[etapa.id];
          return (
            <li key={etapa.id}>
              <Link
                to={etapa.ruta}
                className={cn(
                  "flex h-full flex-col gap-2 rounded-xl border p-4 transition-colors",
                  estado === "completada" && "border-success/40 bg-success/5",
                  estado === "activa" && "border-primary bg-primary/5",
                  estado === "pendiente" && "border-border bg-card hover:bg-accent"
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      estado === "completada" && "bg-success text-success-foreground",
                      estado === "activa" && "bg-primary text-primary-foreground",
                      estado === "pendiente" && "bg-muted text-muted-foreground"
                    )}
                  >
                    {estado === "completada" ? (
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      etapa.numero
                    )}
                  </span>
                  <span className="text-sm font-semibold text-foreground">{etapa.titulo}</span>
                </div>
                <p className="text-xs text-muted-foreground">{etapa.descripcion}</p>
                <span className="mt-auto text-xs font-medium text-muted-foreground">
                  {estado === "completada"
                    ? "Completada"
                    : estado === "activa"
                      ? "En curso"
                      : "Pendiente"}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
