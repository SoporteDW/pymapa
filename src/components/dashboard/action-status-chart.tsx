import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import type { CumplimientoFechas, ItemDistribucionEstado } from "@/lib/dashboard/tipos";

const RELLENO: Record<string, string> = {
  PENDIENTE: "bg-muted-foreground/40",
  LISTA: "bg-primary/50",
  EN_CURSO: "bg-primary",
  PAUSADA: "bg-amber-500",
  BLOQUEADA: "bg-destructive",
  COMPLETADA: "bg-emerald-600",
  DESCARTADA: "bg-muted-foreground/20",
};

/**
 * KPI-03: distribución por estado como barras accesibles. Cada barra incluye
 * etiqueta y valor textual, de modo que no depende del color (POC-07, CA-10).
 */
export function ActionStatusChart({
  distribucion,
  total,
}: {
  distribucion: ItemDistribucionEstado[];
  total: number;
}) {
  const visibles = distribucion.filter((item) => item.cantidad > 0);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Acciones por estado</CardTitle>
        <CardDescription>
          {total === 0
            ? "Sin información disponible"
            : `${total} acción(es) consideradas con los filtros actuales.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {visibles.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin información disponible</p>
        ) : (
          <ul className="space-y-3">
            {visibles.map((item) => (
              <li key={item.estado} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{item.etiqueta}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {item.cantidad} · {item.porcentaje}%
                  </span>
                </div>
                <div
                  className="h-2 w-full overflow-hidden rounded-full bg-muted"
                  role="img"
                  aria-label={`${item.etiqueta}: ${item.cantidad} acciones, ${item.porcentaje} por ciento`}
                >
                  <div
                    className={cn("h-full rounded-full", RELLENO[item.estado])}
                    style={{ width: `${item.porcentaje}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        <Button variant="link" className="h-auto px-0" asChild>
          <Link to="/roadmap">
            Ver el Roadmap (consulta)
            <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

/** KPI-05: distribución de cumplimiento de fechas en formato de lista. */
export function DateComplianceCard({ cumplimiento }: { cumplimiento: CumplimientoFechas }) {
  const filas = [
    { etiqueta: "A tiempo", valor: cumplimiento.aTiempo },
    { etiqueta: "Vencidas", valor: cumplimiento.vencidas },
    { etiqueta: "Próximas a vencer (7 días)", valor: cumplimiento.proximas },
    { etiqueta: "Sin fecha objetivo", valor: cumplimiento.sinFecha },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Cumplimiento de fechas</CardTitle>
        <CardDescription>
          {cumplimiento.porcentajeATiempo === null
            ? "Sin información disponible: ninguna acción activa tiene fecha objetivo."
            : `${cumplimiento.porcentajeATiempo}% de las acciones con fecha están a tiempo.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {filas.map((fila) => (
            <div key={fila.etiqueta} className="rounded-lg border border-border p-3">
              <dt className="text-muted-foreground">{fila.etiqueta}</dt>
              <dd className="text-lg font-semibold tabular-nums text-foreground">{fila.valor}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
