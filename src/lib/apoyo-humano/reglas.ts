/**
 * B9 · Reglas demostrativas y versionadas de detección de apoyo humano.
 *
 * Son explícitas y deliberadamente pocas: declaran la condición observable, la
 * especialidad sugerida, el motivo que se muestra al usuario y los objetivos
 * concretos de la sesión. No pretenden ser definitivas.
 */

import type { EspecialidadApoyo, MotivoApoyoTipo } from "./tipos";

export const REGLAS_APOYO_VERSION = "apoyo-1.0.0";

export const etiquetaEspecialidad: Record<EspecialidadApoyo, string> = {
  ecommerce_cro: "E-commerce / CRO",
  tecnologia: "Tecnología",
  analitica: "Analítica",
  finanzas: "Finanzas",
  legal: "Legal",
  estrategia: "Estrategia",
};

export interface ReglaApoyo {
  id: string;
  motivoTipo: MotivoApoyoTipo;
  especialidad: EspecialidadApoyo;
  porQue: string;
  objetivos: string[];
  fuente: string;
}

export const reglasApoyo: ReglaApoyo[] = [
  {
    id: "AP-R01",
    motivoTipo: "actividad_no_valida",
    especialidad: "ecommerce_cro",
    porQue:
      "La actividad acumula entregas que no logran cumplir los criterios de validación: el obstáculo excede la información disponible en el recorrido autogestionado.",
    objetivos: [
      "Revisar en vivo el entregable y los criterios que siguen sin cumplirse.",
      "Definir el ajuste mínimo que permite validar la actividad.",
      "Acordar cómo se evidenciará el cambio.",
    ],
    fuente: "Reglas de apoyo Pymapa (demostrativas)",
  },
  {
    id: "AP-R02",
    motivoTipo: "resultado_empeora",
    especialidad: "analitica",
    porQue:
      "El seguimiento muestra que el indicador empeoró después de ejecutar la actividad: interpretar la causa requiere lectura especializada de datos.",
    objetivos: [
      "Verificar cómo se está midiendo el indicador.",
      "Identificar causas probables del deterioro.",
      "Definir si corresponde reabrir la actividad o cambiar el enfoque.",
    ],
    fuente: "Reglas de apoyo Pymapa (demostrativas)",
  },
  {
    id: "AP-R03",
    motivoTipo: "evidencia_insuficiente_reiterada",
    especialidad: "tecnologia",
    porQue:
      "La empresa no logra aportar la evidencia solicitada de forma reiterada: probablemente la información no existe todavía o está en sistemas que hay que habilitar.",
    objetivos: [
      "Determinar dónde puede obtenerse la información faltante.",
      "Definir un registro mínimo viable para el dato requerido.",
    ],
    fuente: "Reglas de apoyo Pymapa (demostrativas)",
  },
  {
    id: "AP-R04",
    motivoTipo: "decision_especializada",
    especialidad: "estrategia",
    porQue:
      "La actividad implica una decisión con impacto estructural que conviene tomar acompañada.",
    objetivos: [
      "Contrastar alternativas y sus implicaciones.",
      "Dejar la decisión documentada para el resto del recorrido.",
    ],
    fuente: "Reglas de apoyo Pymapa (demostrativas)",
  },
  {
    id: "AP-R05",
    motivoTipo: "conocimiento_insuficiente",
    especialidad: "ecommerce_cro",
    porQue:
      "La base de conocimiento declara que no puede concluir con el nivel de información disponible en este dominio.",
    objetivos: [
      "Profundizar con criterio experto en el grupo de verificaciones activado.",
      "Priorizar qué verificaciones vale la pena corregir primero.",
    ],
    fuente: "Reglas de apoyo Pymapa (demostrativas)",
  },
];

export function obtenerReglaApoyo(id: string): ReglaApoyo | undefined {
  return reglasApoyo.find((r) => r.id === id);
}

/** Señales observables que la aplicación puede aportar sin conocer las reglas. */
export interface SenalesApoyo {
  /** Entregas revisadas que pidieron ajustes en la misma actividad. */
  ajustesSolicitados?: number;
  /** Resultado del seguimiento, si ya existe evaluación. */
  resultadoSeguimiento?: "mejoro" | "sin_cambio" | "empeoro" | "insuficiente";
  /** Necesidades de evidencia abiertas del mismo dominio. */
  evidenciasPendientes?: number;
  /** El checklist experto quedó activado con verificaciones sin revisar. */
  verificacionesSinRevisar?: number;
  /** La actividad implica una decisión gerencial declarada. */
  decisionEspecializada?: boolean;
}

export interface SugerenciaApoyo {
  reglaId: string;
  reglaVersion: string;
  motivoTipo: MotivoApoyoTipo;
  especialidad: EspecialidadApoyo;
  porQue: string;
  objetivos: string[];
}

function sugerencia(regla: ReglaApoyo): SugerenciaApoyo {
  return {
    reglaId: regla.id,
    reglaVersion: REGLAS_APOYO_VERSION,
    motivoTipo: regla.motivoTipo,
    especialidad: regla.especialidad,
    porQue: regla.porQue,
    objetivos: regla.objetivos,
  };
}

/**
 * Evalúa las señales y devuelve las salidas de autopista pertinentes, en orden
 * de prioridad. Determinista: mismas señales, mismas sugerencias.
 */
export function evaluarApoyo(senales: SenalesApoyo): SugerenciaApoyo[] {
  const salidas: SugerenciaApoyo[] = [];
  const regla = (id: string) => reglasApoyo.find((r) => r.id === id)!;

  if (senales.resultadoSeguimiento === "empeoro") salidas.push(sugerencia(regla("AP-R02")));
  if ((senales.ajustesSolicitados ?? 0) >= 2) salidas.push(sugerencia(regla("AP-R01")));
  if ((senales.evidenciasPendientes ?? 0) >= 2) salidas.push(sugerencia(regla("AP-R03")));
  if (senales.decisionEspecializada) salidas.push(sugerencia(regla("AP-R04")));
  if ((senales.verificacionesSinRevisar ?? 0) >= 10) salidas.push(sugerencia(regla("AP-R05")));

  return salidas;
}
