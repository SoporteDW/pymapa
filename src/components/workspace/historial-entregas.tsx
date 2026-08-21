import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RegistroEntrega } from "@/lib/workspace/tipos";
import { CheckCircle2, History, RotateCcw } from "lucide-react";

/** B5 · Historial de entregas y resultados de revisión (ciclo de ida y vuelta). */
export function HistorialEntregas({ historial }: { historial: RegistroEntrega[] }) {
  if (historial.length === 0) return null;

  return (
    <Card>
      <CardHeader className="space-y-1.5 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-5 w-5 text-primary" aria-hidden="true" />
          Historial de entregas y revisiones
        </CardTitle>
        <CardDescription>
          Cada ciclo queda registrado: qué se entregó, qué observó la revisión y qué se ajustó.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {[...historial].reverse().map((entrega) => {
          const validado = entrega.revision.veredicto === "validado";
          const Icono = validado ? CheckCircle2 : RotateCcw;
          return (
            <div key={entrega.id} className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">Entrega {entrega.numero}</Badge>
                <Badge
                  variant="outline"
                  className={validado ? "border-success/40 text-success" : "border-warning/40 text-warning"}
                >
                  <Icono className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                  {validado ? "Validado" : "Requiere ajustes"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(entrega.entregadoEn).toLocaleString("es-CO")} · revisión simulada
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{entrega.revision.mensaje}</p>
              {entrega.nota.trim().length > 0 && (
                <p className="text-sm text-foreground">Nota: {entrega.nota}</p>
              )}
              {entrega.revision.ajustesSolicitados.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-foreground">Ajustes solicitados</p>
                  <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                    {entrega.revision.ajustesSolicitados.map((ajuste) => (
                      <li key={ajuste} className="flex gap-2">
                        <span
                          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning"
                          aria-hidden="true"
                        />
                        {ajuste}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {entrega.revision.criteriosCumplidos.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Criterios cumplidos: {entrega.revision.criteriosCumplidos.length} de{" "}
                  {entrega.revision.criteriosCumplidos.length +
                    entrega.revision.criteriosPendientes.length}
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
