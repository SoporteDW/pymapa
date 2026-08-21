/**
 * Escenario Hero final (Macroentrega 3) · sembrado demostrativo.
 *
 * Amplía el escenario Hero de Carrito/Checkout ya existente (no crea otro):
 * deja precargadas las condiciones necesarias para demostrar en 10–15 minutos
 * el ciclo completo B1–B9 sobre el mismo recorrido.
 *
 * Qué queda sembrado:
 * - Actividad 1 (checkout) VALIDADA, con entregable convertido en evidencia y
 *   con seguimiento abierto: hito de 30 días medido, conclusión cualitativa y
 *   decisión siguiente.
 * - Actividad 2 (carrito) con DOS revisiones que pidieron ajustes: condición
 *   observable que justifica la recomendación de apoyo humano (regla AP-R01).
 * - Una delegación a un tercero ficticio (DEMO) para la información de envíos.
 *
 * Todo el contenido es DEMO y así queda marcado: revisiones, análisis de
 * evidencia, evaluación de seguimiento, correo y sesión de apoyo son simulados.
 */

import { plantillasEscenarioHero } from "@/lib/workspace/escenario-hero";
import {
  asegurarActividad,
  cambiarEstado,
  marcarVerificacion,
  obtenerActividad,
  registrarEntrega,
  ajustesSolicitados,
  enlazarEvidenciasDeEntrega,
} from "@/lib/workspace/servicio";
import { adjuntarEvidenciasDeEntrega } from "@/lib/workspace/puente-evidencias";
import {
  guardarRegistro as guardarWorkspace,
  leerRegistro as leerWorkspace,
  limpiarRegistro as limpiarWorkspace,
  registroVacio as workspaceVacio,
} from "@/lib/workspace/repositorio";
import {
  guardarRegistro as guardarEvidencias,
  limpiarRegistro as limpiarEvidencias,
  registroVacio as evidenciasVacio,
} from "@/lib/evidencias/repositorio";
import {
  guardarRegistro as guardarSeguimiento,
  limpiarRegistro as limpiarSeguimiento,
  registroVacio as seguimientoVacio,
} from "@/lib/seguimiento/repositorio";
import {
  guardarRegistro as guardarDelegacion,
  limpiarRegistro as limpiarDelegacion,
  registroVacio as delegacionVacio,
} from "@/lib/delegacion/repositorio";
import {
  guardarRegistro as guardarApoyo,
  limpiarRegistro as limpiarApoyo,
  registroVacio as apoyoVacio,
} from "@/lib/apoyo-humano/repositorio";
import {
  asegurarSeguimiento,
  registrarEvaluacion,
  registrarMedicion,
} from "@/lib/seguimiento/servicio";
import { delegar } from "@/lib/delegacion/servicio";
import { evaluarApoyo } from "@/lib/apoyo-humano/reglas";
import { registrarRecomendacion } from "@/lib/apoyo-humano/servicio";
import type { RegistroWorkspaceEmpresa } from "@/lib/workspace/tipos";
import type { RegistroEvidenciasEmpresa } from "@/lib/evidencias/tipos";
import type { RegistroSeguimientoEmpresa } from "@/lib/seguimiento/tipos";
import type { RegistroDelegacionEmpresa } from "@/lib/delegacion/tipos";
import type { RegistroApoyoEmpresa } from "@/lib/apoyo-humano/tipos";

export const SEMBRADO_HERO_VERSION = "hero-final-1.0.0";

/** Identificadores estables: el sembrado es idempotente y reiniciable. */
export const HERO_ACTIVIDAD_VALIDADA = plantillasEscenarioHero[0]!.id;
export const HERO_ACTIVIDAD_CON_AJUSTES = plantillasEscenarioHero[1]!.id;
export const HERO_DELEGACION_ID = "hero-del-01";
export const HERO_APOYO_ID = "hero-ap-01";

/** Valores del seguimiento Hero (demostrativos y explícitos). */
export const HERO_SEGUIMIENTO = {
  lineaBase: 72,
  meta: 55,
  medicionD30: 64,
} as const;

/** Tercero ficticio del escenario: nunca se envía correo real. */
export const HERO_TERCERO = {
  nombre: "Laura Gómez (DEMO)",
  correo: "laura.gomez@empresa-demo.pymapa",
  tarea:
    "Confirmar las tarifas de envío vigentes por ciudad y el umbral de envío gratis, para poder mostrarlas en el carrito antes del pago.",
} as const;

