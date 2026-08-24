import { Link } from "@tanstack/react-router";
import { Check, Circle, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useJourney } from "@/hooks/use-journey";
import type { EstadoEtapaJourney } from "@/lib/journey/etapas";
import { cn } from "@/lib/utils";

const tono: Record<EstadoEtapaJourney, string> = {
  completada: "border-success/40 bg-success/10 text-success",
  en_curso: "border-primary/40 bg-primary/10 text-primary",
  pendiente: "border-border bg-muted text-muted-foreground",
};

function Icono({ estado }: { estado: EstadoEtapaJourney }) {
  if (estado === "completada") return <Check className="h-4 w-4" aria-hidden="true" />;
  if (estado === "en_curso") return <Loader2 className="h-4 w-4" aria-hidden="true" />;
  return <Circle className="h-4 w-4" aria-hidden="true" />;
}

/**
 * Macroentrega 5 · Estado visual de las cuatro etapas.
 * Ninguna etapa puede aparecer completada mientras su condición real no se
 * cumpla (el diagnóstico solo se completa con su cierre formal).
 */
export function EtapasJourney({ className }: { className?: string }) {
  const { hidratado, etapas, activa } = useJourney();

  if (!hidratado) return null;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Tu recorrido</CardTitle>
        <CardDescription>
          Explorar es libre; avanzar es secuencial. Siempre te indicamos un único siguiente paso.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {etapas.map(({ etapa, estado, etiqueta, bloqueo }) => {
            const esActiva = etapa.id === activa;
            const contenido = (
              <div
                className={cn(
                  "h-full rounded-[16px] border p-4 transition-colors",
                  esActiva ? "border-primary/40 bg-primary/5" : "border-border bg-card"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Etapa {etapa.numero}
                  </p>
                  <Badge variant="outline" className={cn("gap-1 rounded-full text-[11px]", tono[estado])}>
                    <Icono estado={estado} />
                    {etiqueta}
                  </Badge>
                </div>
                <p className="mt-1 text-sm font-semibold text-foreground">{etapa.titulo}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {bloqueo && estado === "pendiente" ? bloqueo.motivo : etapa.descripcion}
                </p>
              </div>
            );

            return (
              <li key={etapa.id}>
                {estado === "pendiente" ? (
                  contenido
                ) : (
                  <Link to={etapa.ruta} className="block h-full focus-visible:outline-none">
                    {contenido}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
