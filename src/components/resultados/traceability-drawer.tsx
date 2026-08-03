import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import type { TrazabilidadFicha } from "@/lib/resultados/tipos";
import { registrarEvento } from "@/lib/analytics";
import { Route as RouteIcon } from "lucide-react";

/** TraceabilityDrawer (POC-05, 10 y 13): muestra el origen completo de una ficha. */
export function TraceabilityDrawer({ trazabilidad }: { trazabilidad: TrazabilidadFicha }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={() => registrarEvento("traceability_opened", { prioridad: trazabilidad.prioridadId })}
        >
          <RouteIcon className="mr-2 h-4 w-4" aria-hidden="true" />
          Ver de dónde viene
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Origen de esta recomendación</SheetTitle>
          <SheetDescription>
            Cada ficha se deriva de respuestas concretas, reglas aplicadas y hallazgos del
            diagnóstico. Nada se genera al azar.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5 text-sm">
          <section>
            <p className="font-semibold text-foreground">Área evaluada</p>
            <p className="text-muted-foreground">
              {trazabilidad.dimensionNombre}
              {trazabilidad.capacidadNombre ? ` · ${trazabilidad.capacidadNombre}` : ""}
            </p>
          </section>

          <Separator />

          <section>
            <p className="font-semibold text-foreground">Hallazgos que la originan</p>
            <ul className="mt-2 space-y-2">
              {trazabilidad.hallazgos.map((hallazgo) => (
                <li key={hallazgo.id} className="rounded-lg border border-border p-2">
                  <p className="text-foreground">{hallazgo.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {hallazgo.tipo} · {hallazgo.id}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <p className="font-semibold text-foreground">Preguntas de referencia</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {trazabilidad.preguntas.length === 0 ? (
                <p className="text-muted-foreground">Sin referencias directas registradas.</p>
              ) : (
                trazabilidad.preguntas.map((pregunta) => (
                  <Badge key={pregunta} variant="secondary">
                    {pregunta}
                  </Badge>
                ))
              )}
            </div>
          </section>

          <section>
            <p className="font-semibold text-foreground">Reglas aplicadas</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {trazabilidad.reglas.map((regla) => (
                <Badge key={regla} variant="outline">
                  {regla}
                </Badge>
              ))}
            </div>
          </section>

          <Separator />

          <section className="space-y-1 text-xs text-muted-foreground">
            <p>Ejecución: {trazabilidad.executionId}</p>
            <p>Prioridad: {trazabilidad.prioridadId}</p>
            <p>Reglas: {trazabilidad.ruleSetVersion}</p>
            <p>Catálogo: {trazabilidad.catalogVersion}</p>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
