/**
 * Secuencia cronológica del recorrido (iteración de refinamiento UX).
 *
 * Complementa `src/lib/recorrido.ts` (POC-02) sin modificar sus etapas ni la
 * lógica de negocio: aquí solo se describe el orden de los módulos visibles en
 * el menú y el avance de cada uno para poder guiar al usuario paso a paso.
 */

import type { SesionMVP } from "@/types";

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
}

/** Secuencia oficial: Perfil → Diagnóstico → Resultados → Plan → Roadmap → Indicadores. */
export const secuenciaRecorrido: ModuloRecorrido[] = [
  {
    id: "perfil",
    numero: 1,
    label: "Perfil de empresa",
    ruta: "/perfil",
    descripcion: "Registra el contexto básico de tu empresa.",
  },
  {
    id: "diagnostico",
    numero: 2,
    label: "Diagnóstico",
    ruta: "/diagnostico",
    descripcion: "Responde el diagnóstico guiado paso a paso.",
  },
  {
    id: "resultados",
    numero: 3,
    label: "Resultados",
    ruta: "/resultados",
    descripcion: "Comprende tu estado actual y tus prioridades.",
  },
  {
    id: "plan-de-accion",
    numero: 4,
    label: "Plan de Acción",
    ruta: "/plan-de-accion",
    descripcion: "Revisa las fichas de acción priorizadas.",
  },
  {
    id: "roadmap",
    numero: 5,
    label: "Roadmap",
    ruta: "/roadmap",
    descripcion: "Organiza y ejecuta tus acciones por fases.",
  },
  {
    id: "indicadores",
    numero: 6,
    label: "Indicadores",
    ruta: "/dashboard",
    descripcion: "Sigue tu avance y define el siguiente movimiento.",
  },
];

export type EstadoModulo = "no_iniciada" | "en_progreso" | "completada";

export const etiquetaEstadoModulo: Record<EstadoModulo, string> = {
  no_iniciada: "No iniciada",
  en_progreso: "En progreso",
  completada: "Completada",
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

function porcentajePerfil(sesion: SesionMVP): number {
  const e = sesion.empresa;
  const campos = [e.nombre, e.sector, e.tamaño, e.responsable, e.correo, e.ciudad, e.pais];
  const llenos = campos.filter((c) => String(c ?? "").trim().length > 0).length;
  if (sesion.perfilCompletado && llenos === campos.length) return 100;
  return Math.round((llenos / campos.length) * 100);
}

/** Avance por módulo derivado exclusivamente del estado ya persistido en la sesión. */
export function avanceModulos(sesion: SesionMVP): Record<ModuloId, AvanceModulo> {
  const perfil = porcentajePerfil(sesion);
  const diagnostico = Math.max(
    0,
    Math.min(100, Math.round(sesion.diagnostico.progreso ?? 0))
  );
  const resultados =
    sesion.diagnostico.resultadosGenerados && sesion.resultados.length > 0
      ? 100
      : diagnostico >= 100
        ? 50
        : 0;
  const total = sesion.acciones.length;
  const revisadas = sesion.acciones.filter((a) => a.estado !== "pendiente").length;
  const completadas = sesion.acciones.filter((a) => a.estado === "completada").length;
  const plan = total === 0 ? 0 : resultados === 100 && revisadas === 0 ? 25 : Math.round((revisadas / total) * 100);
  const roadmap = total === 0 ? 0 : Math.round((completadas / total) * 100) || (revisadas > 0 ? 20 : 0);
  const indicadores = revisadas > 0 ? Math.min(100, roadmap || 20) : 0;

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

