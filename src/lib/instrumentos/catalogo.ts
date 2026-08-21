/**
 * B4 · Catálogo versionado de instrumentos metodológicos de ejecución.
 *
 * Selección determinista por señales del objetivo de la actividad y por dominio.
 * Agregar un instrumento no exige cambios en la interfaz ni en el workspace.
 */

import type { InstrumentoEjecucion } from "./tipos";

export const CATALOGO_INSTRUMENTOS_VERSION = "instrumentos-1.0.0";

export const instrumentosEjecucion: InstrumentoEjecucion[] = [
  {
    id: "INS-EJE-AUDITORIA-CRO",
    nombre: "Auditoría guiada CRO/UX de e-commerce",
    version: "1.0.0",
    tipo: "auditoria",
    metodologia:
      "Revisión punto por punto de un grupo del checklist experto (no las 304 verificaciones): se observa la pantalla real, se marca cumple / no cumple y se registra la evidencia visual de cada incumplimiento.",
    dominios: ["D02", "D03", "D04"],
    senales: ["checkout", "carrito", "producto", "conversión", "conversion", "tienda", "e-commerce"],
    pasos: [
      {
        orden: 1,
        titulo: "Delimitar el alcance",
        detalle:
          "Confirma qué pantalla o flujo se audita y en qué dispositivo (móvil primero, luego escritorio).",
        registro: "Alcance y dispositivos auditados.",
      },
      {
        orden: 2,
        titulo: "Recorrer las verificaciones activadas",
        detalle:
          "Para cada verificación del grupo activado indica si cumple, no cumple o no aplica, con una nota breve.",
        registro: "Tabla de verificaciones con estado y nota.",
      },
      {
        orden: 3,
        titulo: "Capturar evidencia de los incumplimientos",
        detalle: "Adjunta una captura por cada verificación marcada como no cumple.",
        registro: "Capturas numeradas y asociadas a la verificación.",
      },
      {
        orden: 4,
        titulo: "Priorizar los ajustes",
        detalle:
          "Ordena los incumplimientos por impacto declarado y costo estimado; propone los tres primeros ajustes.",
        registro: "Lista priorizada de ajustes con responsable propuesto.",
      },
    ],
    entregable: {
      titulo: "Informe de auditoría CRO/UX",
      descripcion:
        "Documento con el estado de cada verificación activada, evidencia visual de los incumplimientos y los tres ajustes priorizados.",
      formato: "documento",
      criteriosValidacion: [
        "Todas las verificaciones activadas tienen estado (cumple / no cumple / no aplica).",
        "Cada incumplimiento tiene evidencia visual asociada.",
        "Existen al menos tres ajustes priorizados con responsable propuesto.",
      ],
    },
    fuente: "Checklist metodológico CRO/UX (INS-EC-CHECKLIST-304)",
    capa: "conocimiento",
  },
  {
    id: "INS-EJE-MAPA-PROCESO",
    nombre: "Plantilla de mapa de proceso actual",
    version: "1.0.0",
    tipo: "plantilla",
    metodologia:
      "Levantamiento del proceso tal como ocurre hoy: actividades, responsables, tiempos y puntos de reproceso, validado con quien ejecuta.",
    dominios: ["D01", "D05", "D06"],
    senales: ["proceso", "procesos", "operación", "operacion", "flujo", "manual"],
    pasos: [
      {
        orden: 1,
        titulo: "Delimitar inicio y fin del proceso",
        detalle: "Define el evento que lo dispara y el resultado que lo cierra.",
        registro: "Alcance del proceso en una frase.",
      },
      {
        orden: 2,
        titulo: "Listar actividades en orden real",
        detalle: "Anota cada paso tal como se hace hoy, sin idealizarlo.",
        registro: "Secuencia de actividades con responsable.",
      },
      {
        orden: 3,
        titulo: "Marcar demoras y reprocesos",
        detalle: "Identifica esperas, dobles digitaciones y controles manuales.",
        registro: "Puntos de fricción señalados sobre el mapa.",
      },
      {
        orden: 4,
        titulo: "Validar con el equipo",
        detalle: "Revisa el mapa con quien ejecuta el proceso y ajusta lo que no corresponda.",
        registro: "Acta breve de validación con nombres y fecha.",
      },
    ],
    entregable: {
      titulo: "Mapa del proceso actual",
      descripcion: "Diagrama o tabla del proceso vigente con responsables, tiempos y fricciones.",
      formato: "documento",
      criteriosValidacion: [
        "El proceso tiene inicio, fin y responsable por actividad.",
        "Están señalados al menos dos puntos de demora o reproceso.",
        "El mapa fue validado con quien ejecuta el proceso.",
      ],
    },
    fuente: "Instrumento propio Pymapa",
    capa: "conocimiento",
  },
  {
    id: "INS-EJE-MATRIZ-DATOS",
    nombre: "Matriz de datos e indicadores mínimos",
    version: "1.0.0",
    tipo: "matriz",
    metodologia:
      "Definición del dato mínimo necesario para decidir: indicador, fuente, responsable, periodicidad y uso en la decisión.",
    dominios: ["D04", "D05", "D06"],
    senales: ["dato", "datos", "indicador", "indicadores", "medición", "medicion", "reporte"],
    pasos: [
      {
        orden: 1,
        titulo: "Elegir las decisiones a sostener",
        detalle: "Define qué decisiones concretas necesitan información confiable.",
        registro: "Lista de decisiones priorizadas.",
      },
      {
        orden: 2,
        titulo: "Definir el indicador mínimo por decisión",
        detalle: "Un indicador por decisión, con fórmula simple y unidad clara.",
        registro: "Indicador, fórmula y unidad.",
      },
      {
        orden: 3,
        titulo: "Asignar fuente y responsable",
        detalle: "Indica de dónde sale el dato, quién lo registra y cada cuánto.",
        registro: "Fuente, responsable y periodicidad por indicador.",
      },
    ],
    entregable: {
      titulo: "Matriz de indicadores mínimos",
      descripcion: "Hoja con indicador, fórmula, fuente, responsable, periodicidad y decisión asociada.",
      formato: "hoja_de_calculo",
      criteriosValidacion: [
        "Cada indicador está asociado a una decisión concreta.",
        "Cada indicador tiene fuente, responsable y periodicidad.",
        "La fórmula es reproducible con los datos disponibles hoy.",
      ],
    },
    fuente: "Instrumento propio Pymapa",
    capa: "conocimiento",
  },
  {
    id: "INS-EJE-GUION-CLIENTE",
    nombre: "Guion de conversación comercial y social selling",
    version: "1.0.0",
    tipo: "guion",
    metodologia:
      "Estandarización de la conversación con el cliente: apertura, calificación, objeciones frecuentes y siguiente paso comprometido.",
    dominios: ["D02", "D03"],
    senales: ["cliente", "clientes", "venta", "ventas", "social selling", "atención", "atencion"],
    pasos: [
      {
        orden: 1,
        titulo: "Definir el objetivo de la conversación",
        detalle: "Qué resultado buscamos al terminar el contacto.",
        registro: "Objetivo y siguiente paso esperado.",
      },
      {
        orden: 2,
        titulo: "Redactar apertura y preguntas de calificación",
        detalle: "Tres preguntas que permiten entender necesidad y urgencia.",
        registro: "Apertura y preguntas escritas.",
      },
      {
        orden: 3,
        titulo: "Preparar respuestas a objeciones frecuentes",
        detalle: "Documenta las tres objeciones más habituales y su respuesta.",
        registro: "Tabla objeción / respuesta.",
      },
    ],
    entregable: {
      titulo: "Guion de conversación",
      descripcion: "Documento con apertura, preguntas de calificación, objeciones y cierre.",
      formato: "documento",
      criteriosValidacion: [
        "El guion define un objetivo y un siguiente paso concreto.",
        "Incluye al menos tres objeciones frecuentes con respuesta.",
        "Fue probado en al menos dos conversaciones reales.",
      ],
    },
    fuente: "Instrumento propio Pymapa",
    capa: "conocimiento",
  },
  {
    id: "INS-EJE-PROCEDIMIENTO-BASE",
    nombre: "Procedimiento base de implementación",
    version: "1.0.0",
    tipo: "procedimiento",
    metodologia:
      "Ejecución guiada genérica: preparar, hacer, verificar y dejar registro. Se usa cuando la actividad no requiere un instrumento especializado.",
    dominios: ["D01", "D02", "D03", "D04", "D05", "D06"],
    senales: [],
    pasos: [
      {
        orden: 1,
        titulo: "Preparar",
        detalle: "Reúne la información, las personas y los accesos necesarios.",
        registro: "Lista de recursos y responsable.",
      },
      {
        orden: 2,
        titulo: "Ejecutar",
        detalle: "Realiza la actividad siguiendo los pasos de la ficha.",
        registro: "Notas de ejecución y decisiones tomadas.",
      },
      {
        orden: 3,
        titulo: "Verificar y dejar evidencia",
        detalle: "Comprueba el resultado y adjunta el documento o captura que lo demuestra.",
        registro: "Evidencia del resultado obtenido.",
      },
    ],
    entregable: {
      titulo: "Registro de ejecución",
      descripcion: "Documento breve con lo realizado, quién lo hizo, cuándo y con qué resultado.",
      formato: "registro",
      criteriosValidacion: [
        "Describe qué se hizo, quién lo hizo y cuándo.",
        "Incluye el resultado obtenido de forma observable.",
        "Adjunta al menos una evidencia del resultado.",
      ],
    },
    fuente: "Instrumento propio Pymapa",
    capa: "conocimiento",
  },
];

