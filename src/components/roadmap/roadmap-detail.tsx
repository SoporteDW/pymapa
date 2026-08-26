import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StateBadge } from "./state-badge";
import { clasesNivelPrioridad } from "@/components/resultados/priority-card";
import { calcularAvance } from "@/lib/roadmap/avance";
import { alertasDeAccion } from "@/lib/roadmap/alertas";
import { dependenciasDe } from "@/lib/roadmap/estados";
import { etiquetaFase } from "@/lib/roadmap/fases";
import { formatearFecha, formatearFechaHora } from "@/lib/roadmap/fechas";
import { etiquetaEsfuerzo } from "@/lib/resultados/fichas";
import type { AccionRoadmap, RegistroAvance, Roadmap } from "@/lib/roadmap/tipos";
import { AlertTriangle, History, Info } from "lucide-react";

const etiquetaRegistro: Record<RegistroAvance["tipo"], string> = {
  creacion: "Creación",
  cambio_estado: "Cambio de estado",
  avance: "Actualización de avance",
  responsable: "Responsable",
  bloqueo: "Bloqueo",
  nota: "Nota",
  evidencia: "Evidencia",
  reprogramacion: "Reprogramación",
  fase: "Cambio de fase",
  descarte: "Descarte",
};

/**
 * Vista de CONSULTA de una Actividad dentro del Roadmap.
 *
 * El Roadmap ya no gestiona ejecución: el Workspace es la única fuente de
 * verdad. Aquí solo se lee la proyección (estado, avance, fechas, alertas,
 * historial) y el único llamado a la acción lleva a la Actividad real.
 */
export function RoadmapDetail({
  roadmap,
  accion,
  historial,
}: {
  roadmap: Roadmap;
  accion: AccionRoadmap;
  historial: RegistroAvance[];
}) {
  const avance = calcularAvance(accion);
  const alertas = alertasDeAccion(roadmap, accion);
  const dependencias = dependenciasDe(roadmap, accion);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <CardHeader className="gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <StateBadge estado={accion.estado} />
              <Badge variant="outline" className={clasesNivelPrioridad[accion.prioridadOperativa]}>
                Prioridad {accion.prioridadOperativa}
              </Badge>
              <Badge variant="secondary">{etiquetaFase[accion.faseId]}</Badge>
              <Badge variant="outline">
                Esfuerzo {etiquetaEsfuerzo(accion.esfuerzo).toLowerCase()}
              </Badge>
              <Badge variant="outline">Vista de consulta</Badge>
            </div>
            <CardTitle className="text-xl">{accion.titulo}</CardTitle>
            <CardDescription>{accion.objetivo}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{accion.porQueImporta}</p>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Avance</span>
                <span className="font-semibold">{avance}%</span>
              </div>
              <Progress value={avance} aria-label={`Avance ${avance} por ciento`} />
              <p className="text-xs text-muted-foreground">
                El estado y el avance se toman de la ejecución real de la Actividad en tu Plan de
                Acción: esta vista no los modifica.
              </p>
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Responsable</p>
                <p>{accion.responsable || "Sin asignar"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Inicio</p>
                <p>{formatearFecha(accion.fechaInicio)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fecha objetivo</p>
                <p>{formatearFecha(accion.fechaObjetivo)}</p>
              </div>
            </div>
            <Button variant="outline" asChild>
              <Link
                to="/plan-de-accion/workspace/$actividad"
                params={{ actividad: accion.fichaAccionId || accion.id }}
              >
                Abrir esta actividad en mi Plan de Acción
              </Link>
            </Button>
          </CardContent>
        </Card>

        {alertas.length > 0 && (
          <div className="space-y-2">
            {alertas.map((alerta) => (
              <Alert
                key={alerta.tipo}
                variant={alerta.severidad === "critica" ? "destructive" : "default"}
              >
                {alerta.severidad === "critica" ? (
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Info className="h-4 w-4" aria-hidden="true" />
                )}
                <AlertTitle>{alerta.titulo}</AlertTitle>
                <AlertDescription>{alerta.detalle}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pasos previstos</CardTitle>
            <CardDescription>
              Se ejecutan y se marcan dentro de la Actividad, en tu Plan de Acción.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {accion.checklist.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Esta actividad no declara pasos en la vista de tiempo.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {accion.checklist.map((paso) => (
                  <li key={paso.id} className="flex items-start gap-2">
                    <span
                      className={
                        paso.completado
                          ? "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success"
                          : "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50"
                      }
                      aria-hidden="true"
                    />
                    <span className={paso.completado ? "text-muted-foreground" : ""}>
                      {paso.texto}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {(accion.notas.length > 0 || accion.evidencias.length > 0) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Notas y evidencias registradas</CardTitle>
              <CardDescription>Registro histórico, en solo lectura.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {accion.notas.map((registro) => (
                <div key={registro.id} className="rounded-md border p-2">
                  <p>{registro.texto}</p>
                  <p className="text-xs text-muted-foreground">
                    {registro.autor} · {formatearFechaHora(registro.fecha)}
                  </p>
                </div>
              ))}
              {accion.evidencias.map((item) => (
                <div key={item.id} className="rounded-md border p-2">
                  {item.descripcion}{" "}
                  <span className="text-xs text-muted-foreground">({item.referencia})</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dependencias</CardTitle>
            <CardDescription>Qué debe ocurrir antes de esta actividad.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {dependencias.length === 0 ? (
              <p className="text-muted-foreground">No depende de otras actividades.</p>
            ) : (
              dependencias.map((dep) => (
                <div key={dep.accionId} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate">{dep.titulo}</span>
                  <StateBadge estado={dep.estado} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4 text-primary" aria-hidden="true" />
              Historial
            </CardTitle>
            <CardDescription>Trazabilidad de la actividad en el tiempo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {historial.length === 0 ? (
              <p className="text-muted-foreground">Sin registros todavía.</p>
            ) : (
              historial
                .slice()
                .reverse()
                .map((registro) => (
                  <div key={registro.id} className="rounded-md border p-2">
                    <p className="font-medium">{etiquetaRegistro[registro.tipo]}</p>
                    <p className="text-muted-foreground">{registro.comentario}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatearFechaHora(registro.fecha)}
                    </p>
                  </div>
                ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
