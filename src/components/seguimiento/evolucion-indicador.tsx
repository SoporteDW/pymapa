import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PuntoEvolucion } from "@/lib/seguimiento/servicio";
import type { IndicadorSeguimiento } from "@/lib/seguimiento/tipos";
import { LineChart as LineChartIcon } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface EvolucionIndicadorProps {
  puntos: PuntoEvolucion[];
  indicador: IndicadorSeguimiento;
}

/**
 * Macroentrega 5.2 · Evolución del indicador: línea base → 30 → 60 → 90 días.
 * Los checkpoints todavía no medidos se muestran como pendientes, sin inventar
 * valores ni proyecciones.
 */
export function EvolucionIndicador({ puntos, indicador }: EvolucionIndicadorProps) {
  const datos = puntos.map((p) => ({ etiqueta: p.etiqueta, valor: p.valor }));
  const pendientes = puntos.filter((p) => p.pendiente).map((p) => p.etiqueta);
  const medidos = puntos.filter((p) => !p.pendiente).length;

  return (
    <Card>
      <CardHeader className="space-y-1.5">
        <CardTitle className="flex items-center gap-2 text-base">
          <LineChartIcon className="h-5 w-5 text-primary" aria-hidden="true" />
          Evolución de {indicador.nombre}
        </CardTitle>
        <CardDescription>
          Cómo se ha movido el indicador desde la línea base. Los puntos sin medición aparecen como
          pendientes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {medidos >= 1 ? (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={datos} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="etiqueta" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip
                  formatter={(valor: number | null) =>
                    valor === null ? "pendiente" : `${valor}${indicador.unidad}`
                  }
                />
                {indicador.meta !== null && (
                  <ReferenceLine
                    y={indicador.meta}
                    strokeDasharray="4 4"
                    className="stroke-primary"
                    label={{ value: "Meta", fontSize: 11, position: "insideTopRight" }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="valor"
                  connectNulls
                  strokeWidth={2}
                  className="stroke-primary"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            Todavía no hay mediciones registradas: la evolución aparecerá cuando declares el primer
            valor del indicador.
          </p>
        )}

        <ul className="flex flex-wrap gap-2 text-xs">
          {puntos.map((punto) => (
            <li
              key={punto.etiqueta}
              className={
                punto.pendiente
                  ? "rounded-full border border-dashed border-border px-3 py-1 text-muted-foreground"
                  : "rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-foreground"
              }
            >
              {punto.etiqueta}:{" "}
              {punto.pendiente ? "pendiente" : `${punto.valor}${indicador.unidad}`}
            </li>
          ))}
        </ul>
        {pendientes.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Pendientes de medición: {pendientes.join(", ")}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
