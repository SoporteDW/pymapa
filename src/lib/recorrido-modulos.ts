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

/** Secuencia oficial: Perfil → Diagnóstico → Resultados → Plan → Roadmap → Indicadores. */
export const secuenciaRecorrido: ModuloRecorrido[] = [
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
    descripcion: "Revisa las fichas de acción priorizadas.",
    etapa: "actuar",
  },
  {
    id: "roadmap",
    numero: 5,
    label: "Roadmap",
    ruta: "/roadmap",
    descripcion: "Organiza y ejecuta tus acciones por fases.",
    etapa: "actuar",
  },
  {
    id: "indicadores",
    numero: 6,
    label: "Indicadores",
    ruta: "/dashboard",
    descripcion: "Sigue tu avance y define el siguiente movimiento.",
    etapa: "seguir",
  },
];

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
  journeyDiagnostico?: { porcentajeModulo: number }
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

  const total = sesion.acciones.length;
  const iniciadas = sesion.acciones.filter((a) => a.estado !== "pendiente").length;
  const completadas = sesion.acciones.filter((a) => a.estado === "completada").length;
  const enProgreso = sesion.acciones.filter((a) => a.estado === "en_progreso").length;

  // Plan de acción: se considera completo cuando el plan existe con sus fichas.
  const plan = total > 0 ? 100 : resultados >= 100 ? 50 : 0;

  // Roadmap: ejecución real de las acciones del plan.
  const roadmap =
    total === 0 ? 0 : acotar(((completadas + enProgreso * 0.5) / total) * 100);

  // Indicadores: seguimiento; se completa cuando toda la ejecución terminó.
  const indicadores = total === 0 ? 0 : roadmap >= 100 ? 100 : iniciadas > 0 ? 50 : 0;

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
  return secuenciaRecorrido.find((m) => m.id === id)!;
}

export function moduloAnterior(id: ModuloId): ModuloRecorrido | null {
  const indice = secuenciaRecorrido.findIndex((m) => m.id === id);
  return indice > 0 ? (secuenciaRecorrido[indice - 1] ?? null) : null;
}

export function moduloSiguiente(id: ModuloId): ModuloRecorrido | null {
  const indice = secuenciaRecorrido.findIndex((m) => m.id === id);
  return indice >= 0 && indice < secuenciaRecorrido.length - 1
    ? (secuenciaRecorrido[indice + 1] ?? null)
    : null;
}

