/**
 * Generación automática del Roadmap (POC-06, sección 6).
 * Transforma las Fichas de Acción del POC-05 en acciones ejecutables con fase,
 * fechas sugeridas, dependencias y trazabilidad. Función pura y determinista.
 */

import type { FichaAccion, ResultadoPyme } from "@/lib/resultados/tipos";
import { desplazamientoFase, duracionEnDias, fasesRoadmap, horizonteSugerido, ordenFase } from "./fases";
import { hoyISO, sumarDias } from "./fechas";
import { ROADMAP_VERSION, type AccionRoadmap, type FaseId, type PasoChecklist, type RegistroAvance, type Roadmap } from "./tipos";

const SIN_RESPONSABLE = "";

function checklistDe(ficha: FichaAccion): PasoChecklist[] {
  return ficha.steps.map((texto, indice) => ({
    id: `${ficha.id}-P${indice + 1}`,
    texto,
    completado: false,
  }));
}

/** Dependencia explícita: la prioridad habilitadora del POC-05. */
function dependenciasDeFicha(resultado: ResultadoPyme, ficha: FichaAccion): string[] {
  const prioridad = resultado.priorities.find((p) => p.id === ficha.priorityId);
  if (!prioridad?.habilitadaPor) return [];
  const habilitadora = resultado.actions.find((a) => a.priorityId === prioridad.habilitadaPor);
  if (!habilitadora || habilitadora.id === ficha.id) return [];
  return [`ACC-${habilitadora.id}`];
}

export interface OpcionesGeneracion {
  empresaId?: string;
  /** Fecha base de las fechas sugeridas; permite pruebas deterministas. */
  hoy?: string;
  responsablePorDefecto?: string;
}

export function generarRoadmap(
  resultado: ResultadoPyme,
  opciones: OpcionesGeneracion = {}
): Roadmap {
  const hoy = opciones.hoy ?? hoyISO();
  const creado = new Date().toISOString();

  // POC-06, 6.1: una acción por Ficha de Acción activa (en POC-05 todas nacen pendientes).
  const activas = resultado.actions;


  const borradores = activas.map((ficha) => {
    const dependencias = dependenciasDeFicha(resultado, ficha);
    const fase = horizonteSugerido(ficha.priorityLevel, ficha.effort, dependencias.length > 0);
    const dias = duracionEnDias(ficha.effort);
    const inicio = sumarDias(hoy, desplazamientoFase(fase));
    const objetivo = sumarDias(inicio, dias);
    const origenHallazgo = ficha.sourceRefs.hallazgos[0] ?? null;

    const accion: AccionRoadmap = {
      id: `ACC-${ficha.id}`,
      fichaAccionId: ficha.id,
      hallazgoId: origenHallazgo?.id ?? null,
      titulo: ficha.title,
      objetivo: ficha.impactExpected,
      porQueImporta: ficha.whyItMatters,
      prioridadOrigen: ficha.priorityLevel,
      prioridadOrigenLabel: ficha.priorityLabel,
      prioridadScore: ficha.priorityScore,
      prioridadOperativa: ficha.priorityLevel,
      impacto: ficha.impactExpected,
      esfuerzo: ficha.effort,
      duracion: ficha.duration,
      duracionDias: dias,
      // POC-06, 6.7: sin responsable asignado se muestra advertencia no bloqueante.
      responsable: SIN_RESPONSABLE,
      responsableSugerido: ficha.ownerRole,
      fechaInicio: inicio,
      fechaObjetivo: objetivo,
      fechaInicioOriginal: inicio,
      fechaObjetivoOriginal: objetivo,
      faseId: fase,
      faseOriginal: fase,
      orden: 0,
      estado: dependencias.length > 0 ? "PENDIENTE" : "LISTA",
      avance: 0,
      checklist: checklistDe(ficha),
      indicadores: ficha.indicators,
      dependencias,
      notas: [],
      evidencias: [],
      motivoDescarte: null,
      requiereValidacion: ficha.requiereValidacion,
      origen: {
        fichaAccionId: ficha.id,
        hallazgoId: origenHallazgo?.id ?? null,
        hallazgoTitulo: origenHallazgo?.titulo ?? null,
        prioridadId: ficha.priorityId,
        dimensionId: ficha.dimensionId,
        dimensionNombre: ficha.dimensionNombre,
        capacidadNombre: ficha.sourceRefs.capacidadNombre,
        reglas: ficha.sourceRefs.reglas,
        preguntas: ficha.sourceRefs.preguntas,
        executionId: ficha.sourceRefs.executionId,
      },
      actualizadaEn: creado,
    };
    return accion;
  });

  const acciones = ordenarSecuencia(borradores);

  const historial: RegistroAvance[] = acciones.map((accion, indice) => ({
    id: `HIS-${accion.id}-${indice}`,
    accionId: accion.id,
    fecha: creado,
    usuario: "Sistema",
    tipo: "creacion",
    estadoAnterior: null,
    estadoNuevo: accion.estado,
    porcentaje: 0,
    comentario: `Acción generada desde la ficha ${accion.fichaAccionId} en la fase ${accion.faseId}.`,
    evidenciaId: null,
  }));

  return {
    id: `RM-${resultado.executionId}`,
    empresaId: opciones.empresaId ?? "empresa-demo",
    executionId: resultado.executionId,
    version: ROADMAP_VERSION,
    fechaCreacion: creado,
    fechaActualizacion: creado,
    estadoGeneral: "borrador",
    horizonte: "6 meses",
    fases: fasesRoadmap,
    acciones,
    bloqueos: [],
    historial,
    esDemo: false,
  };
}

