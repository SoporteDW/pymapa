/**
 * Lectura de intervención · capa de CONOCIMIENTO, derivada y sin estado.
 *
 * No es una nueva fuente de verdad ni un nuevo eslabón del Journey: son
 * funciones puras que LEEN una actividad ya existente (Workspace), su ficha del
 * Plan y su instrumento, y proyectan cómo debería intervenirse esa brecha:
 * qué tipo de intervención requiere, con qué recursos y si podría requerir
 * inversión. No persiste nada, no emite hitos y no participa del orquestador de
 * siguiente paso.
 *
 * Pymapa NO determina elegibilidad crediticia, no evalúa riesgo financiero y no
 * simula crédito: solo señala que una intervención podría requerir financiación.
 */

import { obtenerInstrumento } from "@/lib/instrumentos/catalogo";
import { seleccionarPlantillaIndicador } from "@/lib/seguimiento/catalogo";
import type { ActividadWorkspace, PlantillaActividad } from "@/lib/workspace/tipos";
import type { EsfuerzoFicha, FichaAccion } from "@/lib/resultados/tipos";

export const INTERVENCION_VERSION = "intervencion-1.1.0";

export type TipoIntervencion = "proceso" | "tecnologia" | "formacion" | "asistencia_tecnica";
export type RecursosIntervencion = "internos" | "externos" | "mixtos";
export type NecesidadInversion = "si" | "no" | "por_determinar";

/**
 * Categoría de inversión: describe SOBRE QUÉ recae la intervención cuando
 * requiere recursos. Es una clasificación de la intervención, no información
 * financiera ni crediticia: no implica monto, elegibilidad ni aprobación.
 */
export type CategoriaInversion =
  | "tecnologia"
  | "software"
  | "equipos"
  | "procesos"
  | "talento"
  | "consultoria"
  | "infraestructura"
  | "otro";

export const etiquetaCategoriaInversion: Record<CategoriaInversion, string> = {
  tecnologia: "Tecnología",
  software: "Software",
  equipos: "Equipos",
  procesos: "Procesos",
  talento: "Talento",
  consultoria: "Consultoría",
  infraestructura: "Infraestructura",
  otro: "Otro",
};

export const etiquetaTipoIntervencion: Record<TipoIntervencion, string> = {
  proceso: "Estructuración del proceso",
  tecnologia: "Tecnología",
  formacion: "Formación",
  asistencia_tecnica: "Asistencia técnica o acompañamiento",
};

export const etiquetaRecursos: Record<RecursosIntervencion, string> = {
  internos: "Internos",
  externos: "Externos",
  mixtos: "Mixtos (internos y externos)",
};

export const etiquetaInversion: Record<NecesidadInversion, string> = {
  si: "Sí",
  no: "No",
  por_determinar: "Por determinar",
};

/** Entrada mínima: todo proviene de datos que ya existen en el recorrido. */
/**
 * Metadatos que la Actividad de origen (Ficha de Acción o escenario demo) ya
 * estimó. No son un nuevo estado: viajan con la plantilla de la actividad.
 */
export interface MetadatosActividad {
  esfuerzo?: EsfuerzoFicha;
  duracion?: string;
}

export interface EntradaIntervencion {
  id: string;
  titulo: string;
  objetivo: string;
  porQue: string;
  dominioId: string;
  dominioNombre: string;
  instrumentoId: string;
  esfuerzo?: EsfuerzoFicha;
  duracion?: string;
  pasos?: string[];
}

export interface RutaIntervencion {
  actividadId: string;
  version: string;
  /** Brecha observada (viene del hallazgo que originó la actividad). */
  brecha: string;
  resultadoEsperado: string;
  dominioNombre: string;
  tipos: TipoIntervencion[];
  recursos: RecursosIntervencion;
  requiereInversion: NecesidadInversion;
  /** Sobre qué recae la intervención cuando requiere recursos. */
  categoriasInversion: CategoriaInversion[];
  /** Horizonte declarado por la Actividad de origen. */
  horizonte: string;
  /** Explicabilidad: por qué Pymapa clasifica así. */
  porQue: string[];
  indicador: { nombre: string; descripcion: string; unidad: string };
}

const SENALES: Record<TipoIntervencion, string[]> = {
  tecnologia: [
    "tecnolog",
    "sistema",
    "plataforma",
    "herramienta",
    "digitaliz",
    "automatiz",
    "registro único",
    "registro unico",
    "crm",
    "tienda",
    "checkout",
    "carrito",
    "sitio",
    "integra",
  ],
  formacion: [
    "capacit",
    "formaci",
    "entrenar",
    "adopci",
    "equipo",
    "comunicar",
    "cultura",
    "hábito",
    "habito",
  ],
  asistencia_tecnica: [
    "auditor",
    "especialista",
    "asesor",
    "acompañamiento",
    "implementaci",
    "rediseñ",
    "redise",
  ],
  proceso: [
    "proceso",
    "flujo",
    "procedimiento",
    "estandariz",
    "organiz",
    "registro",
    "control",
    "seguimiento",
    "responsable",
  ],
};

