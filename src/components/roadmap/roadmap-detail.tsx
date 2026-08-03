import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StateBadge } from "./state-badge";
import { clasesNivelPrioridad } from "@/components/resultados/priority-card";
import { calcularAvance } from "@/lib/roadmap/avance";
import { alertasDeAccion } from "@/lib/roadmap/alertas";
import { dependenciasDe, etiquetaEstado, transicionesDe } from "@/lib/roadmap/estados";
import { etiquetaFase, fasesRoadmap } from "@/lib/roadmap/fases";
import { formatearFecha, formatearFechaHora } from "@/lib/roadmap/fechas";
import { etiquetaEsfuerzo } from "@/lib/resultados/fichas";
import type { useRoadmap } from "@/hooks/use-roadmap";
import type {
  AccionRoadmap,
  EstadoAccionRoadmap,
  FaseId,
  RegistroAvance,
  Roadmap,
  TipoBloqueo,
  TipoEvidencia,
} from "@/lib/roadmap/tipos";
import type { NivelPrioridad } from "@/lib/resultados/tipos";
import { AlertTriangle, History, Info } from "lucide-react";

type OperacionesRoadmap = ReturnType<typeof useRoadmap>["acciones"];

const etiquetaTipoBloqueo: Record<TipoBloqueo, string> = {
  recurso: "Falta de recursos",
  decision: "Decisión pendiente",
  dependencia: "Depende de otra acción",
  tecnico: "Impedimento técnico",
  otro: "Otro motivo",
};

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
 * Detalle de ejecución de una acción (POC-06, 12 a 14): estado, checklist,
 * planificación, bloqueos, evidencias, notas e historial.
 */
