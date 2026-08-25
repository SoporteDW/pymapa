/**
 * Corrección estructural de Actuar · Estado del Plan derivado de la ejecución.
 *
 * Reglas establecidas en la auditoría aprobada:
 *
 * 1. "Plan construido" ≠ "Plan completado". La existencia de Actividades
 *    priorizadas solo significa que el Plan fue construido/generado.
 * 2. Workspace es la ÚNICA fuente de verdad de la ejecución. Esta función no
 *    guarda nada ni sincroniza: PROYECTA el estado de ejecución sobre el Plan.
 * 3. El Plan solo se cierra cuando TODAS sus Actividades quedaron validadas.
 *    Una Actividad del Plan que aún no se abrió cuenta como pendiente, no como
 *    inexistente: por eso el denominador es el Plan, no el Workspace.
 *
 * Función pura: no lee almacenamiento ni conoce componentes.
 */

import type { EstadoEjecucion } from "@/lib/workspace/tipos";

export interface EntradaEstadoPlan {
  /** Ids de las Actividades que componen el Plan construido (orden de prioridad). */
  actividadesDelPlan: string[];
  /** Estado de ejecución de las Actividades con Workspace abierto. */
  ejecucion: { id: string; estado: EstadoEjecucion }[];
}

export interface ActividadDelPlan {
  id: string;
  estado: EstadoEjecucion;
  /** false cuando la Actividad del Plan todavía no tiene Workspace abierto. */
  abierta: boolean;
}

export interface EstadoPlanActuar {
  /** El diagnóstico ya produjo Actividades priorizadas. */
  construido: boolean;
  /** Total de Actividades del Plan (denominador real). */
  total: number;
  actividades: ActividadDelPlan[];
  pendientes: number;
  enEjecucion: number;
  entregadas: number;
  requierenAjustes: number;
  validadas: number;
  /** Hito real de cierre: el Plan completado. Nunca por su simple existencia. */
  cerrado: boolean;
  /** Porcentaje de avance real de la ejecución del Plan. */
  porcentaje: number;
  /** Única Actividad que corresponde trabajar ahora (un solo CTA). */
  siguienteId: string | null;
}

const ORDEN_ATENCION: EstadoEjecucion[] = [
  "requiere_ajustes",
  "en_ejecucion",
  "entregado",
  "pendiente",
];

export function estadoPlanActuar(entrada: EntradaEstadoPlan): EstadoPlanActuar {
  const porId = new Map(entrada.ejecucion.map((e) => [e.id, e.estado]));

  const actividades: ActividadDelPlan[] = entrada.actividadesDelPlan.map((id) => ({
    id,
    estado: porId.get(id) ?? "pendiente",
    abierta: porId.has(id),
  }));

  const cuenta = (estado: EstadoEjecucion) => actividades.filter((a) => a.estado === estado).length;
  const total = actividades.length;
  const validadas = cuenta("validado");
  const cerrado = total > 0 && validadas === total;

  const siguiente =
    ORDEN_ATENCION.map((estado) => actividades.find((a) => a.estado === estado)).find(
      (a) => a !== undefined
    ) ?? null;

  return {
    construido: total > 0,
    total,
    actividades,
    pendientes: cuenta("pendiente"),
    enEjecucion: cuenta("en_ejecucion"),
    entregadas: cuenta("entregado"),
    requierenAjustes: cuenta("requiere_ajustes"),
    validadas,
    cerrado,
    porcentaje: total === 0 ? 0 : Math.round((validadas / total) * 100),
    siguienteId: siguiente?.id ?? null,
  };
}

export const planVacio: EstadoPlanActuar = estadoPlanActuar({
  actividadesDelPlan: [],
  ejecucion: [],
});
