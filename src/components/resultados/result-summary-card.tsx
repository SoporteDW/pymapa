import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ConfidenceBadge } from "./confidence-badge";
import type { ResultadoPyme } from "@/lib/resultados/tipos";
import { ArrowRight, Sparkles, Target } from "lucide-react";
import type { ReactNode } from "react";

interface ResultSummaryCardProps {
  resultado: ResultadoPyme;
  accionPrimaria?: ReactNode;
}

/** ResultSummaryCard (POC-05, 6.2 y 9): puntaje global, madurez y mensaje principal. */
export function ResultSummaryCard({ resultado, accionPrimaria }: ResultSummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">Resumen ejecutivo</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{resultado.maturityLabel}</Badge>
            <ConfidenceBadge nivel={resultado.nivelConfianza} valor={resultado.confidence} />
          </div>
        </div>
        <CardDescription>{resultado.summary.mensajePrincipal}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Nivel digital general</p>
            <p className="text-3xl font-bold text-foreground">
              {Math.round(resultado.overallScore)} de 100
            </p>
            <p className="text-sm text-muted-foreground">{resultado.maturityInterpretation}</p>
          </div>
          <div className="flex-1 sm:max-w-sm">
            <Progress
              value={resultado.overallScore}
              aria-label={`Nivel digital general: ${resultado.overallScore} de 100`}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border p-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-success" aria-hidden="true" />
              Fortaleza destacada
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {resultado.summary.fortalezaDestacada?.title ??
                "Aún no se identifican fortalezas consolidadas con la evidencia disponible."}
            </p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Target className="h-4 w-4 text-primary" aria-hidden="true" />
              Brecha principal
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {resultado.summary.brechaPrincipal?.title ??
                "No se detectaron brechas relevantes en esta lectura."}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{resultado.summary.siguientePaso}</p>
          {accionPrimaria ?? (
            <Button size="sm" variant="outline">
              Ver mis prioridades
              <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
