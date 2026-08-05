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

/** ActionCard (POC-05, 8 y 9): resumen de una Ficha de Acción. */
export function ActionCard({ ficha }: { ficha: FichaAccion }) {
  const puntos = puntosApoyoDeFicha(ficha);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <Badge variant="outline" className={clasesNivelPrioridad[ficha.priorityLevel]}>
            Prioridad {ficha.priorityLabel.toLowerCase()}
          </Badge>
          <ConfidenceBadge nivel={ficha.nivelConfianza} />
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
          {ficha.requiereValidacion && (
            <Badge variant="outline" className="rounded-full">
              Requiere validación
            </Badge>
          )}
        </div>
        <PuntosApoyoLista puntos={puntos} />
        <SolicitarColaboracionDialog accionId={ficha.id} accionTitulo={ficha.title} />
        <Button variant="outline" size="sm" asChild>
          <Link to="/plan-de-accion/$accion" params={{ accion: ficha.id }}>
            Abrir ficha
            <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

