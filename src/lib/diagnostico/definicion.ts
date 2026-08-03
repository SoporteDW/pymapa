/**
 * Configuración central del instrumento de diagnóstico (POC-03, secciones 5 a 10).
 * Todo el catálogo, los pesos, la escala y los umbrales viven en este archivo:
 * la interfaz nunca define preguntas ni reglas de cálculo.
 */

import type {
  DiagnosticDefinition,
  DimensionDefinicion,
  EtiquetaEscala,
  OpcionPregunta,
  PreguntaDiagnostico,
  UmbralNivel,
} from "./tipos";

export const DEFINITION_VERSION = "1.0.0";
export const ALGORITHM_VERSION = "preliminar-1.0.0";

export const dimensiones: DimensionDefinicion[] = [
  {
    id: "D01",
    nombre: "Estrategia y liderazgo",
    proposito: "Dirección, objetivos, gobierno y capacidad de decisión digital.",
    peso: 0.2,
  },
  {
    id: "D02",
    nombre: "Clientes y canales",
    proposito: "Conocimiento del cliente, presencia digital, servicio y canales comerciales.",
    peso: 0.2,
  },
  {
    id: "D03",
    nombre: "Procesos y operaciones",
    proposito: "Estandarización, automatización y eficiencia operativa.",
    peso: 0.15,
  },
  {
    id: "D04",
    nombre: "Tecnología y datos",
    proposito: "Herramientas, integración, calidad y uso de información.",
    peso: 0.2,
  },
  {
    id: "D05",
    nombre: "Personas y cultura",
    proposito: "Competencias, adopción, colaboración y aprendizaje.",
    peso: 0.15,
  },
  {
    id: "D06",
    nombre: "Seguridad y continuidad",
    proposito: "Prácticas mínimas de protección, respaldo y continuidad.",
    peso: 0.1,
  },
];

/** Escala 1-5 común a todas las preguntas puntuables (POC-03, 6.3). */
export const escala: EtiquetaEscala[] = [
  { valor: 1, etiqueta: "No existe o nunca ocurre", normalizado: 0 },
  { valor: 2, etiqueta: "Existe de forma informal o esporádica", normalizado: 25 },
  { valor: 3, etiqueta: "Existe parcialmente o en algunas áreas", normalizado: 50 },
  { valor: 4, etiqueta: "Está definido y se aplica con regularidad", normalizado: 75 },
  { valor: 5, etiqueta: "Está consolidado, medido y mejorado", normalizado: 100 },
];

export const normalizationMap: Record<number, number> = {
  1: 0,
  2: 25,
  3: 50,
  4: 75,
  5: 100,
};

export const umbrales: UmbralNivel[] = [
  {
    min: 0,
    max: 24.9,
    nivel: "Inicial",
    mensaje: "Existen oportunidades básicas de organización y adopción.",
  },
  {
    min: 25,
    max: 49.9,
    nivel: "En desarrollo",
    mensaje: "Hay prácticas parciales que requieren consistencia.",
  },
  {
    min: 50,
    max: 74.9,
    nivel: "En consolidación",
    mensaje: "La empresa cuenta con bases y puede profundizar su integración.",
  },
  {
    min: 75,
    max: 100,
    nivel: "Avanzado",
    mensaje: "Las prácticas están extendidas y pueden enfocarse en optimización.",
  },
];

function opcionesEscala(preguntaId: string): OpcionPregunta[] {
  return escala.map((item) => ({
    id: `${preguntaId}-e${item.valor}`,
    etiqueta: item.etiqueta,
    valor: item.valor,
  }));
}