/** Metadatos de esfuerzo y duración de una Actividad, desde su plantilla. */
export function metadatosDePlantilla(
  plantillas: PlantillaActividad[] | undefined,
  actividadId: string
): MetadatosActividad {
  const plantilla = plantillas?.find((p) => p.id === actividadId);
  if (!plantilla) return {};
  return {
    ...(plantilla.esfuerzo ? { esfuerzo: plantilla.esfuerzo } : {}),
    ...(plantilla.duracion ? { duracion: plantilla.duracion } : {}),
  };
}

/** Metadatos equivalentes tomados directamente de una Ficha de Acción. */
export function metadatosDeFicha(ficha?: FichaAccion | null): MetadatosActividad {
  if (!ficha) return {};
  return {
    ...(ficha.effort ? { esfuerzo: ficha.effort } : {}),
    ...(ficha.duration ? { duracion: ficha.duration } : {}),
  };
}

/** Extrae la entrada de clasificación de una actividad del Workspace. */
export function entradaDeActividad(
  actividad: ActividadWorkspace,
  metadatos?: MetadatosActividad | null
): EntradaIntervencion {
  return {
    id: actividad.id,
    titulo: actividad.titulo,
    objetivo: actividad.objetivo,
    porQue: actividad.porQue,
    dominioId: actividad.origen.dominioId,
    dominioNombre: actividad.origen.dominioNombre,
    instrumentoId: actividad.instrumentoId,
    ...(metadatos?.esfuerzo ? { esfuerzo: metadatos.esfuerzo } : {}),
    ...(metadatos?.duracion ? { duracion: metadatos.duracion } : {}),
    pasos: actividad.pasos.map((p) => p.titulo),
  };
}

/**
 * Clasificación determinista: mismas entradas, misma ruta de intervención.
 * La financiación NO es un tipo de intervención: es un posible habilitador.
 */
export function clasificarIntervencion(entrada: EntradaIntervencion): RutaIntervencion {
  const texto = `${entrada.titulo} ${entrada.objetivo} ${entrada.porQue}`.toLowerCase();
  const instrumento = obtenerInstrumento(entrada.instrumentoId);
  const porQue: string[] = [];

  const tipos: TipoIntervencion[] = [];
  const detectar = (tipo: TipoIntervencion) => {
    const senal = SENALES[tipo].find((s) => texto.includes(s));
    if (senal && !tipos.includes(tipo)) {
      tipos.push(tipo);
      porQue.push(`${etiquetaTipoIntervencion[tipo]}: la actividad menciona “${senal}”.`);
    }
  };

  detectar("proceso");
  detectar("tecnologia");
  detectar("formacion");
  detectar("asistencia_tecnica");

  if (instrumento && (instrumento.tipo === "auditoria" || instrumento.tipo === "matriz")) {
    if (!tipos.includes("asistencia_tecnica")) {
      tipos.push("asistencia_tecnica");
      porQue.push(
        `Asistencia técnica: el instrumento “${instrumento.nombre}” exige criterio experto para interpretar los resultados.`
      );
    }
  }

  if (tipos.length === 0) {
    tipos.push("proceso");
    porQue.push(
      "Estructuración del proceso: no hay señales de tecnología ni de apoyo externo, la mejora es organizativa."
    );
  }

  const requiereExterno = tipos.includes("tecnologia") || tipos.includes("asistencia_tecnica");
  const requiereInterno = tipos.includes("proceso") || tipos.includes("formacion");
  const recursos: RecursosIntervencion = requiereExterno
    ? requiereInterno
      ? "mixtos"
      : "externos"
    : "internos";
  porQue.push(
    recursos === "internos"
      ? "Recursos internos: la empresa puede ejecutarla con su propio equipo."
      : recursos === "externos"
        ? "Recursos externos: la intervención depende de terceros (proveedor o especialista)."
        : "Recursos mixtos: el equipo interno ejecuta, pero necesita apoyo externo en parte de la intervención."
  );

  let requiereInversion: NecesidadInversion = "no";
  if (tipos.includes("tecnologia") && entrada.esfuerzo === "alto") {
    requiereInversion = "si";
    porQue.push(
      "Requiere inversión: hay componente tecnológico y el esfuerzo estimado es alto."
    );
  } else if (requiereExterno) {
    requiereInversion = "por_determinar";
    porQue.push(
      "Inversión por determinar: hay componentes externos cuyo costo aún no está estimado."
    );
  } else {
    porQue.push("Sin inversión prevista: se resuelve con tiempo del equipo interno.");
  }

  const plantilla = seleccionarPlantillaIndicador({
    titulo: entrada.titulo,
    objetivo: entrada.objetivo,
    dominioId: entrada.dominioId,
  });

  const categoriasInversion =
    requiereInversion === "no" ? [] : categorizarInversion(texto, tipos);
  if (categoriasInversion.length > 0) {
    porQue.push(
      `Categoría de inversión: ${categoriasInversion
        .map((c) => etiquetaCategoriaInversion[c])
        .join(", ")} (clasificación de la intervención, no un dato financiero).`
    );
  }

  return {
    actividadId: entrada.id,
    version: INTERVENCION_VERSION,
    categoriasInversion,
    horizonte: entrada.duracion ?? "90 días (tres mediciones de seguimiento)",
    brecha: entrada.porQue,
    resultadoEsperado: entrada.objetivo,
    dominioNombre: entrada.dominioNombre,
    tipos,
    recursos,
    requiereInversion,
    porQue,
    indicador: {
      nombre: plantilla.nombre,
      descripcion: plantilla.descripcion,
      unidad: plantilla.unidad,
    },
  };
}

