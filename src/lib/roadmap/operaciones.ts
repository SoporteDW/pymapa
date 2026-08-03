/**
 * Operaciones del Roadmap (POC-06, secciones 5, 12, 13, 14 y 19).
 * Todas devuelven un Roadmap nuevo: inmutabilidad para historial confiable.
 * Ninguna operación elimina registros; descartar es un estado.
 */

import { calcularAvance, estadoGeneralDe, usaChecklist } from "./avance";
import {
  dependenciasPendientes,
  esFinal,
  transicionValida,
  validarCierre,
  validarFechas,
  validarMotivo,
  type ResultadoValidacion,
} from "./estados";
import { ordenarSecuencia, recalcularDependientes } from "./generador";
import { hoyISO } from "./fechas";
import type {
  AccionRoadmap,
  Bloqueo,
  EstadoAccionRoadmap,
  Evidencia,
  FaseId,
  RegistroAvance,
  Roadmap,
  TipoBloqueo,
  TipoEvidencia,
  TipoRegistroAvance,
} from "./tipos";
import type { NivelPrioridad } from "@/lib/resultados/tipos";

export const USUARIO_DEMO = "Tú";

export interface ResultadoOperacion {
  ok: boolean;
  roadmap: Roadmap;
  mensaje?: string | undefined;
  /** true cuando la operación exige confirmación explícita del usuario. */
  requiereConfirmacion?: boolean | undefined;

}

let secuencia = 0;
function nuevoId(prefijo: string): string {
  secuencia += 1;
  return `${prefijo}-${Date.now().toString(36)}-${secuencia}`;
}

function registro(
  accionId: string,
  tipo: TipoRegistroAvance,
  comentario: string,
  extra: Partial<RegistroAvance> = {}
): RegistroAvance {
  return {
    id: nuevoId("HIS"),
    accionId,
    fecha: new Date().toISOString(),
    usuario: USUARIO_DEMO,
    tipo,
    estadoAnterior: null,
    estadoNuevo: null,
    porcentaje: null,
    comentario,
    evidenciaId: null,
    ...extra,
  };
}

function aplicar(
  roadmap: Roadmap,
  acciones: AccionRoadmap[],
  registros: RegistroAvance[],
  bloqueos = roadmap.bloqueos
): Roadmap {
  const siguiente: Roadmap = {
    ...roadmap,
    acciones: ordenarSecuencia(acciones),
    bloqueos,
    historial: [...registros, ...roadmap.historial],
    fechaActualizacion: new Date().toISOString(),
  };
  return { ...siguiente, estadoGeneral: estadoGeneralDe(siguiente) };
}

function reemplazar(
  acciones: AccionRoadmap[],
  accionId: string,
  cambios: Partial<AccionRoadmap>
): AccionRoadmap[] {
  return acciones.map((accion) =>
    accion.id === accionId
      ? { ...accion, ...cambios, actualizadaEn: new Date().toISOString() }
      : accion
  );
}

export function buscarAccion(roadmap: Roadmap, accionId: string): AccionRoadmap | undefined {
  return roadmap.acciones.find((accion) => accion.id === accionId);
}

/* ------------------------------------------------------------------ */
/* Transiciones de estado                                              */
/* ------------------------------------------------------------------ */

export interface OpcionesTransicion {
  comentario?: string;
  /** Confirma ajustes que el sistema debe aplicar (avance a 100 %, dependencias). */
  confirmado?: boolean;
}

