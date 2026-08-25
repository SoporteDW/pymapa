import { useMemo } from "react";

import { useResultados } from "./use-resultados";
import { useWorkspace } from "./use-workspace";
import { estadoPlanActuar, type EstadoPlanActuar } from "@/lib/actuar/plan";
import type { ActividadWorkspace } from "@/lib/workspace/tipos";

/**
 * Corrección estructural de Actuar · Estado único de la Etapa 3.
 *
 * Combina las dos únicas entradas legítimas:
 * - el Plan construido (Actividades priorizadas por el diagnóstico), y
 * - el estado de ejecución que gobierna el Workspace.
 *
 * Todo lo demás (Home, Plan de Acción, Roadmap, cierre del Plan, Journey) LEE
 * de aquí. No existe una capa de sincronización: es una proyección.
 */
export function useActuar() {
  const { estado: estadoResultados, resultado } = useResultados();
  const { actividades, hidratado } = useWorkspace();

  const plan: EstadoPlanActuar = useMemo(
    () =>
      estadoPlanActuar({
        actividadesDelPlan: (resultado?.actions ?? []).map((a) => a.id),
        ejecucion: actividades.map((a) => ({ id: a.id, estado: a.estado })),
      }),
    [resultado, actividades]
  );

  /** Actividad del Workspace que corresponde trabajar ahora, si ya está abierta. */
  const siguienteActividad: ActividadWorkspace | null = useMemo(
    () => (plan.siguienteId ? actividades.find((a) => a.id === plan.siguienteId) ?? null : null),
    [plan.siguienteId, actividades]
  );

  /** Ficha del Plan correspondiente a la siguiente Actividad (aún sin abrir). */
  const siguienteFicha = useMemo(
    () => (resultado?.actions ?? []).find((a) => a.id === plan.siguienteId) ?? null,
    [resultado, plan.siguienteId]
  );

  return {
    hidratado: hidratado && estadoResultados !== "cargando",
    plan,
    siguienteActividad,
    siguienteFicha,
    /** Actividades del Workspace (fuente única del estado de ejecución). */
    actividades,
  };
}
