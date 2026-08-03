import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfidenceBadge } from "./confidence-badge";
import type { HallazgoVista, TipoHallazgoVista } from "@/lib/resultados/tipos";
import { AlertTriangle, Lightbulb, Sparkles, TrendingDown } from "lucide-react";

const configuracion: Record<
  TipoHallazgoVista,
  { titulo: string; icono: typeof Sparkles; color: string; vacio: string }
> = {
  fortaleza: {
    titulo: "Lo que ya funciona",
    icono: Sparkles,
    color: "text-success",
    vacio: "Aún no se identifican prácticas consolidadas con la evidencia disponible.",
  },
  brecha: {
    titulo: "Brechas que limitan el avance",
    icono: TrendingDown,
    color: "text-primary",
    vacio: "No se detectaron brechas relevantes en esta lectura.",
  },
  riesgo: {
    titulo: "Riesgos de no actuar",
    icono: AlertTriangle,
    color: "text-destructive",
    vacio: "No se detectaron riesgos relevantes en esta lectura.",
  },
  oportunidad: {
    titulo: "Oportunidades de mejora",
    icono: Lightbulb,
    color: "text-info",
    vacio: "No se identificaron oportunidades adicionales en esta lectura.",
  },
};

interface FindingListProps {
  tipo: TipoHallazgoVista;
  hallazgos: HallazgoVista[];
  compacto?: boolean;
}

/** FindingList (POC-05, 6.3 y 9): agrupa fortalezas, brechas, riesgos y oportunidades. */
export function FindingList({ tipo, hallazgos, compacto = false }: FindingListProps) {
  const config = configuracion[tipo];
  const Icono = config.icono;

  return (
    <Card>
      <CardHeader className={compacto ? "pb-3" : undefined}>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icono className={`h-5 w-5 ${config.color}`} aria-hidden="true" />
          {config.titulo}
          <Badge variant="outline">{hallazgos.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hallazgos.length === 0 ? (
          <p className="text-sm text-muted-foreground">{config.vacio}</p>
        ) : (
          <ul className="space-y-3">
            {hallazgos.map((hallazgo) => (
              <li key={hallazgo.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{hallazgo.title}</p>
                  <ConfidenceBadge nivel={hallazgo.nivelConfianza} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{hallazgo.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {hallazgo.dimensionNombre}
                  {hallazgo.capacidadNombre ? ` · ${hallazgo.capacidadNombre}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
