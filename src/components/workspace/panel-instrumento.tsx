import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { obtenerInstrumento } from "@/lib/instrumentos/catalogo";
import type { ActividadWorkspace } from "@/lib/workspace/tipos";
import { Wrench } from "lucide-react";

interface Props {
  actividad: ActividadWorkspace;
  onAlternarPaso: (orden: number, hecho: boolean) => void;
  /** Consulta histórica: los pasos se muestran sin poder modificarse. */
  soloLectura?: boolean;
}

/**
 * B4 · "¿Con qué se hace?": instrumento metodológico y pasos guiados.
 * Los textos provienen del catálogo de instrumentos (capa de conocimiento).
 */
export function PanelInstrumento({ actividad, onAlternarPaso, soloLectura = false }: Props) {
  const instrumento = obtenerInstrumento(actividad.instrumentoId);
  const completados = actividad.pasos.filter((p) => p.hecho).length;

  return (
    <Card>
      <CardHeader className="space-y-2">
        <Badge variant="outline" className="w-fit gap-1.5">
          <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
          Instrumento: {instrumento?.nombre ?? actividad.instrumentoId}
        </Badge>
        <CardTitle className="text-base">Cómo se trabaja esta actividad</CardTitle>
        <CardDescription>{instrumento?.metodologia}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          {completados} de {actividad.pasos.length} pasos registrados · versión{" "}
          {actividad.instrumentoVersion}
        </p>
        <ol className="space-y-3">
          {actividad.pasos.map((paso) => (
            <li key={paso.orden} className="flex gap-3 rounded-lg border border-border p-3">
              <Checkbox
                id={`paso-${paso.orden}`}
                checked={paso.hecho}
                onCheckedChange={(valor) => onAlternarPaso(paso.orden, valor === true)}
                disabled={soloLectura}
                aria-label={`Marcar paso ${paso.orden} como realizado`}
                className="mt-0.5"
              />
              <div className="space-y-1">
                <label
                  htmlFor={`paso-${paso.orden}`}
                  className="text-sm font-semibold text-foreground"
                >
                  {paso.orden}. {paso.titulo}
                </label>
                <p className="text-sm text-muted-foreground">{paso.detalle}</p>
                <p className="text-xs text-muted-foreground">Qué debe quedar: {paso.registro}</p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