export interface EntradaSembradoHero {
  empresaId: string;
  empresaNombre: string;
}

export interface SembradoHero {
  version: string;
  workspace: RegistroWorkspaceEmpresa;
  evidencias: RegistroEvidenciasEmpresa;
  seguimiento: RegistroSeguimientoEmpresa;
  delegacion: RegistroDelegacionEmpresa;
  apoyo: RegistroApoyoEmpresa;
}

/**
 * Construye el escenario Hero completo. Función pura: no lee ni escribe
 * almacenamiento, de modo que puede probarse y reutilizarse.
 */
export function construirSembradoHero(entrada: EntradaSembradoHero): SembradoHero {
  const { empresaId, empresaNombre } = entrada;

  // ── Actividad 1 · checkout: ejecutada, entregada y VALIDADA ──────────────
  let workspace = workspaceVacio(empresaId, empresaNombre);
  const primera = asegurarActividad(workspace, plantillasEscenarioHero[0]!);
  workspace = primera.registro;
  workspace = cambiarEstado(workspace, HERO_ACTIVIDAD_VALIDADA, "en_ejecucion");

  for (const verificacion of primera.actividad.profundizacion?.verificaciones ?? []) {
    workspace = marcarVerificacion(
      workspace,
      HERO_ACTIVIDAD_VALIDADA,
      verificacion.id,
      "cumple",
      "Verificada durante la auditoría del checkout (DEMO)."
    );
  }

  const entregaValidada = registrarEntrega(workspace, HERO_ACTIVIDAD_VALIDADA, {
    nota: "Auditamos la compra completa desde el celular con el equipo comercial, documentamos cada punto de fricción del checkout y priorizamos las correcciones con su responsable y fecha (datos DEMO).",
    criteriosDeclarados: primera.actividad.entregable.criteriosValidacion,
    archivos: [
      {
        nombre: "auditoria-checkout-demo.pdf",
        tipoMime: "application/pdf",
        tamañoBytes: 184_320,
        ubicacion: null,
      },
    ],
  });
  workspace = entregaValidada.registro;

  // Entregable → evidencia de la empresa (deuda 0.1 del ciclo).
  let evidencias = evidenciasVacio(empresaId, empresaNombre);
  const actividadValidada = obtenerActividad(workspace, HERO_ACTIVIDAD_VALIDADA)!;
  if (entregaValidada.entrega) {
    const puente = adjuntarEvidenciasDeEntrega(
      evidencias,
      actividadValidada,
      entregaValidada.entrega
    );
    evidencias = puente.registro;
    workspace = enlazarEvidenciasDeEntrega(
      workspace,
      HERO_ACTIVIDAD_VALIDADA,
      entregaValidada.entrega.id,
      puente.evidenciaIds
    );
  }

  // ── Actividad 2 · carrito: dos revisiones con ajustes pendientes ─────────
  const segunda = asegurarActividad(workspace, plantillasEscenarioHero[1]!);
  workspace = segunda.registro;
  workspace = cambiarEstado(workspace, HERO_ACTIVIDAD_CON_AJUSTES, "en_ejecucion");

  for (const nota of [
    "Revisamos el carrito, pero todavía no definimos dónde se mostrará el costo total.",
    "Publicamos un aviso de envío, sin confirmar las tarifas por ciudad.",
  ]) {
    workspace = registrarEntrega(workspace, HERO_ACTIVIDAD_CON_AJUSTES, {
      nota,
      criteriosDeclarados: [],
      archivos: [],
    }).registro;
  }

  // ── Seguimiento de la actividad validada ────────────────────────────────
  let seguimiento = seguimientoVacio(empresaId, empresaNombre);
  const abierto = asegurarSeguimiento(seguimiento, {
    actividad: obtenerActividad(workspace, HERO_ACTIVIDAD_VALIDADA)!,
    empresaId,
    lineaBase: HERO_SEGUIMIENTO.lineaBase,
    meta: HERO_SEGUIMIENTO.meta,
  });
  seguimiento = abierto.registro;

  if (abierto.seguimiento) {
    seguimiento = registrarMedicion(seguimiento, abierto.seguimiento.id, "d30", {
      valor: HERO_SEGUIMIENTO.medicionD30,
      respuesta: "El equipo comercial confirma menos llamadas por problemas al pagar.",
      observacion:
        "Se corrigieron los campos obligatorios del checkout y se habilitó el pago como invitado (DEMO).",
    }).registro;
    seguimiento = registrarEvaluacion(seguimiento, abierto.seguimiento.id).registro;
  }

  // ── Delegación: la información de envíos la tiene otra persona ───────────
  let delegacion = delegacionVacio(empresaId, empresaNombre);
  const solicitada = delegar(delegacion, {
    empresaId,
    empresaNombre,
    origen: {
      tipo: "actividad",
      referenciaId: HERO_ACTIVIDAD_CON_AJUSTES,
      referenciaTitulo: plantillasEscenarioHero[1]!.titulo,
      dominioId: plantillasEscenarioHero[1]!.origen.dominioId,
      dominioNombre: plantillasEscenarioHero[1]!.origen.dominioNombre,
      rutaRetorno: `/plan-de-accion/workspace/${HERO_ACTIVIDAD_CON_AJUSTES}`,
    },
    nombre: HERO_TERCERO.nombre,
    correo: HERO_TERCERO.correo,
    tarea: HERO_TERCERO.tarea,
    solicitante: "La gerencia (DEMO)",
  });
  delegacion = {
    ...solicitada.registro,
    delegaciones: solicitada.registro.delegaciones.map((d) => ({ ...d, id: HERO_DELEGACION_ID })),
  };

  // ── Apoyo humano: condición observable = 2 revisiones con ajustes ────────
  let apoyo = apoyoVacio(empresaId, empresaNombre);
  const actividadConAjustes = obtenerActividad(workspace, HERO_ACTIVIDAD_CON_AJUSTES)!;
  const [sugerencia] = evaluarApoyo({
    ajustesSolicitados: ajustesSolicitados(actividadConAjustes),
  });
  if (sugerencia) {
    const registrada = registrarRecomendacion(
      apoyo,
      sugerencia,
      {
        tipo: "actividad",
        referenciaId: HERO_ACTIVIDAD_CON_AJUSTES,
        referenciaTitulo: actividadConAjustes.titulo,
        dominioId: actividadConAjustes.origen.dominioId,
        dominioNombre: actividadConAjustes.origen.dominioNombre,
        rutaRetorno: `/plan-de-accion/workspace/${HERO_ACTIVIDAD_CON_AJUSTES}`,
      },
      empresaId
    );
    apoyo = {
      ...registrada.registro,
      recomendaciones: registrada.registro.recomendaciones.map((r) => ({
        ...r,
        id: HERO_APOYO_ID,
      })),
    };
  }

  return {
    version: SEMBRADO_HERO_VERSION,
    workspace,
    evidencias,
    seguimiento,
    delegacion,
    apoyo,
  };
}

