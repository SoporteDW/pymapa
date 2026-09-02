import { Boxes } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  agregarRecursos,
  clasificarIntervencion,
  entradaDeActividad,
} from "@/lib/intervencion/clasificacion";
import type { ActividadWorkspace } from "@/lib/workspace/tipos";

/**
 * Lectura agregada del Plan de Acción: qué tipo de apoyo requiere el conjunto de
 * las Actividades. Es una proyección de las Actividades del Workspace.
 */
export function ResumenRecursosPlan({ actividades }: { actividades: ActividadWorkspace[] }) {
  if (actividades.length === 0) return null;
  const resumen = agregarRecursos(
    actividades.map((a) => clasificarIntervencion(entradaDeActividad(a)))
  );

  const filas = [
    { label: "pueden ejecutarse internamente", valor: resumen.internas },
    { label: "requieren formación", valor: resumen.formacion },
    { label: "requieren asistencia técnica", valor: resumen.asistenciaTecnica },
    { label: "requieren proveedor tecnológico", valor: resumen.proveedorTecnologico },
    { label: "podrían requerir inversión externa", valor: resumen.posibleFinanciacion },
  ].filter((f) => f.valor > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Boxes className="size-4 text-primary" aria-hidden="true" />
          Recursos y apoyos requeridos
        </CardTitle>
        <CardDescription>
          Lectura derivada de tus {resumen.total} Actividades: no cambia su estado ni su ejecución.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {filas.map((f) => (
            <li key={f.label} className="flex gap-2">
              <span className="font-semibold text-foreground">{f.valor}</span>
              <span className="text-muted-foreground">
                {f.valor === 1 ? "Actividad" : "Actividades"} {f.label}.
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          La financiación no es un tipo de intervención: es un posible habilitador. Pymapa no
          determina elegibilidad ni evalúa riesgo financiero.
        </p>
      </CardContent>
    </Card>
  );
}
