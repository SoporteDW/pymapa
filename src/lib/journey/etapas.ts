/**
 * Macroentrega 5 · Journey Maestro: las cuatro etapas visibles.
 *
 *   Preparar → Diagnosticar → Actuar → Seguir
 *
 * Regla UX: explorar es libre, avanzar es secuencial. Esta capa NO elimina los
 * módulos existentes (Resultados, Roadmap, Indicadores, Colaboración, Apoyo):
 * los subordina como vistas de consulta dentro de una etapa.
 *
 * Función pura: no lee almacenamiento ni conoce componentes.
 */

import type { EstadoJourneyDiagnostico } from "@/lib/diagnostico/estado-journey";
import type { EstadoEjecucion } from "@/lib/workspace/tipos";

export type EtapaJourneyId = "preparar" | "diagnosticar" | "actuar" | "seguir";

export type EstadoEtapaJourney = "completada" | "en_curso" | "pendiente";

export interface EtapaJourney {
  id: EtapaJourneyId;
  numero: number;
  titulo: string;
  descripcion: string;
  /** Entrada natural de la etapa. */
  ruta: string;
  /** Vistas de consulta subordinadas (no son etapas). */
  consultas: { label: string; ruta: string }[];
}

export const etapasJourney: EtapaJourney[] = [
  {
    id: "preparar",
    numero: 1,
    titulo: "Preparar",
    descripcion: "Contamos con el contexto de tu empresa para poder interpretar todo lo demás.",
    ruta: "/perfil",
    consultas: [],
  },
  {
    id: "diagnosticar",
    numero: 2,
    titulo: "Diagnosticar",
    descripcion: "Cuestionario, resultado preliminar, profundización y diagnóstico final.",
    ruta: "/diagnostico",
    consultas: [
      { label: "Resultados del diagnóstico", ruta: "/resultados" },
      { label: "Diagnósticos especializados", ruta: "/diagnostico/especializados" },
    ],
  },
  {
    id: "actuar",
    numero: 3,
    titulo: "Actuar",
    descripcion: "Actividades priorizadas, ejecución con instrumentos, entrega y validación.",
    ruta: "/plan-de-accion",
    consultas: [
      { label: "Roadmap (vista temporal)", ruta: "/roadmap" },
      { label: "Colaboración", ruta: "/colaboracion" },
      { label: "Apoyo experto", ruta: "/apoyo" },
    ],
  },
  {
    id: "seguir",
    numero: 4,
    titulo: "Seguir",
    descripcion: "Comprobamos si las acciones ejecutadas produjeron resultados.",
    ruta: "/seguimiento",
    consultas: [{ label: "Indicadores", ruta: "/dashboard" }],
  },
];

export function etapaJourneyPorId(id: EtapaJourneyId): EtapaJourney {
  return etapasJourney.find((e) => e.id === id)!;
}

export interface EntradaJourneyMaestro {
  perfilCompletado: boolean;
  /** Estado de la máquina única del diagnóstico (Macroentrega 4.1). */
  estadoDiagnostico: EstadoJourneyDiagnostico;
  /**
   * Estado del Plan derivado de la ejecución del Workspace
   * (`lib/actuar/plan.ts`). "construido" no implica "completado": la etapa
   * Actuar solo se completa cuando el Plan se cierra de verdad.
   */
  plan: { construido: boolean; total: number; validadas: number; cerrado: boolean };
  /**
   * El usuario ya confirmó el cierre del Plan (Entregable 2). Sin ese hito la
   * etapa Actuar no se da por completada, aunque toda la ejecución esté
   * validada: el cierre es un paso narrativo que el usuario debe vivir.
   */
  cierrePlanConfirmado?: boolean;
  /** Seguimientos abiertos y si ya tienen alguna medición registrada. */
  seguimientos: { cerrado: boolean; conMedicion: boolean }[];
}


export interface BloqueoEtapa {
  /** Explicación en lenguaje de la pyme: qué falta antes de esta etapa. */
  motivo: string;
  /** Único CTA admitido mientras la etapa está bloqueada. */
  label: string;
  ruta: string;
}

export interface EtapaConEstado {
  etapa: EtapaJourney;
  estado: EstadoEtapaJourney;
  etiqueta: string;
  /** null cuando la etapa ya se puede trabajar. */
  bloqueo: BloqueoEtapa | null;
}

