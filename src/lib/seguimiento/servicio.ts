/**
 * B7 · Servicio de seguimiento: funciones puras sobre el registro por empresa.
 *
 * Reglas:
 * - Solo se abre seguimiento de una actividad VALIDADA (ejecución cerrada).
 * - La conclusión es cualitativa (mejoró / sin cambio / empeoró / insuficiente)
 *   y siempre viene acompañada de su explicación.
 * - La decisión (validar, reabrir, complementar, pedir evidencia, apoyo) la
 *   toma esta capa, nunca la interfaz.
 */

import type { ActividadWorkspace } from "@/lib/workspace/tipos";
import {
  CATALOGO_SEGUIMIENTO_VERSION,
  hitosDisponibles,
  seleccionarPlantillaIndicador,
} from "./catalogo";
import type {
  DecisionSeguimiento,
  EvaluacionSeguimiento,
  HitoSeguimiento,
  HitoSeguimientoId,
  MedicionHito,
  RegistroSeguimientoEmpresa,
  SeguimientoActividad,
} from "./tipos";

/** Margen relativo mínimo para hablar de cambio (demostrativo, no estadístico). */
export const MARGEN_CAMBIO_RELATIVO = 0.05;

function sumarDias(desde: string, dias: number): string {
  const fecha = new Date(desde);
  fecha.setDate(fecha.getDate() + dias);
  return fecha.toISOString();
}

export interface EntradaSeguimiento {
  actividad: ActividadWorkspace;
  empresaId: string;
  /** Hitos a activar; por defecto los tres del catálogo. */
  hitos?: HitoSeguimientoId[];
  lineaBase?: number | null;
  meta?: number | null;
  ahora?: string;
}

export function construirSeguimiento(entrada: EntradaSeguimiento): SeguimientoActividad {
  const ahora = entrada.ahora ?? new Date().toISOString();
  const plantilla = seleccionarPlantillaIndicador({
    titulo: entrada.actividad.titulo,
    objetivo: entrada.actividad.objetivo,
    dominioId: entrada.actividad.origen.dominioId,
  });
  const seleccionados = entrada.hitos ?? ["d30", "d60", "d90"];
  const ultimaEntrega = entrada.actividad.historial[entrada.actividad.historial.length - 1] ?? null;

  const hitos: HitoSeguimiento[] = hitosDisponibles
    .filter((h) => seleccionados.includes(h.id))
    .map((h) => ({
      id: h.id,
      dias: h.dias,
      etiqueta: h.etiqueta,
      fechaPrevista: sumarDias(ahora, h.dias),
      solicitudes: h.solicitudes,
      medicion: null,
    }));

  return {
    id: `seg-${entrada.actividad.id}`,
    empresaId: entrada.empresaId,
    actividadId: entrada.actividad.id,
    actividadTitulo: entrada.actividad.titulo,
    dominioId: entrada.actividad.origen.dominioId,
    dominioNombre: entrada.actividad.origen.dominioNombre,
    catalogoVersion: CATALOGO_SEGUIMIENTO_VERSION,
    origen: {
      entregaId: ultimaEntrega?.id ?? null,
      validadoEn: ultimaEntrega?.revision.revisadoEn ?? null,
      porQue:
        "La actividad quedó validada: ahora corresponde comprobar si la ejecución produjo el resultado esperado.",
    },
    indicador: {
      id: plantilla.id,
      nombre: plantilla.nombre,
      descripcion: plantilla.descripcion,
      unidad: plantilla.unidad,
      direccion: plantilla.direccion,
      lineaBase: entrada.lineaBase ?? plantilla.lineaBaseSugerida,
      meta: entrada.meta ?? plantilla.metaSugerida,
      fuente: plantilla.fuente,
    },
    hitos,
    evaluacion: null,
    estado: "abierto",
    derivaciones: [],
    creadoEn: ahora,
    actualizadoEn: ahora,
  };
}