/**
 * Escribe el escenario Hero en el almacenamiento local de la empresa activa.
 * Solo debe invocarse dentro del Modo Demostración: la información real ya
 * quedó respaldada por `activarModoDemo`.
 */
export function aplicarSembradoHero(entrada: EntradaSembradoHero): SembradoHero {
  const sembrado = construirSembradoHero(entrada);
  guardarWorkspace(sembrado.workspace);
  guardarEvidencias(sembrado.evidencias);
  guardarSeguimiento(sembrado.seguimiento);
  guardarDelegacion(sembrado.delegacion);
  guardarApoyo(sembrado.apoyo);
  return sembrado;
}

/** Borra únicamente las capas del escenario Hero de esta empresa. */
export function limpiarSembradoHero(entrada: EntradaSembradoHero): void {
  const { empresaId, empresaNombre } = entrada;
  limpiarWorkspace(empresaId, empresaNombre);
  limpiarEvidencias(empresaId, empresaNombre);
  limpiarSeguimiento(empresaId, empresaNombre);
  limpiarDelegacion(empresaId, empresaNombre);
  limpiarApoyo(empresaId, empresaNombre);
}

/** Reinicio del escenario demostrativo: limpia y vuelve a sembrar. */
export function reiniciarSembradoHero(entrada: EntradaSembradoHero): SembradoHero {
  limpiarSembradoHero(entrada);
  return aplicarSembradoHero(entrada);
}

/** ¿La empresa activa ya tiene el escenario Hero sembrado? */
export function heroSembrado(entrada: EntradaSembradoHero): boolean {
  const registro = leerWorkspace(entrada.empresaId, entrada.empresaNombre);
  return registro.actividades.some((a) => a.id === HERO_ACTIVIDAD_VALIDADA && a.estado === "validado");
}
