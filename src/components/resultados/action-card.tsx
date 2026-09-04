import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@tanstack/react-router";
import { ConfidenceBadge } from "./confidence-badge";
import { clasesNivelPrioridad } from "./priority-card";
import { PuntosApoyoLista } from "@/components/apoyo/punto-apoyo-badge";
import { SolicitarColaboracionDialog } from "@/components/colaboracion/solicitar-colaboracion-dialog";
import { puntosApoyoDeFicha } from "@/lib/apoyo/puntos-apoyo";
import { etiquetaEsfuerzo } from "@/lib/resultados/fichas";
import type { FichaAccion } from "@/lib/resultados/tipos";
import { ArrowRight, Clock, Gauge, UserRound } from "lucide-react";

import { CheckCircle2 } from "lucide-react";
import type { EstadoEjecucion } from "@/lib/workspace/tipos";

/**
 * ActionCard (POC-05, 8 y 9): resumen de una Actividad del Plan.
 *
 * `estado` es solo lectura del estado de ejecución que gobierna el Workspace.
 * Una Actividad validada se muestra cerrada: sin colaboración ni acciones de
 * ejecución, y con acceso de consulta a su historial.
 */
export function ActionCard({
  ficha,
  estado,
  esSiguiente = false,
}: {
  ficha: FichaAccion;
  estado?: EstadoEjecucion | undefined;
  esSiguiente?: boolean;
}) {
  const puntos = puntosApoyoDeFicha(ficha);
  const validada = estado === "validado";

  return (
    <Card className={validada ? "flex h-full flex-col border-success/40 bg-success/5" : "flex h-full flex-col"}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          {validada ? (
            <Badge variant="outline" className="rounded-full border-success/50 text-success">
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              Actividad validada
            </Badge>
          ) : (
            <Badge variant="outline" className={clasesNivelPrioridad[ficha.priorityLevel]}>
              Prioridad {ficha.priorityLabel.toLowerCase()}
            </Badge>
          )}
          {esSiguiente && !validada ? (
            <Badge variant="secondary" className="rounded-full">
              Ahora
            </Badge>
          ) : (
            <ConfidenceBadge nivel={ficha.nivelConfianza} />
          )}
        </div>
        <CardTitle className="text-base">{ficha.title}</CardTitle>
        <CardDescription>{ficha.problem}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto space-y-3">
        <p className="text-sm text-muted-foreground">{ficha.impactExpected}</p>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
            Esfuerzo {etiquetaEsfuerzo(ficha.effort).toLowerCase()}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {ficha.duration}
          </span>
          <span className="inline-flex items-center gap-1">
            <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
            {ficha.ownerRole}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="rounded-full">
            {ficha.dimensionNombre}
          </Badge>
          {ficha.requiereValidacion && !validada && (
            <Badge variant="outline" className="rounded-full">
              Requiere validación
            </Badge>
          )}
        </div>

        {validada ? (
          <>
            <p className="text-xs text-muted-foreground">
              Quedó cerrada con su entrega, sus criterios y su historial disponibles para consulta.
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link to="/plan-de-accion/workspace/$actividad" params={{ actividad: ficha.id }}>
                Ver actividad cerrada
                <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </>
        ) : (
          <>
            <PuntosApoyoLista puntos={puntos} />
            <SolicitarColaboracionDialog accionId={ficha.id} accionTitulo={ficha.title} />
            <Button variant={esSiguiente ? "default" : "outline"} size="sm" asChild>
              <Link to="/plan-de-accion/$accion" params={{ accion: ficha.id }}>
                {esSiguiente ? "Abrir esta Actividad" : "Abrir ficha"}
                <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

