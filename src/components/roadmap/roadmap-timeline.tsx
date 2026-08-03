import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatearFecha } from "@/lib/roadmap/fechas";
import { clasesEstado } from "./state-badge";
import { etiquetaEstado } from "@/lib/roadmap/estados";
import { cn } from "@/lib/utils";
import type { Cronograma } from "@/lib/roadmap/cronograma";

/**
 * Vista Cronograma simplificada (POC-06, 11): escala mensual con una barra por
 * acción, marca del día actual y sección aparte para lo no programado.
 */
export function RoadmapTimeline({ cronograma }: { cronograma: Cronograma }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cronograma por meses</CardTitle>
          <CardDescription>
            Vista de referencia: no es una herramienta de gestión de proyectos, sino una ayuda para
            ver el orden y las duraciones estimadas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 overflow-x-auto">
          <div className="min-w-[640px] space-y-5">
            <div className="relative flex border-b pb-2 text-xs text-muted-foreground">
              {cronograma.meses.map((mes) => (
                <span
                  key={mes.clave}
                  className="flex-1 border-l pl-2 first:border-l-0 first:pl-0 capitalize"
                >
                  {mes.etiqueta}
                </span>
              ))}
            </div>

            {cronograma.grupos.map((grupo) => (
              <section key={grupo.fase.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">{grupo.fase.nombre}</h3>
                  <Badge variant="secondary">{grupo.barras.length}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {grupo.fase.rangoTemporal}
                  </span>
                </div>

                {grupo.barras.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Sin acciones programadas en esta fase.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {grupo.barras.map((barra) => (
                      <li key={barra.accion.id} className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <Link
                            to="/roadmap/$accion"
                            params={{ accion: barra.accion.id }}
                            className="font-medium underline-offset-2 hover:underline"
                          >
                            {barra.accion.titulo}
                          </Link>
                          <span className={cn("rounded border px-1.5", clasesEstado[barra.accion.estado])}>
                            {etiquetaEstado[barra.accion.estado]}
                          </span>
                          <span className="text-muted-foreground">
                            {formatearFecha(barra.accion.fechaInicio)} –{" "}
                            {formatearFecha(barra.accion.fechaObjetivo)}
                          </span>
                        </div>
                        <div className="relative h-4 rounded bg-muted">
                          {cronograma.marcadorHoy !== null && (
                            <span
                              className="absolute top-0 h-4 w-px bg-foreground/50"
                              style={{ left: `${cronograma.marcadorHoy}%` }}
                              aria-hidden="true"
                            />
                          )}
                          <span
                            className="absolute top-0 h-4 rounded bg-primary/70"
                            style={{ left: `${barra.offset}%`, width: `${barra.ancho}%` }}
                            aria-hidden="true"
                          />
                        </div>
                        {barra.referenciaDependencias.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Depende de: {barra.referenciaDependencias.join(", ")}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </CardContent>
      </Card>

      {cronograma.porProgramar.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Por programar</CardTitle>
            <CardDescription>
              Estas acciones no tienen fechas definidas y no aparecen en el cronograma.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {cronograma.porProgramar.map((accion) => (
                <li key={accion.id} className="flex flex-wrap items-center gap-2">
                  <Link
                    to="/roadmap/$accion"
                    params={{ accion: accion.id }}
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    {accion.titulo}
                  </Link>
                  <Badge variant="outline">{accion.responsable || "Sin responsable"}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
