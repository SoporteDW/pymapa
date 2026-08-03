/**
 * Catálogo del Motor de Conocimiento (POC-04, secciones 5, 6, 9 y 10).
 * Contiene capacidades, bandas, escalas y pares de contradicción como datos
 * versionados. Ninguna condición de negocio vive en la interfaz.
 */

import { dimensiones } from "@/lib/diagnostico/definicion";
import type {
  BandaMadurez,
  BandaPrioridad,
  Capacidad,
  FactoresPrioridad,
  ParContradiccion,
} from "./tipos";

export const CATALOG_VERSION = "1.0.0";
export const ENGINE_VERSION = "motor-conocimiento-1.0.0";

/** Correspondencia entre dimensiones del POC-03 y la taxonomía del POC-04 (6). */
export const taxonomia: Record<string, string> = {
  D01: "Estrategia y liderazgo",
  D02: "Cliente, experiencia y canales digitales",
  D03: "Procesos y operaciones",
  D04: "Datos, medición y tecnología",
  D05: "Talento y capacidades",
  D06: "Tecnología y seguridad",
};

/** Capacidades observables: dos por dimensión, con la evidencia que las sustenta. */
export const capacidades: Capacidad[] = [
  {
    id: "CAP-D01-01",
    dimensionId: "D01",
    nombre: "Dirección digital explícita",
    descripcion: "Objetivos digitales definidos, conocidos y conectados con el negocio.",
    criticidad: "alta",
    preguntas: ["Q01", "Q02"],
    fundacionalidad: 5,
  },
  {
    id: "CAP-D01-02",
    dimensionId: "D01",
    nombre: "Gobierno y seguimiento",
    descripcion: "Responsable asignado y revisión periódica de avances.",
    criticidad: "alta",
    preguntas: ["Q03", "Q04"],
    fundacionalidad: 4,
  },
  {
    id: "CAP-D02-01",
    dimensionId: "D02",
    nombre: "Conocimiento y activación de clientes",
    descripcion: "Registro y uso de información de clientes para decidir.",
    criticidad: "media",
    preguntas: ["Q05", "Q08"],
    fundacionalidad: 3,
  },
  {
    id: "CAP-D02-02",
    dimensionId: "D02",
    nombre: "Operación de canales digitales",
    descripcion: "Canales actualizados y atención con continuidad entre ellos.",
    criticidad: "media",
    preguntas: ["Q06", "Q07"],
    fundacionalidad: 3,
  },
  {
    id: "CAP-D03-01",
    dimensionId: "D03",
    nombre: "Procesos estandarizados",
    descripcion: "Procesos documentados con responsables y flujo de información.",
    criticidad: "media",
    preguntas: ["Q09", "Q11"],
    fundacionalidad: 4,
  },
  {
    id: "CAP-D03-02",
    dimensionId: "D03",
    nombre: "Eficiencia y automatización",
    descripcion: "Herramientas que reducen trabajo manual y medición de procesos.",
    criticidad: "media",
    preguntas: ["Q10", "Q12"],
    fundacionalidad: 2,
  },
  {
    id: "CAP-D04-01",
    dimensionId: "D04",
    nombre: "Información organizada",
    descripcion: "Herramientas adecuadas, datos accesibles e integrados.",
    criticidad: "alta",
    preguntas: ["Q13", "Q14", "Q15"],
    fundacionalidad: 4,
  },
  {
    id: "CAP-D04-02",
    dimensionId: "D04",
    nombre: "Decisiones con evidencia",
    descripcion: "Uso de datos e indicadores para apoyar decisiones.",
    criticidad: "alta",
    preguntas: ["Q16"],
    fundacionalidad: 3,
  },
  {
    id: "CAP-D05-01",
    dimensionId: "D05",
    nombre: "Competencias digitales",
    descripcion: "Habilidades para usar las herramientas disponibles.",
    criticidad: "media",
    preguntas: ["Q17", "Q18"],
    fundacionalidad: 4,
  },
  {
    id: "CAP-D05-02",
    dimensionId: "D05",
    nombre: "Cultura de adopción",
    descripcion: "Aprendizaje compartido y disposición a probar nuevas formas de trabajo.",
    criticidad: "baja",
    preguntas: ["Q19", "Q20"],
    fundacionalidad: 2,
  },
  {
    id: "CAP-D06-01",
    dimensionId: "D06",
    nombre: "Control de accesos y respaldo",
    descripcion: "Gestión de accesos y copias de respaldo de la información crítica.",
    criticidad: "critica",
    preguntas: ["Q21", "Q22"],
    fundacionalidad: 5,
  },
  {
    id: "CAP-D06-02",
    dimensionId: "D06",
    nombre: "Continuidad operativa",
    descripcion: "Prácticas del personal y plan de continuidad ante fallas.",
    criticidad: "critica",
    preguntas: ["Q23", "Q24"],
    fundacionalidad: 4,
  },
];