export function RoadmapDetail({
  roadmap,
  accion,
  historial,
  operaciones,
}: {
  roadmap: Roadmap;
  accion: AccionRoadmap;
  historial: RegistroAvance[];
  operaciones: OperacionesRoadmap;
}) {
  const [comentario, setComentario] = useState("");
  const [nota, setNota] = useState("");
  const [motivoBloqueo, setMotivoBloqueo] = useState("");
  const [tipoBloqueo, setTipoBloqueo] = useState<TipoBloqueo>("recurso");
  const [motivoDescarte, setMotivoDescarte] = useState("");
  const [avanceManual, setAvanceManual] = useState(accion.avance);
  const [evidencia, setEvidencia] = useState({
    tipo: "enlace" as TipoEvidencia,
    descripcion: "",
    referencia: "",
  });
  const [planificacion, setPlanificacion] = useState({
    responsable: accion.responsable,
    fechaInicio: accion.fechaInicio ?? "",
    fechaObjetivo: accion.fechaObjetivo ?? "",
    prioridadOperativa: accion.prioridadOperativa,
  });
  const [confirmarCierre, setConfirmarCierre] = useState(false);

  const avance = calcularAvance(accion);
  const alertas = alertasDeAccion(roadmap, accion);
  const dependencias = dependenciasDe(roadmap, accion);
  const bloqueoAbierto = roadmap.bloqueos.find(
    (b) => b.accionId === accion.id && b.estado === "abierto"
  );
  const transiciones = transicionesDe(accion.estado).filter(
    (estado) => estado !== "BLOQUEADA" && estado !== "DESCARTADA"
  );

  const intentarEstado = (estado: EstadoAccionRoadmap) => {
    const salida = operaciones.cambiarEstado(accion.id, estado, {
      ...(comentario ? { comentario } : {}),
    });
    if (!salida.ok && salida.requiereConfirmacion) {
      setConfirmarCierre(true);
      return;
    }
    if (salida.ok) setComentario("");
  };

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
            <CardTitle className="text-base">Pasos sugeridos</CardTitle>
            <CardDescription>
              Marcar pasos actualiza el avance automáticamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {accion.checklist.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Esta acción no tiene pasos definidos: informa el avance manualmente.
                </p>
                <div className="flex items-center gap-3">
                  <Slider
                    value={[avanceManual]}
                    min={0}
                    max={100}
                    step={25}
                    onValueChange={(valores) => setAvanceManual(valores[0] ?? 0)}
                    aria-label="Avance declarado"
                  />
                  <span className="w-12 text-sm">{avanceManual}%</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => operaciones.actualizarAvance(accion.id, avanceManual)}
                  >
                    Guardar
                  </Button>
                </div>
              </div>
            ) : (
              <ul className="space-y-2">
                {accion.checklist.map((paso) => (
                  <li key={paso.id} className="flex items-start gap-2">
                    <Checkbox
                      id={paso.id}
                      checked={paso.completado}
                      onCheckedChange={() => operaciones.alternarPaso(accion.id, paso.id)}
                      disabled={accion.estado === "DESCARTADA"}
                    />
                    <Label htmlFor={paso.id} className="text-sm font-normal leading-snug">
                      {paso.texto}
                    </Label>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Actualizar estado</CardTitle>
            <CardDescription>
              Cada cambio queda registrado en el historial de la acción.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={comentario}
              onChange={(evento) => setComentario(evento.target.value)}
              placeholder="Comentario opcional (obligatorio al pausar)"
              rows={2}
            />
            <div className="flex flex-wrap gap-2">
              {transiciones.map((estado) => (
                <Button
                  key={estado}
                  size="sm"
                  variant={estado === "COMPLETADA" ? "default" : "outline"}
                  onClick={() => intentarEstado(estado)}
                >
                  {etiquetaEstado[estado]}
                </Button>
              ))}
              {transiciones.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No hay transiciones disponibles desde este estado.
                </p>
              )}
            </div>

            {bloqueoAbierto ? (
              <div className="space-y-2 rounded-md border border-destructive/40 p-3">
                <p className="text-sm font-medium">Bloqueo activo</p>
                <p className="text-sm text-muted-foreground">{bloqueoAbierto.descripcion}</p>
                <Input
                  value={motivoBloqueo}
                  onChange={(evento) => setMotivoBloqueo(evento.target.value)}
                  placeholder="¿Cómo se resolvió el bloqueo?"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    const salida = operaciones.desbloquear(accion.id, motivoBloqueo);
                    if (salida.ok) setMotivoBloqueo("");
                  }}
                >
                  Reanudar acción
                </Button>
              </div>
            ) : (
              accion.estado !== "COMPLETADA" &&
              accion.estado !== "DESCARTADA" && (
                <div className="space-y-2 rounded-md border p-3">
                  <p className="text-sm font-medium">Registrar bloqueo</p>
                  <Select
                    value={tipoBloqueo}
                    onValueChange={(valor) => setTipoBloqueo(valor as TipoBloqueo)}
                  >
                    <SelectTrigger aria-label="Tipo de bloqueo">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(etiquetaTipoBloqueo) as TipoBloqueo[]).map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>
                          {etiquetaTipoBloqueo[tipo]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea
                    value={motivoBloqueo}
                    onChange={(evento) => setMotivoBloqueo(evento.target.value)}
                    placeholder="Describe el impedimento (obligatorio)"
                    rows={2}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const salida = operaciones.bloquear(accion.id, tipoBloqueo, motivoBloqueo);
                      if (salida.ok) setMotivoBloqueo("");
                    }}
                  >
                    Marcar como bloqueada
                  </Button>
                </div>
              )
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Notas y evidencias</CardTitle>
            <CardDescription>
              La evidencia respalda el cierre de la acción y queda en el historial.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Textarea
                value={nota}
                onChange={(evento) => setNota(evento.target.value)}
                placeholder="Escribe una nota de seguimiento"
                rows={2}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const salida = operaciones.agregarNota(accion.id, nota);
                  if (salida.ok) setNota("");
                }}
              >
                Agregar nota
              </Button>
            </div>

            {accion.notas.length > 0 && (
              <ul className="space-y-2 text-sm">
                {accion.notas.map((registro) => (
                  <li key={registro.id} className="rounded-md border p-2">
                    <p>{registro.texto}</p>
                    <p className="text-xs text-muted-foreground">
                      {registro.autor} · {formatearFechaHora(registro.fecha)}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            <div className="grid gap-2 sm:grid-cols-3">
              <Select
                value={evidencia.tipo}
                onValueChange={(valor) =>
                  setEvidencia((actual) => ({ ...actual, tipo: valor as TipoEvidencia }))
                }
              >
                <SelectTrigger aria-label="Tipo de evidencia">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enlace">Enlace</SelectItem>
                  <SelectItem value="archivo">Archivo</SelectItem>
                  <SelectItem value="nota">Nota</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={evidencia.descripcion}
                onChange={(evento) =>
                  setEvidencia((actual) => ({ ...actual, descripcion: evento.target.value }))
                }
                placeholder="Descripción"
              />
              <Input
                value={evidencia.referencia}
                onChange={(evento) =>
                  setEvidencia((actual) => ({ ...actual, referencia: evento.target.value }))
                }
                placeholder="Enlace o nombre del archivo"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const salida = operaciones.agregarEvidencia(
                  accion.id,
                  evidencia.tipo,
                  evidencia.descripcion,
                  evidencia.referencia
                );
                if (salida.ok) setEvidencia({ tipo: "enlace", descripcion: "", referencia: "" });
              }}
            >
              Registrar evidencia
            </Button>

            {accion.evidencias.length > 0 && (
              <ul className="space-y-2 text-sm">
                {accion.evidencias.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2"
                  >
                    <span>
                      {item.descripcion}{" "}
                      <span className="text-xs text-muted-foreground">({item.referencia})</span>
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => operaciones.eliminarEvidencia(accion.id, item.id)}
                    >
                      Quitar
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Planificación</CardTitle>
            <CardDescription>
              Cambiar la fecha objetivo desplaza las acciones que dependen de esta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="detalle-responsable">Responsable</Label>
              <Input
                id="detalle-responsable"
                value={planificacion.responsable}
                placeholder={accion.responsableSugerido}
                onChange={(evento) =>
                  setPlanificacion((actual) => ({ ...actual, responsable: evento.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="detalle-inicio">Fecha de inicio</Label>
              <Input
                id="detalle-inicio"
                type="date"
                value={planificacion.fechaInicio}
                onChange={(evento) =>
                  setPlanificacion((actual) => ({ ...actual, fechaInicio: evento.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="detalle-objetivo">Fecha objetivo</Label>
              <Input
                id="detalle-objetivo"
                type="date"
                value={planificacion.fechaObjetivo}
                onChange={(evento) =>
                  setPlanificacion((actual) => ({ ...actual, fechaObjetivo: evento.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="detalle-prioridad">Prioridad operativa</Label>
              <Select
                value={planificacion.prioridadOperativa}
                onValueChange={(valor) =>
                  setPlanificacion((actual) => ({
                    ...actual,
                    prioridadOperativa: valor as NivelPrioridad,
                  }))
                }
              >
                <SelectTrigger id="detalle-prioridad">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critica">Crítica</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="baja">Baja</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Prioridad sugerida por el diagnóstico: {accion.prioridadOrigenLabel}.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() =>
                operaciones.actualizarPlanificacion(accion.id, {
                  responsable: planificacion.responsable,
                  fechaInicio: planificacion.fechaInicio || null,
                  fechaObjetivo: planificacion.fechaObjetivo || null,
                  prioridadOperativa: planificacion.prioridadOperativa,
                })
              }
            >
              Guardar planificación
            </Button>

            <div className="space-y-1.5 border-t pt-3">
              <Label htmlFor="detalle-fase">Fase</Label>
              <Select
                value={accion.faseId}
                onValueChange={(valor) => operaciones.moverAFase(accion.id, valor as FaseId)}
              >
                <SelectTrigger id="detalle-fase">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fasesRoadmap.map((fase) => (
                    <SelectItem key={fase.id} value={fase.id}>
                      {fase.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Origen y dependencias</CardTitle>
            <CardDescription>Trazabilidad hacia el diagnóstico (POC-04 y POC-05).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <span className="text-muted-foreground">Dimensión: </span>
              {accion.origen.dimensionNombre}
            </p>
            <p>
              <span className="text-muted-foreground">Hallazgo: </span>
              {accion.origen.hallazgoTitulo}
            </p>
            <p className="text-xs text-muted-foreground">
              Reglas: {accion.origen.reglas.join(", ") || "sin reglas registradas"} · Preguntas:{" "}
              {accion.origen.preguntas.join(", ") || "sin preguntas registradas"}
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link to="/plan-de-accion/$accion" params={{ accion: accion.fichaAccionId }}>
                Ver ficha de acción
              </Link>
            </Button>

            {dependencias.length > 0 && (
              <ul className="space-y-1 border-t pt-3 text-sm">
                {dependencias.map((dependencia) => (
                  <li key={dependencia.accionId} className="flex items-center justify-between gap-2">
                    <Link
                      to="/roadmap/$accion"
                      params={{ accion: dependencia.accionId }}
                      className="underline-offset-2 hover:underline"
                    >
                      {dependencia.titulo}
                    </Link>
                    <StateBadge estado={dependencia.estado} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" aria-hidden="true" />
              Historial
            </CardTitle>
            <CardDescription>Registro cronológico de la ejecución.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              {historial.map((registro) => (
                <li key={registro.id} className="border-l-2 pl-3">
                  <p className="font-medium">{etiquetaRegistro[registro.tipo]}</p>
                  {registro.comentario && (
                    <p className="text-muted-foreground">{registro.comentario}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {registro.usuario} · {formatearFechaHora(registro.fecha)}
                  </p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {accion.estado !== "DESCARTADA" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Descartar acción</CardTitle>
              <CardDescription>
                La acción se conserva en el registro con el motivo indicado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea
                value={motivoDescarte}
                onChange={(evento) => setMotivoDescarte(evento.target.value)}
                placeholder="Motivo del descarte (obligatorio)"
                rows={2}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const salida = operaciones.descartar(accion.id, motivoDescarte);
                  if (salida.ok) setMotivoDescarte("");
                }}
              >
                Descartar
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={confirmarCierre} onOpenChange={setConfirmarCierre}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Marcar la acción como completada?</AlertDialogTitle>
            <AlertDialogDescription>
              Se marcarán todos los pasos como cumplidos y el avance quedará en 100%. Podrás
              reabrirla si es necesario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                operaciones.cambiarEstado(accion.id, "COMPLETADA", {
                  confirmado: true,
                  ...(comentario ? { comentario } : {}),
                });
                setComentario("");
                setConfirmarCierre(false);
              }}
            >
              Completar acción
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