function reemplazar(
  registro: RegistroSeguimientoEmpresa,
  seguimiento: SeguimientoActividad
): RegistroSeguimientoEmpresa {
  const actualizado = { ...seguimiento, actualizadoEn: new Date().toISOString() };
  const existe = registro.seguimientos.some((s) => s.id === seguimiento.id);
  return {
    ...registro,
    seguimientos: existe
      ? registro.seguimientos.map((s) => (s.id === seguimiento.id ? actualizado : s))
      : [...registro.seguimientos, actualizado],
  };
}

/** Idempotente: solo abre seguimiento si la actividad está validada. */
export function asegurarSeguimiento(
  registro: RegistroSeguimientoEmpresa,
  entrada: EntradaSeguimiento
): { registro: RegistroSeguimientoEmpresa; seguimiento: SeguimientoActividad | null } {
  const existente = registro.seguimientos.find((s) => s.actividadId === entrada.actividad.id);
  if (existente) return { registro, seguimiento: existente };
  if (entrada.actividad.estado !== "validado") return { registro, seguimiento: null };
  const seguimiento = construirSeguimiento(entrada);
  return { registro: reemplazar(registro, seguimiento), seguimiento };
}

export function obtenerSeguimiento(
  registro: RegistroSeguimientoEmpresa,
  actividadId: string
): SeguimientoActividad | undefined {
  return registro.seguimientos.find((s) => s.actividadId === actividadId);
}

export interface EntradaMedicion {
  valor: number | null;
  respuesta?: string;
  observacion?: string;
  evidenciaIds?: string[];
}

export function registrarMedicion(
  registro: RegistroSeguimientoEmpresa,
  seguimientoId: string,
  hitoId: HitoSeguimientoId,
  entrada: EntradaMedicion,
  ahora: string = new Date().toISOString()
): { registro: RegistroSeguimientoEmpresa; seguimiento: SeguimientoActividad | null } {
  const seguimiento = registro.seguimientos.find((s) => s.id === seguimientoId);
  if (!seguimiento) return { registro, seguimiento: null };

  const medicion: MedicionHito = {
    registradaEn: ahora,
    valor: entrada.valor,
    respuesta: entrada.respuesta ?? "",
    observacion: entrada.observacion ?? "",
    evidenciaIds: entrada.evidenciaIds ?? [],
  };

  const siguiente: SeguimientoActividad = {
    ...seguimiento,
    hitos: seguimiento.hitos.map((h) => (h.id === hitoId ? { ...h, medicion } : h)),
    estado: "en_medicion",
  };
  return { registro: reemplazar(registro, siguiente), seguimiento: siguiente };
}

/** Última medición con valor declarado. */
export function ultimaMedicion(
  seguimiento: SeguimientoActividad
): { hito: HitoSeguimiento; medicion: MedicionHito } | null {
  const conValor = seguimiento.hitos
    .filter((h) => h.medicion !== null)
    .reverse()
    .find((h) => h.medicion?.valor !== null && h.medicion?.valor !== undefined);
  if (!conValor?.medicion) return null;
  return { hito: conValor, medicion: conValor.medicion };
}

function decisionDesdeResultado(
  resultado: EvaluacionSeguimiento["resultado"],
  alcanzoMeta: boolean
): DecisionSeguimiento {
  if (resultado === "insuficiente") return "solicitar_evidencia";
  if (resultado === "empeoro") return "apoyo_especializado";
  if (resultado === "sin_cambio") return "reabrir_actividad";
  return alcanzoMeta ? "validar_impacto" : "actividad_complementaria";
}

/**
 * Evaluación cualitativa y determinista. Compara la última medición con la
 * línea base según la dirección del indicador y usa un margen relativo fijo
 * para no interpretar ruido como mejora.
 */
