import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { camposPosteriores } from "@/lib/kb/iniciativas";
import type { IniciativaKB } from "@/lib/kb/tipos";

/**
 * Iniciativas originadas en un diagnóstico especializado, integradas al modelo
 * de Plan de Acción existente. Conservan su trazabilidad de origen.
 */
export function IniciativasKb({ iniciativas }: { iniciativas: IniciativaKB[] }) {
  if (iniciativas.length === 0) return null;

  return (
    <section aria-labelledby="iniciativas-kb" className="space-y-4">
      <div className="space-y-1">
        <h2 id="iniciativas-kb" className="text-lg font-semibold text-foreground">
          Iniciativas desde diagnósticos especializados
        </h2>
        <p className="text-sm text-muted-foreground">
          Se crearon a partir de un hallazgo trazable. Los datos ya conocidos vienen precargados;
          solo falta completar: {camposPosteriores.join(", ")}.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {iniciativas.map(({ accion, origen }) => (
          <Card key={accion.id}>
            <CardHeader className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">Prioridad {accion.prioridad}</Badge>
                <Badge variant="secondary">Impacto {accion.impacto}</Badge>
                <Badge variant="secondary">Esfuerzo {accion.esfuerzo}</Badge>
              </div>
              <CardTitle className="text-base">{accion.titulo}</CardTitle>
              <CardDescription>{accion.proposito}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">{accion.porQueImporta}</p>
              <div>
                <p className="font-semibold text-foreground">Primeras acciones</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                  {accion.pasos.map((paso) => (
                    <li key={paso}>{paso}</li>
                  ))}
                </ul>
              </div>
              <p className="text-xs text-muted-foreground">
                Duración estimada: {accion.duracionEstimada} · Resultado esperado:{" "}
                {origen.resultadoEsperado}
              </p>
              <p className="text-xs text-muted-foreground">
                Origen: {origen.packId} {origen.packVersion} · {origen.hallazgoId} ·{" "}
                {origen.reglaId}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
