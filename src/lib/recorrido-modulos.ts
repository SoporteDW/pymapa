/**
 * Secuencia cronológica del recorrido (iteración de refinamiento UX).
 *
 * Complementa `src/lib/recorrido.ts` (POC-02) sin modificar sus etapas ni la
 * lógica de negocio: aquí solo se describe el orden de los módulos visibles en
 * el menú y el avance de cada uno para poder guiar al usuario paso a paso.
 */

import type { SesionMVP } from "@/types";
import type { EtapaJourneyId } from "@/lib/journey/etapas";

export type ModuloId =
  | "perfil"
  | "diagnostico"
  | "resultados"
  | "plan-de-accion"
  | "roadmap"
  | "indicadores";

export interface ModuloRecorrido {
  id: ModuloId;
  numero: number;
  label: string;
  ruta: string;
  descripcion: string;
  /** Etapa del Journey Maestro (fuente única) a la que se subordina el módulo. */
  etapa: EtapaJourneyId;
}

/**
 * Catálogo de módulos, incluida la vista Roadmap.
 *
 * El Roadmap NO forma parte de la secuencia del recorrido: es una vista
 * temporal/organizativa subordinada a Etapa 3 · Actuar. Se conserva en el
 * catálogo para poder describirlo y enlazarlo, no para exigirlo como paso.
 */
export const catalogoModulos: ModuloRecorrido[] = [
  {
    id: "perfil",
    numero: 1,
    label: "Perfil de empresa",
    ruta: "/perfil",
    descripcion: "Registra el contexto básico de tu empresa.",
    etapa: "preparar",
  },
  {
    id: "diagnostico",
    numero: 2,
    label: "Diagnóstico",
    ruta: "/diagnostico",
    descripcion: "Responde el diagnóstico guiado paso a paso.",
    etapa: "diagnosticar",
  },
  {
    id: "resultados",
    numero: 3,
    label: "Resultados",
    ruta: "/resultados",
    descripcion: "Comprende tu estado actual y tus prioridades.",
    etapa: "diagnosticar",
  },
  {
    id: "plan-de-accion",
    numero: 4,
    label: "Plan de Acción",
    ruta: "/plan-de-accion",
    descripcion: "Ejecuta y valida tus Actividades, una a la vez.",
    etapa: "actuar",
  },
  {
    id: "indicadores",
    numero: 5,
    label: "Indicadores",
    ruta: "/dashboard",
    descripcion: "Sigue tu avance y define el siguiente movimiento.",
    etapa: "seguir",
  },
  {
    id: "roadmap",
    // Vista de consulta: sin número propio dentro de la secuencia.
    numero: 4,
    label: "Roadmap",
    ruta: "/roadmap",
    descripcion: "Vista en el tiempo de las mismas Actividades de tu Plan.",
    etapa: "actuar",
  },
];

/** Secuencia oficial: Perfil → Diagnóstico → Resultados → Plan → Indicadores. */
export const secuenciaRecorrido: ModuloRecorrido[] = catalogoModulos.filter(
  (m) => m.id !== "roadmap"
);

/** Módulos funcionales que componen cada etapa conceptual. */
export function modulosDeEtapa(etapa: EtapaJourneyId): ModuloRecorrido[] {
  return secuenciaRecorrido.filter((m) => m.etapa === etapa);
}


export function etapaDeModulo(id: ModuloId): EtapaJourneyId {
  return moduloPorId(id).etapa;
}

export type EstadoModulo = "no_iniciada" | "en_progreso" | "completada";

export const etiquetaEstadoModulo: Record<EstadoModulo, string> = {
  no_iniciada: "No iniciado",
  en_progreso: "En progreso",
  completada: "Completado",
};

export interface AvanceModulo {
  porcentaje: number;
  estado: EstadoModulo;
}

function estadoDesdePorcentaje(porcentaje: number): EstadoModulo {
  if (porcentaje >= 100) return "completada";
  if (porcentaje > 0) return "en_progreso";
  return "no_iniciada";
}

const acotar = (valor: number) => Math.max(0, Math.min(100, Math.round(valor)));

/**
 * Perfil: solo tres campos son obligatorios (nombre, sector y tamaño). El
 * módulo llega a 100% cuando esos campos están completos y el perfil fue
 * guardado; los campos complementarios no bloquean la etapa.
 */
function porcentajePerfil(sesion: SesionMVP): number {
  const e = sesion.empresa;
  // Sector y tamaño traen un valor por defecto, así que sin nombre el módulo
  // sigue en cero: no hay progreso real hasta que la empresa se identifica.
  if (String(e.nombre ?? "").trim().length === 0) return 0;
  const obligatorios = [e.nombre, e.sector, e.tamaño];
  const llenos = obligatorios.filter((c) => String(c ?? "").trim().length > 0).length;
  if (llenos === obligatorios.length && sesion.perfilCompletado) return 100;
  return acotar((llenos / (obligatorios.length + 1)) * 100);
}