/** Preguntas de contexto no puntuables (POC-03, 6.1). */
const preguntasContexto: PreguntaDiagnostico[] = [
  {
    id: "C01",
    seccion: "contexto",
    texto: "¿Cuál es el tamaño aproximado de la empresa?",
    tipo: "single_select",
    obligatoria: true,
    puntuable: false,
    ayuda: "Cuenta a todas las personas que trabajan de forma habitual en la empresa.",
    opciones: [
      { id: "C01-o1", etiqueta: "Micro: hasta 9 personas", valor: "micro" },
      { id: "C01-o2", etiqueta: "Pequeña: entre 10 y 49 personas", valor: "pequena" },
      { id: "C01-o3", etiqueta: "Mediana: entre 50 y 249 personas", valor: "mediana" },
    ],
  },
  {
    id: "C02",
    seccion: "contexto",
    texto: "¿En qué sector desarrolla principalmente su actividad?",
    tipo: "single_select",
    obligatoria: true,
    puntuable: false,
    opciones: [
      { id: "C02-o1", etiqueta: "Comercio", valor: "comercio" },
      { id: "C02-o2", etiqueta: "Servicios", valor: "servicios" },
      { id: "C02-o3", etiqueta: "Manufactura", valor: "manufactura" },
      { id: "C02-o4", etiqueta: "Tecnología", valor: "tecnologia" },
      { id: "C02-o5", etiqueta: "Otro sector", valor: "otro" },
    ],
  },
  {
    id: "C03",
    seccion: "contexto",
    texto: "¿Cuáles canales usa actualmente para vender o atender clientes?",
    tipo: "multi_select",
    obligatoria: true,
    puntuable: false,
    ayuda: "Puedes elegir varios. Marca los que utilizas de forma habitual.",
    opciones: [
      { id: "C03-o1", etiqueta: "Local o punto de venta físico", valor: "presencial" },
      { id: "C03-o2", etiqueta: "WhatsApp o mensajería", valor: "mensajeria" },
      { id: "C03-o3", etiqueta: "Redes sociales", valor: "redes" },
      { id: "C03-o4", etiqueta: "Sitio web propio", valor: "web" },
      { id: "C03-o5", etiqueta: "Tienda en línea o marketplace", valor: "marketplace" },
      { id: "C03-o6", etiqueta: "Teléfono o correo electrónico", valor: "telefono" },
      { id: "C03-o7", etiqueta: "Otro canal", valor: "otro" },
    ],
  },
  {
    id: "C04",
    seccion: "contexto",
    texto: "¿Cuál es el principal objetivo de transformación para los próximos 12 meses?",
    tipo: "single_select",
    obligatoria: true,
    puntuable: false,
    opciones: [
      { id: "C04-o1", etiqueta: "Vender más o llegar a nuevos clientes", valor: "ventas" },
      { id: "C04-o2", etiqueta: "Ordenar y agilizar la operación", valor: "operacion" },
      { id: "C04-o3", etiqueta: "Mejorar la atención al cliente", valor: "atencion" },
      { id: "C04-o4", etiqueta: "Adoptar mejores herramientas tecnológicas", valor: "tecnologia" },
      { id: "C04-o5", etiqueta: "Proteger la información del negocio", valor: "seguridad" },
    ],
  },
];

interface EntradaPuntuable {
  id: string;
  dimensionId: string;
  texto: string;
  ayuda?: string;
}

/** Banco de 24 preguntas puntuables: cuatro por dimensión (POC-03, 6.2). */
const entradasPuntuables: EntradaPuntuable[] = [
  {
    id: "Q01",
    dimensionId: "D01",
    texto: "La empresa tiene objetivos digitales definidos y conocidos.",
    ayuda: "Piensa si el equipo sabe qué se espera lograr con la tecnología este año.",
  },
  {
    id: "Q02",
    dimensionId: "D01",
    texto: "Las decisiones digitales se relacionan con objetivos del negocio.",
  },
  {
    id: "Q03",
    dimensionId: "D01",
    texto: "Existe una persona responsable de coordinar iniciativas digitales.",
  },
  {
    id: "Q04",
    dimensionId: "D01",
    texto: "Se revisan periódicamente avances y resultados de iniciativas digitales.",
  },
  {
    id: "Q05",
    dimensionId: "D02",
    texto: "La empresa registra y utiliza información de clientes para tomar decisiones.",
  },
  {
    id: "Q06",
    dimensionId: "D02",
    texto: "Los canales digitales ofrecen información clara y actualizada.",
  },
  {
    id: "Q07",
    dimensionId: "D02",
    texto: "La atención al cliente mantiene continuidad entre canales.",
    ayuda: "Por ejemplo, si alguien escribe por redes y luego llama, se retoma la conversación.",
  },
  {
    id: "Q08",
    dimensionId: "D02",
    texto: "La empresa mide resultados de ventas, campañas o interacciones digitales.",
  },
  {
    id: "Q09",
    dimensionId: "D03",
    texto: "Los procesos principales están documentados y tienen responsables.",
  },
  {
    id: "Q10",
    dimensionId: "D03",
    texto: "Las tareas repetitivas usan herramientas que reducen trabajo manual.",
  },
  {
    id: "Q11",
    dimensionId: "D03",
    texto: "La información fluye entre áreas sin duplicaciones frecuentes.",
  },
  {
    id: "Q12",
    dimensionId: "D03",
    texto: "La empresa mide tiempos, errores o productividad de procesos críticos.",
  },
  {
    id: "Q13",
    dimensionId: "D04",
    texto: "Las herramientas tecnológicas utilizadas responden a necesidades del negocio.",
  },
  {
    id: "Q14",
    dimensionId: "D04",
    texto: "La información relevante está organizada y es fácil de consultar.",
  },
  {
    id: "Q15",
    dimensionId: "D04",
    texto: "Las herramientas principales intercambian datos o evitan reprocesos.",
  },
  {
    id: "Q16",
    dimensionId: "D04",
    texto: "La empresa usa datos e indicadores para apoyar decisiones.",
  },
  {
    id: "Q17",
    dimensionId: "D05",
    texto: "Las personas cuentan con habilidades para usar las herramientas disponibles.",
  },
  {
    id: "Q18",
    dimensionId: "D05",
    texto: "La empresa acompaña los cambios tecnológicos con capacitación y comunicación.",
  },
  {
    id: "Q19",
    dimensionId: "D05",
    texto: "Los equipos comparten aprendizajes y buenas prácticas digitales.",
  },
  {
    id: "Q20",
    dimensionId: "D05",
    texto: "Existe disposición para probar nuevas formas de trabajo.",
  },
  {
    id: "Q21",
    dimensionId: "D06",
    texto: "La empresa controla quién puede acceder a sus sistemas e información.",
  },
  {
    id: "Q22",
    dimensionId: "D06",
    texto: "Se realizan copias de respaldo de la información importante.",
  },
  {
    id: "Q23",
    dimensionId: "D06",
    texto: "El personal conoce prácticas básicas para evitar fraudes o incidentes digitales.",
  },
  {
    id: "Q24",
    dimensionId: "D06",
    texto: "La empresa sabe cómo continuar operaciones ante una falla tecnológica.",
  },
];

