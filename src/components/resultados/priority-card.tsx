import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ConfidenceBadge } from "./confidence-badge";
import { nivelConfianzaPrioridad } from "@/lib/resultados/priorizacion";
import type { NivelPrioridad, PrioridadVista } from "@/lib/resultados/tipos";
import { Link2, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";

export const clasesNivelPrioridad: Record<NivelPrioridad, string> = {
  critica: "bg-destructive/10 text-destructive border-destructive/20",
  alta: "bg-warning/15 text-foreground border-warning/40",
  media: "bg-info/15 text-foreground border-info/40",
  baja: "bg-muted text-muted-foreground border-border",
};

interface PriorityCardProps {
  prioridad: PrioridadVista;
  posicion: number;
  acciones?: ReactNode;
}

/** PriorityCard (POC-05, 7 y 9): prioridad, justificación e impacto explicables. */
export function PriorityCard({ prioridad, posicion, acciones }: PriorityCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {posicion}
            </span>
            <div>
              <CardTitle className="text-base">{prioridad.titulo}</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">{prioridad.dimensionNombre}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={clasesNivelPrioridad[prioridad.level]}>
              Prioridad {prioridad.levelLabel.toLowerCase()}
            </Badge>
            <ConfidenceBadge nivel={nivelConfianzaPrioridad(prioridad)} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { etiqueta: "Impacto", valor: `${prioridad.variables.impact}/5` },
            { etiqueta: "Urgencia", valor: `${prioridad.variables.urgency}/5` },
            { etiqueta: "Riesgo", valor: `${prioridad.variables.risk}/5` },
            { etiqueta: "Esfuerzo", valor: `${prioridad.variables.effort}/5` },
            { etiqueta: "Dependencia", valor: `${prioridad.variables.dependency}/2` },
            { etiqueta: "Puntaje", valor: prioridad.score.toFixed(2) },
          ].map((item) => (
            <div key={item.etiqueta} className="rounded-lg border border-border p-2 text-center">
              <p className="text-xs text-muted-foreground">{item.etiqueta}</p>
              <p className="text-sm font-semibold text-foreground">{item.valor}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="text-xs font-medium text-foreground">Por qué recibió esta clasificación</p>
          <p className="text-sm text-muted-foreground">{prioridad.rationale}</p>
        </div>

        {prioridad.ajustes.length > 0 && (
          <ul className="space-y-1 text-sm text-muted-foreground">
            {prioridad.ajustes.map((ajuste) => (
              <li key={ajuste} className="flex gap-2">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                {ajuste}
              </li>
            ))}
          </ul>
        )}

        {prioridad.desbloquea.length > 0 && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            Habilita {prioridad.desbloquea.length} acción
            {prioridad.desbloquea.length === 1 ? "" : "es"} dependiente
            {prioridad.desbloquea.length === 1 ? "" : "s"}.
          </p>
        )}

        {acciones && (
          <>
            <Separator />
            <div className="flex flex-wrap gap-2">{acciones}</div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