export function cambiarEstado(
  roadmap: Roadmap,
  accionId: string,
  nuevoEstado: EstadoAccionRoadmap,
  opciones: OpcionesTransicion = {}
): ResultadoOperacion {
  const accion = buscarAccion(roadmap, accionId);
  if (!accion) return { ok: false, roadmap, mensaje: "No encontramos esa acción." };

  if (!transicionValida(accion.estado, nuevoEstado)) {
    return {
      ok: false,
      roadmap,
      mensaje: `No es posible pasar de “${accion.estado}” a “${nuevoEstado}”.`,
    };
  }

  // POC-06, 15 y 19: iniciar con dependencia pendiente se bloquea.
  if (nuevoEstado === "EN_CURSO") {
    const pendientes = dependenciasPendientes(roadmap, accion);
    if (pendientes.length > 0) {
      return {
        ok: false,
        roadmap,
        mensaje: `No puedes iniciarla todavía: primero debe avanzar “${pendientes[0]!.titulo}”.`,
      };
    }
  }

  if (nuevoEstado === "BLOQUEADA") {
    return {
      ok: false,
      roadmap,
      mensaje: "Describe el impedimento para registrar el bloqueo.",
    };
  }

  if (nuevoEstado === "DESCARTADA") {
    return { ok: false, roadmap, mensaje: "Descartar requiere un motivo." };
  }

  if (nuevoEstado === "COMPLETADA") {
    const cierre = validarCierre(accion);
    if (!cierre.valido) return { ok: false, roadmap, mensaje: cierre.mensaje };

    const avanceActual = calcularAvance(accion);
    if (avanceActual < 100 && !opciones.confirmado) {
      return {
        ok: false,
        roadmap,
        requiereConfirmacion: true,
        mensaje: `El avance registrado es ${avanceActual} %. Al completar se ajustará a 100 %.`,
      };
    }
  }

  // Pausar exige motivo (POC-06, 5).
  if (nuevoEstado === "PAUSADA" && !opciones.comentario) {
    return { ok: false, roadmap, mensaje: "Indica por qué pausas la acción." };
  }


  const cambios: Partial<AccionRoadmap> = { estado: nuevoEstado };
  if (nuevoEstado === "COMPLETADA") {
    cambios.avance = 100;
    cambios.checklist = accion.checklist.map((paso) => ({ ...paso, completado: true }));
  }
  if (nuevoEstado === "EN_CURSO" && !accion.fechaInicio) {
    cambios.fechaInicio = hoyISO();
  }

  const bloqueos =
    nuevoEstado === "EN_CURSO"
      ? roadmap.bloqueos.map((bloqueo) =>
          bloqueo.accionId === accionId && bloqueo.estado === "abierto"
            ? {
                ...bloqueo,
                estado: "resuelto" as const,
                resolucion: opciones.comentario ?? "Se reanudó la acción.",
                fechaResolucion: new Date().toISOString(),
              }
            : bloqueo
        )
      : roadmap.bloqueos;

  const registros = [
    registro(
      accionId,
      "cambio_estado",
      opciones.comentario?.trim() || `Estado actualizado a ${nuevoEstado}.`,
      {
        estadoAnterior: accion.estado,
        estadoNuevo: nuevoEstado,
        porcentaje: nuevoEstado === "COMPLETADA" ? 100 : calcularAvance(accion),
      }
    ),
  ];

  return {
    ok: true,
    roadmap: aplicar(roadmap, reemplazar(roadmap.acciones, accionId, cambios), registros, bloqueos),
  };
}

/** Bloquear exige descripción del impedimento (POC-06, 19). */
export function bloquearAccion(
  roadmap: Roadmap,
  accionId: string,
  tipo: TipoBloqueo,
  descripcion: string
): ResultadoOperacion {
  const accion = buscarAccion(roadmap, accionId);
  if (!accion) return { ok: false, roadmap, mensaje: "No encontramos esa acción." };

  const validacion = validarMotivo(descripcion);
  if (!validacion.valido) {
    return { ok: false, roadmap, mensaje: "Describe el impedimento (mínimo 5 caracteres)." };
  }
  if (esFinal(accion.estado)) {
    return { ok: false, roadmap, mensaje: "Una acción cerrada no puede bloquearse." };
  }

  const bloqueo: Bloqueo = {
    id: nuevoId("BLQ"),
    accionId,
    tipo,
    descripcion: descripcion.trim(),
    fechaDeteccion: new Date().toISOString(),
    estado: "abierto",
    resolucion: null,
    fechaResolucion: null,
  };

  const registros = [
    registro(accionId, "bloqueo", `Bloqueo registrado: ${bloqueo.descripcion}`, {
      estadoAnterior: accion.estado,
      estadoNuevo: "BLOQUEADA",
      porcentaje: calcularAvance(accion),
    }),
  ];

  return {
    ok: true,
    roadmap: aplicar(
      roadmap,
      reemplazar(roadmap.acciones, accionId, { estado: "BLOQUEADA" }),
      registros,
      [bloqueo, ...roadmap.bloqueos]
    ),
  };
}

