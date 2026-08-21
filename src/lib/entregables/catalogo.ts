/**
 * Los tres entregables de Pymapa (Journey Maestro).
 *
 * Única fuente de verdad para nombre, descripción y disponibilidad de descarga.
 * El Informe de Diagnóstico es un activo estático residente: siempre se
 * descarga el mismo archivo preparado para la empresa demostrativa.
 */

export type ModoDescarga = "real" | "simulada";

export interface Entregable {
  id: "diagnostico" | "plan-de-accion" | "plan-de-seguimiento";
  titulo: string;
  proposito: string;
  contenido: string[];
  modo: ModoDescarga;
  /** Ruta pública del archivo cuando la descarga es real. */
  archivo?: string;
  nombreArchivo?: string;
  /** Texto mostrado cuando la descarga aún es demostrativa. */
  aviso?: string;
}

export const ARCHIVO_INFORME_DIAGNOSTICO = "/entregables/diagnostico-moda-origen.pdf";

export const entregables: Entregable[] = [
  {
    id: "diagnostico",
    titulo: "Informe de Diagnóstico",
    proposito:
      "El estado inicial de tu empresa: qué encontramos, dónde están tus fortalezas y brechas, y por dónde conviene empezar.",
    contenido: [
      "Perfil de la empresa y explicación de la metodología",
      "Resumen ejecutivo y lectura de los seis dominios",
      "Fortalezas, brechas y hallazgos",
      "Evidencias consideradas y profundización de e-commerce",
      "Recomendaciones, prioridades y plan inicial",
    ],
    modo: "real",
    archivo: ARCHIVO_INFORME_DIAGNOSTICO,
    nombreArchivo: "Informe-de-Diagnostico-Moda-Origen.pdf",
  },
  {
    id: "plan-de-accion",
    titulo: "Plan de Acción",
    proposito:
      "Las actividades derivadas del diagnóstico, con responsable, esfuerzo, evidencia esperada y fecha de revisión.",
    contenido: [
      "Actividades por dominio y prioridad",
      "Objetivo, responsable y esfuerzo estimado",
      "Instrumento propuesto y evidencia esperada",
      "Hitos y criterios de validación",
    ],
    modo: "simulada",
    aviso:
      "En la versión completa, Pymapa genera un Plan de Acción imprimible con actividades, responsables, fechas, instrumentos e indicadores.",
  },
  {
    id: "plan-de-seguimiento",
    titulo: "Plan de Seguimiento",
    proposito:
      "Cómo comprobaremos que las acciones produjeron resultados: hitos de 30, 60 y 90 días con indicadores y evidencias.",
    contenido: [
      "Línea base de cada indicador",
      "Hitos de 30, 60 y 90 días con fechas de revisión",
      "Qué debe aportar la empresa en cada hito",
      "Qué hará Pymapa con esa información",
    ],
    modo: "simulada",
    aviso:
      "En la versión completa podrás descargar e imprimir tu Plan de Seguimiento con indicadores, responsables, evidencias y fechas de revisión.",
  },
];

export function entregablePorId(id: Entregable["id"]): Entregable | undefined {
  return entregables.find((e) => e.id === id);
}