/** Instrumento genérico de respaldo: siempre existe en el catálogo. */
export function procedimientoBase(): InstrumentoEjecucion {
  const base = instrumentosEjecucion.find((i) => i.id === "INS-EJE-PROCEDIMIENTO-BASE");
  if (!base) throw new Error("El catálogo de instrumentos debe incluir el procedimiento base.");
  return base;
}

export function obtenerInstrumento(id: string): InstrumentoEjecucion | undefined {
  return instrumentosEjecucion.find((i) => i.id === id);
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Selección determinista del instrumento: primero por señal textual, después
 * por dominio, y en último caso el procedimiento base.
 */
export function seleccionarInstrumento(entrada: {
  titulo: string;
  objetivo?: string;
  dominioId?: string;
}): InstrumentoEjecucion {
  const texto = normalizar(`${entrada.titulo} ${entrada.objetivo ?? ""}`);

  const porSenal = instrumentosEjecucion.find(
    (i) => i.senales.length > 0 && i.senales.some((s) => texto.includes(normalizar(s)))
  );
  if (porSenal) return porSenal;

  if (entrada.dominioId) {
    const porDominio = instrumentosEjecucion.find(
      (i) => i.senales.length > 0 && i.dominios.includes(entrada.dominioId as string)
    );
    if (porDominio) return porDominio;
  }

  return procedimientoBase();
}