export function evaluarSeguimiento(
  seguimiento: SeguimientoActividad,
  ahora: string = new Date().toISOString()
): EvaluacionSeguimiento {
  const base = seguimiento.indicador.lineaBase;
  const meta = seguimiento.indicador.meta;
  const ultima = ultimaMedicion(seguimiento);
  const unidad = seguimiento.indicador.unidad;

  if (!ultima || base === null) {
    return {
      evaluadoEn: ahora,
      simulada: true,
      resultado: "insuficiente",
      mensaje:
        "Todavía no hay información suficiente para concluir si la actividad produjo resultados.",
      decision: "solicitar_evidencia",
      porQue: [
        base === null
          ? "No hay línea base declarada para el indicador."
          : "Ningún hito de seguimiento registra un valor del indicador.",
        "Sin un valor comparable, Pymapa no afirma mejora ni deterioro.",
      ],
      ultimoValor: ultima?.medicion.valor ?? null,
      hitoEvaluado: ultima?.hito.id ?? null,
    };
  }

  const valor = ultima.medicion.valor!;
  const mejorMenor = seguimiento.indicador.direccion === "menor_mejor";
  const delta = mejorMenor ? base - valor : valor - base;
  const margen = Math.abs(base) * MARGEN_CAMBIO_RELATIVO;
  const alcanzoMeta =
    meta === null ? false : mejorMenor ? valor <= meta : valor >= meta;

  let resultado: EvaluacionSeguimiento["resultado"];
  if (delta > margen) resultado = "mejoro";
  else if (delta < -margen) resultado = "empeoro";
  else resultado = "sin_cambio";

  const decision = decisionDesdeResultado(resultado, alcanzoMeta);

  const mensajes: Record<EvaluacionSeguimiento["resultado"], string> = {
    mejoro: alcanzoMeta
      ? `El indicador alcanzó la meta (${valor}${unidad} frente a una meta de ${meta}${unidad}): el impacto queda validado.`
      : `El indicador mejoró (${base}${unidad} → ${valor}${unidad}) pero aún no alcanza la meta de ${meta}${unidad}.`,
    sin_cambio: `El indicador se mantiene sin cambio relevante (${base}${unidad} → ${valor}${unidad}).`,
    empeoro: `El indicador empeoró (${base}${unidad} → ${valor}${unidad}).`,
    insuficiente: "Información insuficiente.",
  };

  const porQue = [
    `Línea base declarada: ${base}${unidad}; última medición (${ultima.hito.etiqueta}): ${valor}${unidad}.`,
    `El indicador “${seguimiento.indicador.nombre}” mejora cuando el valor ${mejorMenor ? "baja" : "sube"}.`,
    `Se considera cambio relevante una diferencia mayor a ${MARGEN_CAMBIO_RELATIVO * 100}% respecto de la línea base.`,
  ];

  return {
    evaluadoEn: ahora,
    simulada: true,
    resultado,
    mensaje: mensajes[resultado],
    decision,
    porQue,
    ultimoValor: valor,
    hitoEvaluado: ultima.hito.id,
  };
}

/** Guarda la evaluación en el registro y cierra el seguimiento si valida impacto. */
export function registrarEvaluacion(
  registro: RegistroSeguimientoEmpresa,
  seguimientoId: string,
  ahora?: string
): { registro: RegistroSeguimientoEmpresa; evaluacion: EvaluacionSeguimiento | null } {
  const seguimiento = registro.seguimientos.find((s) => s.id === seguimientoId);
  if (!seguimiento) return { registro, evaluacion: null };
  const evaluacion = evaluarSeguimiento(seguimiento, ahora);
  const siguiente: SeguimientoActividad = {
    ...seguimiento,
    evaluacion,
    estado: evaluacion.decision === "validar_impacto" ? "cerrado" : "en_medicion",
  };
  return { registro: reemplazar(registro, siguiente), evaluacion };
}

/** Deja constancia de la acción derivada (reapertura, apoyo, nueva actividad…). */
export function registrarDerivacion(
  registro: RegistroSeguimientoEmpresa,
  seguimientoId: string,
  tipo: DecisionSeguimiento,
  referenciaId: string,
  ahora: string = new Date().toISOString()
): RegistroSeguimientoEmpresa {
  const seguimiento = registro.seguimientos.find((s) => s.id === seguimientoId);
  if (!seguimiento) return registro;
  const yaRegistrada = seguimiento.derivaciones.some(
    (d) => d.tipo === tipo && d.referenciaId === referenciaId
  );
  if (yaRegistrada) return registro;
  return reemplazar(registro, {
    ...seguimiento,
    derivaciones: [...seguimiento.derivaciones, { tipo, referenciaId, registradoEn: ahora }],
  });
}