/** Descartar exige motivo y nunca elimina el registro (POC-06, 19). */
export function descartarAccion(
  roadmap: Roadmap,
  accionId: string,
  motivo: string
): ResultadoOperacion {
  const accion = buscarAccion(roadmap, accionId);
  if (!accion) return { ok: false, roadmap, mensaje: "No encontramos esa acción." };

  const validacion = validarMotivo(motivo);
  if (!validacion.valido) return { ok: false, roadmap, mensaje: validacion.mensaje };

  const registros = [
    registro(accionId, "descarte", `Acción descartada: ${motivo.trim()}`, {
      estadoAnterior: accion.estado,
      estadoNuevo: "DESCARTADA",
      porcentaje: calcularAvance(accion),
    }),
  ];

  return {
    ok: true,
    roadmap: aplicar(
      roadmap,
      reemplazar(roadmap.acciones, accionId, {
        estado: "DESCARTADA",
        motivoDescarte: motivo.trim(),
      }),
      registros
    ),
  };
}

export function reabrirAccion(
  roadmap: Roadmap,
  accionId: string,
  comentario: string
): ResultadoOperacion {
  const accion = buscarAccion(roadmap, accionId);
  if (!accion) return { ok: false, roadmap, mensaje: "No encontramos esa acción." };
  if (accion.estado === "DESCARTADA") {
    return {
      ok: true,
      roadmap: aplicar(
        roadmap,
        reemplazar(roadmap.acciones, accionId, { estado: "PENDIENTE", motivoDescarte: null }),
        [
          registro(accionId, "cambio_estado", comentario || "Acción restablecida al plan.", {
            estadoAnterior: "DESCARTADA",
            estadoNuevo: "PENDIENTE",
          }),
        ]
      ),
    };
  }
  return cambiarEstado(roadmap, accionId, "EN_CURSO", { comentario: comentario || "Reapertura." });
}

/* ------------------------------------------------------------------ */
/* Avance, planificación y seguimiento                                 */
/* ------------------------------------------------------------------ */

export function actualizarAvance(
  roadmap: Roadmap,
  accionId: string,
  porcentaje: number
): ResultadoOperacion {
  const accion = buscarAccion(roadmap, accionId);
  if (!accion) return { ok: false, roadmap, mensaje: "No encontramos esa acción." };
  if (usaChecklist(accion)) {
    return {
      ok: false,
      roadmap,
      mensaje: "Esta acción calcula su avance con la lista de pasos.",
    };
  }
  if (accion.estado === "COMPLETADA" || accion.estado === "DESCARTADA") {
    return { ok: false, roadmap, mensaje: "Reabre la acción para ajustar su avance." };
  }

  const valor = Math.max(0, Math.min(100, Math.round(porcentaje)));
  return {
    ok: true,
    roadmap: aplicar(roadmap, reemplazar(roadmap.acciones, accionId, { avance: valor }), [
      registro(accionId, "avance", `Avance declarado en ${valor} %.`, { porcentaje: valor }),
    ]),
  };
}