const preguntasPuntuables: PreguntaDiagnostico[] = entradasPuntuables.map((entrada) => ({
  id: entrada.id,
  dimensionId: entrada.dimensionId,
  seccion: "puntuable",
  texto: entrada.texto,
  tipo: "scale_1_5",
  obligatoria: true,
  puntuable: true,
  peso: 1,
  opciones: opcionesEscala(entrada.id),
  ...(entrada.ayuda ? { ayuda: entrada.ayuda } : {}),
}));

export const definicionDiagnostico: DiagnosticDefinition = {
  id: "diagnostico-mvp-alfa",
  version: DEFINITION_VERSION,
  title: "Diagnóstico de madurez digital — MVP Alfa",
  dimensions: dimensiones,
  questions: [...preguntasContexto, ...preguntasPuntuables],
  normalizationMap,
  escala,
  thresholds: umbrales,
};

/** Orden de recorrido del instrumento: contexto y luego dimensión por dimensión. */
export const preguntasEnOrden: PreguntaDiagnostico[] = definicionDiagnostico.questions;

export const preguntasObligatorias = preguntasEnOrden.filter((p) => p.obligatoria);
export const totalPreguntasObligatorias = preguntasObligatorias.length;

export function obtenerPregunta(id: string): PreguntaDiagnostico | undefined {
  return preguntasEnOrden.find((p) => p.id === id);
}

export function indiceDePregunta(id: string): number {
  return preguntasEnOrden.findIndex((p) => p.id === id);
}

export function preguntasDeDimension(dimensionId: string): PreguntaDiagnostico[] {
  return preguntasEnOrden.filter((p) => p.dimensionId === dimensionId);
}

export function obtenerDimension(id: string): DimensionDefinicion | undefined {
  return dimensiones.find((d) => d.id === id);
}

export function etiquetaEscala(valor: number): string | undefined {
  return escala.find((e) => e.valor === valor)?.etiqueta;
}

/** Etiqueta legible de una respuesta guardada, usada en la revisión final. */
export function etiquetaRespuesta(
  pregunta: PreguntaDiagnostico,
  valor: string | string[] | number | undefined
): string | undefined {
  if (valor === undefined || valor === "" || (Array.isArray(valor) && valor.length === 0)) {
    return undefined;
  }
  if (pregunta.tipo === "scale_1_5") {
    return `${valor} · ${etiquetaEscala(Number(valor)) ?? ""}`.trim();
  }
  if (pregunta.tipo === "multi_select" && Array.isArray(valor)) {
    return valor
      .map((v) => pregunta.opciones?.find((o) => String(o.valor) === String(v))?.etiqueta ?? String(v))
      .join(", ");
  }
  if (pregunta.opciones) {
    return pregunta.opciones.find((o) => String(o.valor) === String(valor))?.etiqueta ?? String(valor);
  }
  return String(valor);
}