/** Hito más próximo sin medición: base del "siguiente paso" del Home. */
export function proximoHitoPendiente(seguimiento: SeguimientoActividad): HitoSeguimiento | null {
  return seguimiento.hitos.find((h) => h.medicion === null) ?? null;
}

export const etiquetaResultadoSeguimiento: Record<
  EvaluacionSeguimiento["resultado"],
  string
> = {
  mejoro: "Mejoró",
  sin_cambio: "Sin cambio relevante",
  empeoro: "Empeoró",
  insuficiente: "Información insuficiente",
};

export const etiquetaDecisionSeguimiento: Record<DecisionSeguimiento, string> = {
  validar_impacto: "Validar impacto y cerrar el ciclo",
  reabrir_actividad: "Reabrir la actividad",
  actividad_complementaria: "Generar una actividad complementaria",
  solicitar_evidencia: "Solicitar nueva evidencia",
  apoyo_especializado: "Recomendar apoyo especializado",
};

/* ------------------------------------------------------------------------- */
/* Macroentrega 5.2 · Habilitación secuencial 30 → 60 → 90                    */
/* ------------------------------------------------------------------------- */

const ORDEN_HITOS: HitoSeguimientoId[] = ["d30", "d60", "d90"];

export interface HitoHabilitacion {
  hito: HitoSeguimiento;
  registrado: boolean;
  habilitado: boolean;
  /** Etiqueta del hito que falta cuando el checkpoint está bloqueado. */
  bloqueadoPor: string | null;
}

/**
 * Un checkpoint solo se abre cuando el anterior ya tiene medición registrada:
 * el seguimiento es una secuencia temporal, no tres formularios simultáneos.
 */
export function estadoHitos(seguimiento: SeguimientoActividad): HitoHabilitacion[] {
  const ordenados = [...seguimiento.hitos].sort(
    (a, b) => ORDEN_HITOS.indexOf(a.id) - ORDEN_HITOS.indexOf(b.id)
  );
  let anteriorPendiente: HitoSeguimiento | null = null;
  return ordenados.map((hito) => {
    const registrado = hito.medicion !== null;
    const habilitado = registrado || anteriorPendiente === null;
    const estado: HitoHabilitacion = {
      hito,
      registrado,
      habilitado,
      bloqueadoPor: habilitado ? null : (anteriorPendiente?.etiqueta ?? null),
    };
    if (!registrado && anteriorPendiente === null) anteriorPendiente = hito;
    return estado;
  });
}

export function hitoHabilitado(
  seguimiento: SeguimientoActividad,
  hitoId: HitoSeguimientoId
): boolean {
  return estadoHitos(seguimiento).find((h) => h.hito.id === hitoId)?.habilitado ?? false;
}

/* ------------------------------------------------------------------------- */
/* Macroentrega 5.2 · Evolución del indicador (línea base → d30 → d60 → d90) */
/* ------------------------------------------------------------------------- */

export interface PuntoEvolucion {
  etiqueta: string;
  /** null cuando el checkpoint aún no fue medido o no aportó dato. */
  valor: number | null;
  pendiente: boolean;
}

export function evolucionIndicador(seguimiento: SeguimientoActividad): PuntoEvolucion[] {
  const base: PuntoEvolucion = {
    etiqueta: "Línea base",
    valor: seguimiento.indicador.lineaBase,
    pendiente: seguimiento.indicador.lineaBase === null,
  };
  const puntos = estadoHitos(seguimiento).map(({ hito, registrado }) => ({
    etiqueta: hito.etiqueta,
    valor: registrado ? (hito.medicion?.valor ?? null) : null,
    pendiente: !registrado || hito.medicion?.valor === null,
  }));
  return [base, ...puntos];
}