export function alternarPaso(
  roadmap: Roadmap,
  accionId: string,
  pasoId: string
): ResultadoOperacion {
  const accion = buscarAccion(roadmap, accionId);
  if (!accion) return { ok: false, roadmap, mensaje: "No encontramos esa acción." };
  if (accion.estado === "COMPLETADA" || accion.estado === "DESCARTADA") {
    return { ok: false, roadmap, mensaje: "Reabre la acción para modificar los pasos." };
  }

  const checklist = accion.checklist.map((paso) =>
    paso.id === pasoId ? { ...paso, completado: !paso.completado } : paso
  );
  const paso = checklist.find((p) => p.id === pasoId);
  const avance = Math.round(
    (checklist.filter((p) => p.completado).length / Math.max(1, checklist.length)) * 100
  );

  return {
    ok: true,
    roadmap: aplicar(roadmap, reemplazar(roadmap.acciones, accionId, { checklist, avance }), [
      registro(
        accionId,
        "avance",
        `${paso?.completado ? "Paso completado" : "Paso reabierto"}: ${paso?.texto ?? pasoId}`,
        { porcentaje: avance }
      ),
    ]),
  };
}

export interface CambiosPlanificacion {
  responsable?: string;
  fechaInicio?: string | null;
  fechaObjetivo?: string | null;
  prioridadOperativa?: NivelPrioridad;
}

export function actualizarPlanificacion(
  roadmap: Roadmap,
  accionId: string,
  cambios: CambiosPlanificacion
): ResultadoOperacion {
  const accion = buscarAccion(roadmap, accionId);
  if (!accion) return { ok: false, roadmap, mensaje: "No encontramos esa acción." };

  const fechaInicio =
    cambios.fechaInicio === undefined ? accion.fechaInicio : cambios.fechaInicio || null;
  const fechaObjetivo =
    cambios.fechaObjetivo === undefined ? accion.fechaObjetivo : cambios.fechaObjetivo || null;

  const validacion: ResultadoValidacion = validarFechas(fechaInicio, fechaObjetivo);
  if (!validacion.valido) return { ok: false, roadmap, mensaje: validacion.mensaje };

  const parciales: Partial<AccionRoadmap> = { fechaInicio, fechaObjetivo };
  if (cambios.responsable !== undefined) parciales.responsable = cambios.responsable.trim();
  if (cambios.prioridadOperativa) parciales.prioridadOperativa = cambios.prioridadOperativa;

  const actualizadas = reemplazar(roadmap.acciones, accionId, parciales);
  const cambioFechas =
    fechaInicio !== accion.fechaInicio || fechaObjetivo !== accion.fechaObjetivo;
  // POC-06, 6.10: solo se recalcula la secuencia afectada.
  const secuenciadas = cambioFechas ? recalcularDependientes(actualizadas, accionId) : actualizadas;

  const registros: RegistroAvance[] = [];
  if (cambioFechas) {
    registros.push(
      registro(
        accionId,
        "reprogramacion",
        `Fechas actualizadas: inicio ${fechaInicio ?? "sin fecha"}, objetivo ${
          fechaObjetivo ?? "sin fecha"
        }.`
      )
    );
  }
  if (cambios.responsable !== undefined && cambios.responsable.trim() !== accion.responsable) {
    registros.push(
      registro(
        accionId,
        "responsable",
        cambios.responsable.trim().length > 0
          ? `Responsable asignado: ${cambios.responsable.trim()}.`
          : "Se retiró el responsable asignado."
      )
    );
  }
  if (cambios.prioridadOperativa && cambios.prioridadOperativa !== accion.prioridadOperativa) {
    registros.push(
      registro(
        accionId,
        "cambio_estado",
        `Prioridad operativa ajustada a ${cambios.prioridadOperativa}. La prioridad de origen (${accion.prioridadOrigen}) se conserva.`
      )
    );
  }

  if (registros.length === 0) return { ok: true, roadmap };
  return { ok: true, roadmap: aplicar(roadmap, secuenciadas, registros) };
}