export interface JourneyMaestro {
  etapas: EtapaConEstado[];
  activa: EtapaJourneyId;
  bloqueo: (id: EtapaJourneyId) => BloqueoEtapa | null;
}

export const etiquetaEstadoEtapa: Record<EstadoEtapaJourney, string> = {
  completada: "Completada",
  en_curso: "En curso",
  pendiente: "Más adelante",
};

const BLOQUEO_PERFIL: BloqueoEtapa = {
  motivo: "Primero necesitamos el contexto de tu empresa para interpretar el diagnóstico.",
  label: "Completar el perfil de mi empresa",
  ruta: "/perfil",
};

const BLOQUEO_DIAGNOSTICO: BloqueoEtapa = {
  motivo:
    "Primero debes completar tu diagnóstico. Las actividades de tu plan nacen de sus hallazgos, así que todavía no podemos recomendarte qué ejecutar.",
  label: "Ir a mi diagnóstico",
  ruta: "/diagnostico",
};

const BLOQUEO_EJECUCION: BloqueoEtapa = {
  motivo:
    "El seguimiento comprueba si lo ejecutado produjo resultados. Todavía no hay ninguna actividad validada que medir.",
  label: "Ir a mi Plan de Acción",
  ruta: "/plan-de-accion",
};

/** Estado de las cuatro etapas visibles a partir del estado real del recorrido. */
export function journeyMaestro(entrada: EntradaJourneyMaestro): JourneyMaestro {
  const perfilOk = entrada.perfilCompletado;
  const diagnosticoCerrado = entrada.estadoDiagnostico === "diagnostico_final";
  const diagnosticoIniciado = entrada.estadoDiagnostico !== "no_iniciado";

  // Workspace es la fuente única de la ejecución; aquí solo se lee su proyección.
  const plan = entrada.plan;
  const planCerrado = plan.cerrado;
  const cierreVivido = planCerrado && entrada.cierrePlanConfirmado === true;

  const seguimientos = entrada.seguimientos;
  const seguimientoCompleto =
    seguimientos.length > 0 && seguimientos.every((s) => s.cerrado);

  const estados: Record<EtapaJourneyId, EstadoEtapaJourney> = {
    preparar: perfilOk ? "completada" : "en_curso",
    diagnosticar: !perfilOk
      ? "pendiente"
      : diagnosticoCerrado
        ? "completada"
        : diagnosticoIniciado
          ? "en_curso"
          : "en_curso",
    // "Plan construido" NO completa Actuar: solo su cierre real lo hace.
    actuar: !diagnosticoCerrado ? "pendiente" : cierreVivido ? "completada" : "en_curso",
    // Seguir se habilita únicamente con el cierre real del Plan.
    seguir: !diagnosticoCerrado || !planCerrado
      ? "pendiente"
      : seguimientoCompleto
        ? "completada"
        : "en_curso",
  };

  const bloqueos: Record<EtapaJourneyId, BloqueoEtapa | null> = {
    preparar: null,
    diagnosticar: perfilOk ? null : BLOQUEO_PERFIL,
    actuar: diagnosticoCerrado ? null : BLOQUEO_DIAGNOSTICO,
    seguir: !diagnosticoCerrado ? BLOQUEO_DIAGNOSTICO : planCerrado ? null : BLOQUEO_EJECUCION,
  };

  const orden: EtapaJourneyId[] = ["preparar", "diagnosticar", "actuar", "seguir"];
  const activa = orden.find((id) => estados[id] !== "completada") ?? "seguir";


  const etapas: EtapaConEstado[] = orden.map((id) => ({
    etapa: etapaJourneyPorId(id),
    estado: estados[id],
    etiqueta: etiquetaEstadoEtapa[estados[id]],
    bloqueo: bloqueos[id],
  }));

  return {
    etapas,
    activa,
    bloqueo: (id) => bloqueos[id],
  };
}

/** Señales auxiliares para el relato del Plan de Acción. */
export function resumenEjecucion(actividades: EstadoEjecucion[]) {
  const cuenta = (estado: EstadoEjecucion) => actividades.filter((e) => e === estado).length;
  return {
    total: actividades.length,
    pendientes: cuenta("pendiente"),
    enEjecucion: cuenta("en_ejecucion"),
    entregadas: cuenta("entregado"),
    requierenAjustes: cuenta("requiere_ajustes"),
    validadas: cuenta("validado"),
    completo: actividades.length > 0 && cuenta("validado") === actividades.length,
  };
}
