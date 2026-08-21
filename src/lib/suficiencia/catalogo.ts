/**
 * B2 · Catálogo de suficiencia (capa de conocimiento, versionada).
 *
 * Define, por dominio del diagnóstico general, qué evidencia puede solicitarse
 * y qué aclaración puede formularse cuando la información declarada no alcanza
 * para concluir. No contiene scoring ni benchmarks: solo condiciones
 * declarativas y textos explicativos.
 *
 * Los textos viven aquí (conocimiento) y nunca en los componentes (experiencia).
 */

import type { CatalogoSuficiencia } from "./tipos";

const FUENTE = "Modelo Pymapa · criterio cualitativo de suficiencia (experimental)";

/** Umbral cualitativo: 1 y 2 de la escala declarada significan práctica ausente o incipiente. */
export const UMBRAL_NIVEL_BAJO = 2;
/** Diferencia que se interpreta como respuestas contradictorias dentro de un dominio. */
export const UMBRAL_DISPERSION = 3;

export const catalogoSuficiencia: CatalogoSuficiencia = {
  id: "suficiencia-general",
  version: "0.1.0",
  estado: "experimental",
  solicitudes: [
    {
      id: "EV-D01",
      dominioId: "D01",
      titulo: "Documento de objetivos o plan de la empresa",
      tipo: "politica",
      motivo:
        "Declaraste que la dirección digital todavía es incipiente. Necesitamos ver cómo están escritos hoy los objetivos para no suponer una estrategia que no existe.",
      instrucciones:
        "Adjunta el plan, acta de reunión o presentación donde estén los objetivos del año, aunque sea un borrador.",
      senales: [
        "Existencia de objetivos escritos",
        "Responsable identificado",
        "Horizonte temporal definido",
      ],
    },
    {
      id: "EV-D02",
      dominioId: "D02",
      titulo: "Reporte de clientes o de canales de venta",
      tipo: "reporte",
      motivo:
        "Para interpretar tu relación con clientes necesitamos ver información real de canales y no solo la percepción declarada.",
      instrucciones:
        "Adjunta un reporte de ventas por canal, listado de clientes o captura de las métricas de tus canales digitales.",
      senales: [
        "Canales activos identificados",
        "Registro de clientes recurrentes",
        "Medición de resultados por canal",
      ],
    },
    {
      id: "EV-D03",
      dominioId: "D03",
      titulo: "Procedimiento operativo documentado",
      tipo: "procedimiento",
      motivo:
        "Indicaste que los procesos están poco estandarizados. Ver un procedimiento real permite distinguir entre falta de documentación y falta de proceso.",
      instrucciones:
        "Adjunta el procedimiento, instructivo o flujo de trabajo de la operación más importante.",
      senales: [
        "Pasos definidos",
        "Responsables asignados",
        "Puntos de control identificados",
      ],
    },
    {
      id: "EV-D04",
      dominioId: "D04",
      titulo: "Inventario de herramientas y datos",
      tipo: "inventario",
      motivo:
        "Necesitamos saber qué herramientas usas y cómo se conectan antes de concluir algo sobre tecnología y datos.",
      instrucciones:
        "Adjunta un listado (aunque sea una hoja de cálculo) con los sistemas que utilizas y para qué se usa cada uno.",
      senales: [
        "Sistemas identificados",
        "Integraciones existentes",
        "Responsable de la información",
      ],
    },
    {
      id: "EV-D05",
      dominioId: "D05",
      titulo: "Plan o registro de capacitación del equipo",
      tipo: "reporte",
      motivo:
        "La adopción depende de las personas: un registro de formación evita concluir sobre cultura digital solo con percepciones.",
      instrucciones:
        "Adjunta el plan de capacitación, asistencia a formaciones o cualquier registro de aprendizaje del equipo.",
      senales: [
        "Actividades de formación realizadas",
        "Cobertura del equipo",
        "Continuidad en el tiempo",
      ],
    },
    {
      id: "EV-D06",
      dominioId: "D06",
      titulo: "Política o evidencia de respaldos y accesos",
      tipo: "politica",
      motivo:
        "Antes de concluir sobre seguridad y continuidad necesitamos evidencia de respaldos y control de accesos, no solo la respuesta declarada.",
      instrucciones:
        "Adjunta la política de seguridad, el reporte del último respaldo o una captura de la configuración de accesos.",
      senales: [
        "Respaldos periódicos",
        "Control de accesos",
        "Responsable de continuidad",
      ],
    },
  ],
  aclaraciones: [
    {
      id: "AC-D01",
      dominioId: "D01",
      pregunta:
        "¿Quién toma hoy las decisiones digitales y con qué frecuencia se revisan los objetivos?",
      motivo:
        "Tus respuestas en este dominio son dispares: conviene precisar cómo se decide antes de concluir.",
    },
    {
      id: "AC-D02",
      dominioId: "D02",
      pregunta: "¿Cuál es hoy tu canal de venta principal y cómo llegan la mayoría de tus clientes?",
      motivo: "Las respuestas del dominio muestran niveles muy distintos entre sí.",
    },
    {
      id: "AC-D03",
      dominioId: "D03",
      pregunta: "¿Qué parte de la operación funciona bien y cuál genera más reprocesos?",
      motivo: "Hay contraste entre las prácticas declaradas de este dominio.",
    },
    {
      id: "AC-D04",
      dominioId: "D04",
      pregunta: "¿Qué información consultas para tomar decisiones y de dónde la obtienes?",
      motivo: "Las respuestas sobre tecnología y datos no son consistentes entre sí.",
    },
    {
      id: "AC-D05",
      dominioId: "D05",
      pregunta: "¿Quién impulsa los cambios digitales dentro del equipo y cómo reacciona el resto?",
      motivo: "Las respuestas del dominio combinan niveles altos y bajos.",
    },
    {
      id: "AC-D06",
      dominioId: "D06",
      pregunta: "¿Qué harían si mañana perdieran el acceso a la información del negocio?",
      motivo: "Conviene precisar la práctica real de continuidad antes de concluir.",
    },
  ],
  reglas: [
    ...["D01", "D02", "D03", "D04", "D05", "D06"].map((dominioId) => ({
      id: `RS-${dominioId}-EV`,
      dominioId,
      condicion: {
        tipo: "nivel_declarado_bajo" as const,
        preguntas: "dominio" as const,
        umbral: UMBRAL_NIVEL_BAJO,
      },
      exige: "evidencia" as const,
      solicitudId: `EV-${dominioId}`,
      porQue:
        "Declaraste al menos una práctica ausente o incipiente en este dominio. Con evidencia documental podemos concluir sin suponer.",
      fuente: FUENTE,
    })),
    ...["D01", "D02", "D03", "D04", "D05", "D06"].map((dominioId) => ({
      id: `RS-${dominioId}-AC`,
      dominioId,
      condicion: {
        tipo: "respuestas_dispersas" as const,
        preguntas: "dominio" as const,
        umbral: UMBRAL_DISPERSION,
      },
      exige: "aclaracion" as const,
      aclaracionId: `AC-${dominioId}`,
      porQue:
        "Tus respuestas en este dominio son muy distintas entre sí. Una aclaración breve evita una interpretación equivocada.",
      fuente: FUENTE,
    })),
  ],
};