const SENALES_CATEGORIA: Partial<Record<CategoriaInversion, string[]>> = {
  software: [
    "software",
    "plataforma",
    "sistema",
    "crm",
    "tienda",
    "checkout",
    "carrito",
    "sitio",
    "integra",
    "licencia",
  ],
  equipos: ["equipos", "hardware", "maquinaria", "dispositivo", "impresora", "lector"],
  infraestructura: ["infraestructura", "conectividad", "red ", "servidor", "hosting", "bodega"],
};

/** Deriva sobre qué recae la inversión. Determinista y explicable. */
export function categorizarInversion(
  texto: string,
  tipos: TipoIntervencion[]
): CategoriaInversion[] {
  const categorias: CategoriaInversion[] = [];
  const agregar = (categoria: CategoriaInversion) => {
    if (!categorias.includes(categoria)) categorias.push(categoria);
  };

  if (tipos.includes("tecnologia")) agregar("tecnologia");
  if (tipos.includes("proceso")) agregar("procesos");
  if (tipos.includes("formacion")) agregar("talento");
  if (tipos.includes("asistencia_tecnica")) agregar("consultoria");

  for (const [categoria, senales] of Object.entries(SENALES_CATEGORIA)) {
    if (senales?.some((s) => texto.includes(s))) agregar(categoria as CategoriaInversion);
  }

  if (categorias.length === 0) agregar("otro");
  return categorias;
}

export interface ResumenRecursos {
  total: number
  internas: number;
  formacion: number;
  asistenciaTecnica: number;
  proveedorTecnologico: number;
  posibleFinanciacion: number;
}

/** Lectura agregada del Plan: cuenta rutas, no crea estado. */
export function agregarRecursos(rutas: RutaIntervencion[]): ResumenRecursos {
  return {
    total: rutas.length,
    internas: rutas.filter((r) => r.recursos === "internos").length,
    formacion: rutas.filter((r) => r.tipos.includes("formacion")).length,
    asistenciaTecnica: rutas.filter((r) => r.tipos.includes("asistencia_tecnica")).length,
    proveedorTecnologico: rutas.filter((r) => r.tipos.includes("tecnologia")).length,
    posibleFinanciacion: rutas.filter((r) => r.requiereInversion !== "no").length,
  };
}

export interface ProyectoFinanciable {
  actividadId: string;
  proyecto: string;
  problema: string;
  resultadoEsperado: string;
  componentes: string[];
  inversion: string;
  categoriasInversion: CategoriaInversion[];
  horizonte: string;
  indicadores: string[];
  estado: string;
}

/**
 * Proyección: no se guarda nada nuevo. Solo tiene sentido cuando la
 * intervención podría requerir inversión.
 */
export function proyectoFinanciable(
  entrada: EntradaIntervencion,
  ruta: RutaIntervencion
): ProyectoFinanciable | null {
  if (ruta.requiereInversion === "no") return null;
  return {
    actividadId: entrada.id,
    proyecto: entrada.titulo,
    problema: ruta.brecha,
    resultadoEsperado: ruta.resultadoEsperado,
    componentes: ruta.tipos.map((t) => etiquetaTipoIntervencion[t]),
    inversion: "Por estimar",
    categoriasInversion: ruta.categoriasInversion,
    horizonte: ruta.horizonte,
    indicadores: [ruta.indicador.nombre, "Adopción de la mejora"],
    estado: "Requiere estructuración y validación financiera",
  };
}