export function moverAFase(
  roadmap: Roadmap,
  accionId: string,
  fase: FaseId
): ResultadoOperacion {
  const accion = buscarAccion(roadmap, accionId);
  if (!accion) return { ok: false, roadmap, mensaje: "No encontramos esa acción." };
  if (accion.faseId === fase) return { ok: true, roadmap };

  const registros = [
    registro(
      accionId,
      "fase",
      `Fase cambiada de ${accion.faseId} a ${fase}. Fase sugerida originalmente: ${accion.faseOriginal}.`
    ),
  ];

  return {
    ok: true,
    roadmap: aplicar(roadmap, reemplazar(roadmap.acciones, accionId, { faseId: fase }), registros),
  };
}

export function agregarNota(
  roadmap: Roadmap,
  accionId: string,
  texto: string
): ResultadoOperacion {
  const accion = buscarAccion(roadmap, accionId);
  if (!accion) return { ok: false, roadmap, mensaje: "No encontramos esa acción." };
  if (texto.trim().length < 3) {
    return { ok: false, roadmap, mensaje: "Escribe una nota un poco más descriptiva." };
  }

  const nota = {
    id: nuevoId("NOT"),
    texto: texto.trim(),
    fecha: new Date().toISOString(),
    autor: USUARIO_DEMO,
  };

  return {
    ok: true,
    roadmap: aplicar(
      roadmap,
      reemplazar(roadmap.acciones, accionId, { notas: [nota, ...accion.notas] }),
      [registro(accionId, "nota", nota.texto)]
    ),
  };
}

export function agregarEvidencia(
  roadmap: Roadmap,
  accionId: string,
  tipo: TipoEvidencia,
  descripcion: string,
  referencia: string
): ResultadoOperacion {
  const accion = buscarAccion(roadmap, accionId);
  if (!accion) return { ok: false, roadmap, mensaje: "No encontramos esa acción." };
  if (descripcion.trim().length < 3) {
    return { ok: false, roadmap, mensaje: "Describe brevemente la evidencia." };
  }

  const evidencia: Evidencia = {
    id: nuevoId("EVI"),
    tipo,
    descripcion: descripcion.trim(),
    referencia: referencia.trim(),
    fecha: new Date().toISOString(),
  };

  return {
    ok: true,
    roadmap: aplicar(
      roadmap,
      reemplazar(roadmap.acciones, accionId, { evidencias: [evidencia, ...accion.evidencias] }),
      [
        registro(accionId, "evidencia", `Evidencia registrada: ${evidencia.descripcion}`, {
          evidenciaId: evidencia.id,
        }),
      ]
    ),
  };
}

/** Solo puede eliminarse evidencia antes de completar la acción (POC-06, 14). */
export function eliminarEvidencia(
  roadmap: Roadmap,
  accionId: string,
  evidenciaId: string
): ResultadoOperacion {
  const accion = buscarAccion(roadmap, accionId);
  if (!accion) return { ok: false, roadmap, mensaje: "No encontramos esa acción." };
  if (accion.estado === "COMPLETADA") {
    return {
      ok: false,
      roadmap,
      mensaje: "La evidencia de una acción completada no puede eliminarse.",
    };
  }

  const evidencia = accion.evidencias.find((e) => e.id === evidenciaId);
  return {
    ok: true,
    roadmap: aplicar(
      roadmap,
      reemplazar(roadmap.acciones, accionId, {
        evidencias: accion.evidencias.filter((e) => e.id !== evidenciaId),
      }),
      [
        registro(
          accionId,
          "evidencia",
          `Evidencia eliminada: ${evidencia?.descripcion ?? evidenciaId}`
        ),
      ]
    ),
  };
}

export function historialDe(roadmap: Roadmap, accionId: string): RegistroAvance[] {
  return roadmap.historial.filter((registroAvance) => registroAvance.accionId === accionId);
}
