import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Link } from "@tanstack/react-router";
import { ConfidenceBadge } from "./confidence-badge";
import type { DimensionResultVista } from "@/lib/resultados/tipos";
import { ArrowRight } from "lucide-react";

/** DimensionScoreCard (POC-05, 6.3 y 9). Sin tendencia histórica en el MVP Alfa. */
export function DimensionScoreCard({ dimension }: { dimension: DimensionResultVista }) {
  const brechas = dimension.brechas.length + dimension.riesgos.length;
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{dimension.nombre}</CardTitle>
          <Badge variant="secondary">{dimension.maturityLabel}</Badge>
        </div>
        <CardDescription>{dimension.interpretation}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <Progress
            value={dimension.score}
            aria-label={`${dimension.nombre}: ${dimension.score} de 100`}
          />
          <span className="text-sm font-semibold text-foreground">{Math.round(dimension.score)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <ConfidenceBadge nivel={dimension.nivelConfianza} />
          <span>
            {dimension.fortalezas.length} fortaleza{dimension.fortalezas.length === 1 ? "" : "s"}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {brechas} aspecto{brechas === 1 ? "" : "s"} por resolver
          </span>
          {dimension.parcial && <Badge variant="outline">Lectura parcial</Badge>}
        </div>
        <Button variant="link" className="px-0" asChild>
          <Link to="/resultados/$dimension" params={{ dimension: dimension.dimensionId }}>
            Ver detalle
            <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