/**
 * Secuenciación (POC-06, 6.4, 6.5 y 6.6): ninguna acción dependiente puede
 * quedar en una fase anterior a su predecesora, y el orden dentro de cada fase
 * respeta prioridad y esfuerzo.
 */
export function ordenarSecuencia(acciones: AccionRoadmap[]): AccionRoadmap[] {
  const mapa = new Map(acciones.map((a) => [a.id, { ...a }]));

  // Empuje iterativo: una dependiente nunca precede a su predecesora.
  for (let pasada = 0; pasada < acciones.length; pasada += 1) {
    let cambios = false;
    for (const accion of mapa.values()) {
      for (const depId of accion.dependencias) {
        const dep = mapa.get(depId);
        if (!dep) continue;
        if (ordenFase(accion.faseId) <= ordenFase(dep.faseId)) {
          const siguiente = faseSiguiente(dep.faseId);
          if (siguiente !== accion.faseId) {
            accion.faseId = siguiente;
            cambios = true;
          }
        }
      }
    }
    if (!cambios) break;
  }

  const rangoPrioridad: Record<string, number> = { critica: 4, alta: 3, media: 2, baja: 1 };
  const rangoEsfuerzo: Record<string, number> = { bajo: 1, medio: 2, alto: 3 };

  const lista = [...mapa.values()].sort(
    (a, b) =>
      ordenFase(a.faseId) - ordenFase(b.faseId) ||
      (rangoPrioridad[b.prioridadOperativa] ?? 0) - (rangoPrioridad[a.prioridadOperativa] ?? 0) ||
      b.prioridadScore - a.prioridadScore ||
      (rangoEsfuerzo[a.esfuerzo] ?? 2) - (rangoEsfuerzo[b.esfuerzo] ?? 2) ||
      a.titulo.localeCompare(b.titulo)
  );

  const contadores: Record<FaseId, number> = { ahora: 0, proximamente: 0, mas_adelante: 0 };
  return lista.map((accion) => {
    contadores[accion.faseId] += 1;
    return { ...accion, orden: contadores[accion.faseId] };
  });
}

export function faseSiguiente(fase: FaseId): FaseId {
  if (fase === "ahora") return "proximamente";
  return "mas_adelante";
}

/**
 * Recalcula solo la secuencia afectada al cambiar una fecha (POC-06, 6.10):
 * las dependientes que empiecen antes del cierre de su predecesora se desplazan.
 */
export function recalcularDependientes(
  acciones: AccionRoadmap[],
  accionIdCambiada: string
): AccionRoadmap[] {
  const mapa = new Map(acciones.map((a) => [a.id, { ...a }]));
  const cola = [accionIdCambiada];
  const visitados = new Set<string>();

  while (cola.length > 0) {
    const actual = cola.shift()!;
    if (visitados.has(actual)) continue;
    visitados.add(actual);
    const base = mapa.get(actual);
    if (!base?.fechaObjetivo) continue;

    for (const candidata of mapa.values()) {
      if (!candidata.dependencias.includes(actual)) continue;
      const minimoInicio = sumarDias(base.fechaObjetivo, 1);
      if (!candidata.fechaInicio || candidata.fechaInicio < minimoInicio) {
        candidata.fechaInicio = minimoInicio;
        candidata.fechaObjetivo = sumarDias(minimoInicio, candidata.duracionDias);
        cola.push(candidata.id);
      }
    }
  }

  return [...mapa.values()];
}