export function obtenerCapacidad(id: string): Capacidad | undefined {
  return capacidades.find((c) => c.id === id);
}

export function capacidadDePregunta(questionId: string): Capacidad | undefined {
  return capacidades.find((c) => c.preguntas.includes(questionId));
}

export function capacidadesDeDimension(dimensionId: string): Capacidad[] {
  return capacidades.filter((c) => c.dimensionId === dimensionId);
}

export function nombreDimension(dimensionId: string): string {
  return dimensiones.find((d) => d.id === dimensionId)?.nombre ?? dimensionId;
}

/** Bandas de madurez 1-5 (POC-04, 9.1). */
export const bandasMadurez: BandaMadurez[] = [
  {
    nivel: 1,
    nombre: "Inicial",
    descripcion: "Prácticas informales, reactivas o inexistentes.",
    min: 0,
    max: 19.9,
  },
  {
    nivel: 2,
    nombre: "Básica",
    descripcion: "Herramientas o acciones aisladas, con baja consistencia.",
    min: 20,
    max: 39.9,
  },
  {
    nivel: 3,
    nombre: "Gestionada",
    descripcion: "Hay responsables, rutinas y medición parcial.",
    min: 40,
    max: 59.9,
  },
  {
    nivel: 4,
    nombre: "Integrada",
    descripcion: "Procesos, canales, datos y tecnología se conectan de forma consistente.",
    min: 60,
    max: 79.9,
  },
  {
    nivel: 5,
    nombre: "Optimizada",
    descripcion: "Mejora continua con evidencia, automatización y aprendizaje.",
    min: 80,
    max: 100,
  },
];

export function bandaMadurez(puntaje: number): BandaMadurez {
  const encontrada = bandasMadurez.find((b) => puntaje >= b.min && puntaje <= b.max);
  return encontrada ?? bandasMadurez[0]!;
}

/** Bandas de prioridad (POC-04, 11). */
export const bandasPrioridad: BandaPrioridad[] = [
  { banda: "observacion", etiqueta: "Observación", min: 0, max: 19.9 },
  { banda: "baja", etiqueta: "Baja", min: 20, max: 39.9 },
  { banda: "media", etiqueta: "Media", min: 40, max: 59.9 },
  { banda: "alta", etiqueta: "Alta", min: 60, max: 79.9 },
  { banda: "critica", etiqueta: "Crítica", min: 80, max: 100 },
];

export function bandaDePrioridad(score: number): BandaPrioridad {
  const encontrada = bandasPrioridad.find((b) => score >= b.min && score <= b.max);
  return encontrada ?? bandasPrioridad[0]!;
}

/** Pesos iniciales configurables del modelo de priorización (POC-04, 11). */
export const pesosPrioridad: Record<keyof FactoresPrioridad, number> = {
  impacto: 0.3,
  urgencia: 0.2,
  fundacionalidad: 0.2,
  brechaMadurez: 0.15,
  factibilidad: 0.1,
  confianza: 0.05,
};

export const severidadNumerica: Record<string, number> = {
  informativa: 1,
  baja: 2,
  media: 3,
  alta: 4,
  critica: 5,
};

/** Cobertura mínima para asignar un nivel de madurez definitivo (POC-04, 10). */
export const COBERTURA_MINIMA_NIVEL = 60;

/** Confianza por debajo de este valor marca el hallazgo como hipótesis (POC-04, 12). */
export const CONFIANZA_HIPOTESIS = 0.55;

/** Valor reservado que representa una respuesta "no aplica" justificada. */
export const VALOR_NO_APLICA = "no_aplica";

/** Pares de contradicción directa evaluados por el motor (POC-04, 10). */
export const paresContradiccion: ParContradiccion[] = [
  {
    id: "INC-01",
    dimensionId: "D04",
    preguntaBaja: "Q08",
    preguntaAlta: "Q16",
    umbralBajo: 2,
    umbralAlto: 4,
    descripcion:
      "Se declara no medir resultados digitales y, a la vez, decidir habitualmente con indicadores.",
  },
  {
    id: "INC-02",
    dimensionId: "D03",
    preguntaBaja: "Q09",
    preguntaAlta: "Q12",
    umbralBajo: 2,
    umbralAlto: 4,
    descripcion:
      "Se declara no tener procesos documentados y, a la vez, medir con regularidad sus tiempos y errores.",
  },
  {
    id: "INC-03",
    dimensionId: "D06",
    preguntaBaja: "Q21",
    preguntaAlta: "Q24",
    umbralBajo: 2,
    umbralAlto: 4,
    descripcion:
      "Se declara no controlar accesos y, a la vez, tener resuelta la continuidad ante fallas tecnológicas.",
  },
  {
    id: "INC-04",
    dimensionId: "D01",
    preguntaBaja: "Q01",
    preguntaAlta: "Q04",
    umbralBajo: 2,
    umbralAlto: 4,
    descripcion:
      "Se declara no tener objetivos digitales definidos y, a la vez, revisar periódicamente sus avances.",
  },
];