/** Diagnóstico: 100% solo cuando el instrumento quedó formalmente completado. */
function porcentajeDiagnostico(sesion: SesionMVP): number {
  const d = sesion.diagnostico;
  if (d.estado === "completado") return 100;
  const respondidas = d.respondidasObligatorias ?? sesion.respuestas.length;
  const total = d.totalPreguntas ?? d.totalPasos ?? 0;
  const calculado = total > 0 ? (respondidas / total) * 100 : (d.progreso ?? 0);
  return Math.min(99, acotar(calculado));
}

/**
 * Avance por módulo derivado exclusivamente del estado ya persistido en la
 * sesión: es la única fuente de verdad para Inicio, el menú lateral, los
 * encabezados de etapa y el mapa del recorrido.
 */
export function avanceModulos(
  sesion: SesionMVP,
  /**
   * Estado narrativo del diagnóstico (Macroentrega 4.1). Cuando se recibe, el
   * módulo Diagnóstico no puede marcar 100% mientras haya profundización
   * pendiente, aunque el cuestionario esté completo.
   */
  journeyDiagnostico?: { porcentajeModulo: number },
  /**
   * Ejecución real de la Etapa 3 proyectada desde el Workspace
   * (`lib/actuar/plan.ts`). Sin este dato el Plan nunca puede pasar de
   * "construido" (50%): tener Actividades no es haberlas ejecutado.
   */
  actuar?: { total: number; validadas: number; enCurso: number; cerrado: boolean }
): Record<ModuloId, AvanceModulo> {
  const perfil = porcentajePerfil(sesion);
  const diagnostico = journeyDiagnostico
    ? acotar(journeyDiagnostico.porcentajeModulo)
    : porcentajeDiagnostico(sesion);

  const resultados =
    sesion.diagnostico.resultadosGenerados && sesion.resultados.length > 0
      ? 100
      : diagnostico >= 100
        ? 50
        : 0;

  const construido = (actuar?.total ?? sesion.acciones.length) > 0;

  /**
   * Plan de Acción: la existencia de Actividades solo significa "construido".
   * El 100% exige el cierre real del Plan (todas las Actividades validadas).
   */
  const plan = !construido
    ? resultados >= 100
      ? 25
      : 0
    : actuar
      ? actuar.cerrado
        ? 100
        : Math.min(
            99,
            acotar(
              40 + ((actuar.validadas + actuar.enCurso * 0.5) / Math.max(1, actuar.total)) * 59
            )
          )
      : 40;

  // Roadmap: vista subordinada; refleja exactamente el avance del Plan.
  const roadmap = plan;

  // Indicadores: seguimiento; solo tras el cierre real del Plan.
  const indicadores = plan >= 100 ? (sesion.acciones.length > 0 ? 50 : 50) : 0;

  const valores: Record<ModuloId, number> = {
    perfil,
    diagnostico,
    resultados,
    "plan-de-accion": plan,
    roadmap,
    indicadores,
  };

  return Object.fromEntries(
    Object.entries(valores).map(([id, porcentaje]) => [
      id,
      { porcentaje, estado: estadoDesdePorcentaje(porcentaje) },
    ])
  ) as Record<ModuloId, AvanceModulo>;
}

/** Primer módulo del recorrido que aún no está completo. */
export function primerModuloPendiente(sesion: SesionMVP): ModuloRecorrido | null {
  const avances = avanceModulos(sesion);
  return secuenciaRecorrido.find((m) => avances[m.id].porcentaje < 100) ?? null;
}

/** Estado global del recorrido con los mismos tres estados de cada módulo. */
export function estadoRecorrido(sesion: SesionMVP): EstadoModulo {
  const avances = avanceModulos(sesion);
  const valores = secuenciaRecorrido.map((m) => avances[m.id].porcentaje);
  if (valores.every((v) => v >= 100)) return "completada";
  if (valores.some((v) => v > 0)) return "en_progreso";
  return "no_iniciada";
}


export function moduloPorId(id: ModuloId): ModuloRecorrido {
  return catalogoModulos.find((m) => m.id === id)!;
}


/** El Roadmap es una vista del Plan: comparte su lugar en la secuencia. */
function idEnSecuencia(id: ModuloId): ModuloId {
  return id === "roadmap" ? "plan-de-accion" : id;
}

export function moduloAnterior(id: ModuloId): ModuloRecorrido | null {
  const indice = secuenciaRecorrido.findIndex((m) => m.id === idEnSecuencia(id));
  return indice > 0 ? (secuenciaRecorrido[indice - 1] ?? null) : null;
}

export function moduloSiguiente(id: ModuloId): ModuloRecorrido | null {
  const indice = secuenciaRecorrido.findIndex((m) => m.id === idEnSecuencia(id));
  return indice >= 0 && indice < secuenciaRecorrido.length - 1
    ? (secuenciaRecorrido[indice + 1] ?? null)
    : null;
}

