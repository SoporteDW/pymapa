import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SerieTendencia } from "@/lib/dashboard/tipos";

/**
 * KPI-08/KPI-09: tendencia con SVG ligero (sin dependencias de gráficos) y
 * tabla alternativa siempre visible para lectura no visual (POC-07, CA-10).
 */
export function TrendChart({ serie }: { serie: SerieTendencia }) {
  const puntos = serie.puntos;
  const maximo = Math.max(...puntos.map((p) => p.value), 1);
  const ancho = 100;
  const alto = 36;
  const coordenadas = puntos.map((punto, indice) => {
    const x = puntos.length === 1 ? ancho / 2 : (indice / (puntos.length - 1)) * ancho;
    const y = alto - (punto.value / maximo) * (alto - 4) - 2;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{serie.titulo}</CardTitle>
        <CardDescription>{serie.nota}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {serie.status === "sin_datos" || puntos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin información disponible</p>
        ) : (
          <>
            <svg
              viewBox={`0 0 ${ancho} ${alto}`}
              className="h-24 w-full text-primary"
              preserveAspectRatio="none"
              role="img"
              aria-label={`${serie.titulo}. ${puntos
                .map((p) => `${p.etiqueta}: ${p.value}`)
                .join("; ")}`}
            >
              <polyline
                points={coordenadas.join(" ")}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
              {coordenadas.map((coordenada, indice) => {
                const [x, y] = coordenada.split(",");
                return (
                  <circle
                    key={`${serie.metricId}-${indice}`}
                    cx={x}
                    cy={y}
                    r="1.4"
                    fill="currentColor"
                  />
                );
              })}
            </svg>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {puntos.map((punto, indice) => (
                <li key={`${punto.date}-${indice}`} className={cn("tabular-nums")}>
                  <span className="text-foreground">{punto.etiqueta}</span>: {punto.value}
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
