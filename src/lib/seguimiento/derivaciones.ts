/**
 * B7 · Traducción de la decisión del seguimiento en acciones del recorrido.
 *
 * No inventa metodología: cuando corresponde una actividad complementaria, se
 * construye una `PlantillaActividad` (mismo contrato del Workspace) para que el
 * instrumento y el ciclo de entrega/validación se reutilicen tal cual.
 */

import type { PlantillaActividad } from "@/lib/workspace/tipos";
import { etiquetaResultadoSeguimiento } from "./servicio";
import type { SeguimientoActividad } from "./tipos";

export function idActividadComplementaria(seguimiento: SeguimientoActividad): string {
  return `${seguimiento.actividadId}-complementaria`;
}

/** Actividad complementaria: mejoró pero no alcanzó la meta. */
export function plantillaComplementaria(
  seguimiento: SeguimientoActividad
): PlantillaActividad {
  const indicador = seguimiento.indicador;
  return {
    id: idActividadComplementaria(seguimiento),
    titulo: `Cerrar la brecha restante de ${indicador.nombre.toLowerCase()}`,
    objetivo: `Llevar ${indicador.nombre.toLowerCase()} desde ${indicador.lineaBase ?? "el valor actual"}${indicador.unidad} hasta la meta de ${indicador.meta ?? "la meta definida"}${indicador.unidad}.`,
    porQue: `El seguimiento de “${seguimiento.actividadTitulo}” concluyó “${etiquetaResultadoSeguimiento[seguimiento.evaluacion?.resultado ?? "insuficiente"]}”: la mejora se produjo pero todavía no alcanza la meta comprometida.`,
    origen: {
      tipo: "derivada_seguimiento",
      fuente: `Seguimiento ${seguimiento.id} · ${indicador.nombre}`,
      dominioId: seguimiento.dominioId,
      dominioNombre: seguimiento.dominioNombre,
      referencias: [indicador.id, seguimiento.catalogoVersion],
    },
    pasosSugeridos: [
      "Revisar qué parte del cambio ya está funcionando y qué quedó fuera del alcance.",
      "Definir la siguiente intervención mínima sobre el mismo indicador.",
    ],
    senalesProfundizacion: [indicador.nombre.toLowerCase()],
  };
}

/** Motivo de reapertura mostrado en la actividad (explicabilidad). */
export function motivoReapertura(seguimiento: SeguimientoActividad): string {
  const evaluacion = seguimiento.evaluacion;
  return [
    `Seguimiento de ${seguimiento.indicador.nombre}: ${etiquetaResultadoSeguimiento[evaluacion?.resultado ?? "insuficiente"]}.`,
    evaluacion?.mensaje ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}
