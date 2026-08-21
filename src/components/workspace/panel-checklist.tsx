import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProfundizacionWorkspace, VerificacionWorkspace } from "@/lib/workspace/tipos";
import { ListChecks } from "lucide-react";

interface Props {
  profundizacion: ProfundizacionWorkspace;
  onMarcar: (verificacionId: string, estado: VerificacionWorkspace["estado"]) => void;
}

const opciones: { estado: VerificacionWorkspace["estado"]; etiqueta: string }[] = [
  { estado: "cumple", etiqueta: "Cumple" },
  { estado: "no_cumple", etiqueta: "No cumple" },
  { estado: "no_aplica", etiqueta: "No aplica" },
];

/**
 * B6 · Profundización selectiva con el checklist experto CRO/UX.
 * Se muestran solo las verificaciones activadas por la regla, nunca las 304.
 */
export function PanelChecklist({ profundizacion, onMarcar }: Props) {
  const revisadas = profundizacion.verificaciones.filter((v) => v.estado !== "sin_revisar").length;

  return (
    <Card className="border-accent/30">
      <CardHeader className="space-y-2">
        <Badge variant="outline" className="w-fit gap-1.5 border-accent/40">
          <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
          Revisión especializada · {profundizacion.grupoNombre}
        </Badge>
        <CardTitle className="text-base">Puntos que conviene revisar en esta actividad</CardTitle>
        <CardDescription>{profundizacion.motivo}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Seleccionamos {profundizacion.verificaciones.length} puntos pertinentes para tu caso.
          Ya revisaste {revisadas}.
        </p>

        <ul className="space-y-2">
          {profundizacion.verificaciones.map((verificacion) => (
            <li
              key={verificacion.id}
              className="space-y-2 rounded-lg border border-border p-3 sm:flex sm:items-start sm:justify-between sm:gap-4 sm:space-y-0"
            >
              <div className="space-y-1">
                <p className="text-sm text-foreground">{verificacion.texto}</p>
                <p className="text-xs text-muted-foreground">
                  {verificacion.subgrupo}
                  {verificacion.impacto ? ` · impacto ${verificacion.impacto}/5` : ""}
                  {verificacion.costo ? ` · costo ${verificacion.costo}/5` : ""}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-1.5">
                {opciones.map((opcion) => (
                  <Button
                    key={opcion.estado}
                    size="sm"
                    variant={verificacion.estado === opcion.estado ? "default" : "outline"}
                    onClick={() => onMarcar(verificacion.id, opcion.estado)}
                  >
                    {opcion.etiqueta}
                  </Button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
