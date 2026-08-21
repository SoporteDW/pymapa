/**
 * B4 + B5 · Servicio del workspace: funciones puras sobre el registro.
 *
 * Reglas:
 * - No inventa actividades: recibe una `PlantillaActividad` derivada de una
 *   ficha del plan, de una iniciativa del pack o del escenario demo.
 * - No conoce la interfaz ni el almacenamiento (recibe y devuelve el registro).
 */

import type { ArchivoEvidencia } from "@/lib/evidencias/tipos";
import { obtenerInstrumento, seleccionarInstrumento } from "@/lib/instrumentos/catalogo";
import { sugerirProfundizaciones, type Profundizacion } from "@/lib/kb/ecommerce/profundizacion";
import { puedeEntregar, transicionPermitida } from "./estados";
import { revisarEntrega } from "./revision";
import type {
  ActividadWorkspace,
  EstadoEjecucion,
  PlantillaActividad,
  ProfundizacionWorkspace,
  RegistroEntrega,
  RegistroWorkspaceEmpresa,
  VerificacionWorkspace,
} from "./tipos";

function aProfundizacionWorkspace(p: Profundizacion): ProfundizacionWorkspace {
  return {
    reglaId: p.reglaId,
    grupoId: p.grupoId,
    grupoNombre: p.grupoNombre,
    motivo: p.motivo,
    instrumentoId: p.instrumentoId,
    instrumentoVersion: p.instrumentoVersion,
    totalGrupo: p.totalGrupo,
    verificaciones: p.verificaciones.map<VerificacionWorkspace>((v) => ({
      id: v.id,
      texto: v.texto,
      subgrupo: v.subgrupo,
      impacto: v.impacto,
      costo: v.costo,
      estado: "sin_revisar",
      nota: "",
    })),
  };
}

/** Construye la actividad de workspace a partir de una actividad existente. */
export function construirActividad(
  plantilla: PlantillaActividad,
  ahora = new Date().toISOString()
): ActividadWorkspace {
  const instrumento = seleccionarInstrumento({
    titulo: plantilla.titulo,
    objetivo: plantilla.objetivo,
    dominioId: plantilla.origen.dominioId,
  });

  const pasosFicha = (plantilla.pasosSugeridos ?? []).map((titulo, indice) => ({
    orden: indice + 1,
    titulo,
    detalle: "Paso propuesto por la ficha de acción del diagnóstico.",
    registro: "Deja constancia de lo realizado en este paso.",
    hecho: false,
  }));

  const pasosInstrumento = instrumento.pasos.map((paso) => ({
    orden: pasosFicha.length + paso.orden,
    titulo: paso.titulo,
    detalle: paso.detalle,
    registro: paso.registro,
    hecho: false,
  }));

  const senales = plantilla.senalesProfundizacion ?? [];
  const profundizacion = senales.length > 0 ? sugerirProfundizaciones({ senales, maximoProfundizaciones: 1 })[0] : undefined;

  return {
    id: plantilla.id,
    titulo: plantilla.titulo,
    objetivo: plantilla.objetivo,
    porQue: plantilla.porQue,
    origen: plantilla.origen,
    estado: "pendiente",
    instrumentoId: instrumento.id,
    instrumentoVersion: instrumento.version,
    pasos: [...pasosFicha, ...pasosInstrumento],
    entregable: {
      titulo: instrumento.entregable.titulo,
      descripcion: instrumento.entregable.descripcion,
      formato: instrumento.entregable.formato,
      criteriosValidacion: instrumento.entregable.criteriosValidacion,
    },
    profundizacion: profundizacion ? aProfundizacionWorkspace(profundizacion) : null,
    historial: [],
    creadoEn: ahora,
    actualizadoEn: ahora,
  };
}

function reemplazar(
  registro: RegistroWorkspaceEmpresa,
  actividad: ActividadWorkspace
): RegistroWorkspaceEmpresa {
  const actualizada = { ...actividad, actualizadoEn: new Date().toISOString() };
  const existe = registro.actividades.some((a) => a.id === actividad.id);
  return {
    ...registro,
    actividades: existe
      ? registro.actividades.map((a) => (a.id === actividad.id ? actualizada : a))
      : [...registro.actividades, actualizada],
  };
}

/** Idempotente: abre el workspace de la actividad si aún no existe. */
export function asegurarActividad(
  registro: RegistroWorkspaceEmpresa,
  plantilla: PlantillaActividad
): { registro: RegistroWorkspaceEmpresa; actividad: ActividadWorkspace } {
  const existente = registro.actividades.find((a) => a.id === plantilla.id);
  if (existente) return { registro, actividad: existente };
  const actividad = construirActividad(plantilla);
  return { registro: reemplazar(registro, actividad), actividad };
}

export function obtenerActividad(
  registro: RegistroWorkspaceEmpresa,
  actividadId: string
): ActividadWorkspace | undefined {
  return registro.actividades.find((a) => a.id === actividadId);
}

export function cambiarEstado(
  registro: RegistroWorkspaceEmpresa,
  actividadId: string,
  estado: EstadoEjecucion
): RegistroWorkspaceEmpresa {
  const actividad = obtenerActividad(registro, actividadId);
  if (!actividad) return registro;
  if (!transicionPermitida(actividad.estado, estado)) return registro;
  return reemplazar(registro, { ...actividad, estado });
}

export function marcarPaso(
  registro: RegistroWorkspaceEmpresa,
  actividadId: string,
  orden: number,
  hecho: boolean
): RegistroWorkspaceEmpresa {
  const actividad = obtenerActividad(registro, actividadId);
  if (!actividad) return registro;
  const pasos = actividad.pasos.map((p) => (p.orden === orden ? { ...p, hecho } : p));
  const estado: EstadoEjecucion =
    actividad.estado === "pendiente" && pasos.some((p) => p.hecho) ? "en_ejecucion" : actividad.estado;
  return reemplazar(registro, { ...actividad, pasos, estado });
}

export function marcarVerificacion(
  registro: RegistroWorkspaceEmpresa,
  actividadId: string,
  verificacionId: string,
  estado: VerificacionWorkspace["estado"],
  nota = ""
): RegistroWorkspaceEmpresa {
  const actividad = obtenerActividad(registro, actividadId);
  if (!actividad?.profundizacion) return registro;
  const verificaciones = actividad.profundizacion.verificaciones.map((v) =>
    v.id === verificacionId ? { ...v, estado, nota: nota || v.nota } : v
  );
  return reemplazar(registro, {
    ...actividad,
    profundizacion: { ...actividad.profundizacion, verificaciones },
    estado: actividad.estado === "pendiente" ? "en_ejecucion" : actividad.estado,
  });
}

export interface EntradaEntrega {
  nota: string;
  criteriosDeclarados: string[];
  archivos: ArchivoEvidencia[];
}

/**
 * B5 · Registra una entrega y su revisión simulada. El estado resultante lo
 * decide la revisión, no la interfaz.
 */
export function registrarEntrega(
  registro: RegistroWorkspaceEmpresa,
  actividadId: string,
  entrada: EntradaEntrega
): { registro: RegistroWorkspaceEmpresa; entrega: RegistroEntrega | null } {
  const actividad = obtenerActividad(registro, actividadId);
  if (!actividad) return { registro, entrega: null };
  if (!puedeEntregar(actividad.estado)) return { registro, entrega: null };

  const numero = actividad.historial.length + 1;
  const entregadoEn = new Date().toISOString();
  const revision = revisarEntrega({
    criteriosValidacion: actividad.entregable.criteriosValidacion,
    criteriosDeclarados: entrada.criteriosDeclarados,
    nota: entrada.nota,
    archivos: entrada.archivos,
    verificaciones: actividad.profundizacion?.verificaciones,
    numeroEntrega: numero,
    revisadoEn: entregadoEn,
  });

  const entrega: RegistroEntrega = {
    id: `${actividad.id}-entrega-${numero}`,
    numero,
    entregadoEn,
    nota: entrada.nota,
    criteriosDeclarados: entrada.criteriosDeclarados,
    archivos: entrada.archivos,
    revision,
  };

  const estado: EstadoEjecucion = revision.veredicto === "validado" ? "validado" : "requiere_ajustes";

  return {
    registro: reemplazar(registro, {
      ...actividad,
      estado,
      historial: [...actividad.historial, entrega],
    }),
    entrega,
  };
}

/** Vuelve a ejecución tras un resultado "requiere ajustes". */
export function retomarEjecucion(
  registro: RegistroWorkspaceEmpresa,
  actividadId: string
): RegistroWorkspaceEmpresa {
  return cambiarEstado(registro, actividadId, "en_ejecucion");
}

/**
 * Deuda 0.1 · Enlaza el entregable con las evidencias creadas a partir de él,
 * cerrando la cadena Entregable → Evidencia → Revisión → Validación.
 */
export function enlazarEvidenciasDeEntrega(
  registro: RegistroWorkspaceEmpresa,
  actividadId: string,
  entregaId: string,
  evidenciaIds: string[]
): RegistroWorkspaceEmpresa {
  const actividad = obtenerActividad(registro, actividadId);
  if (!actividad) return registro;
  return reemplazar(registro, {
    ...actividad,
    historial: actividad.historial.map((e) =>
      e.id === entregaId
        ? { ...e, evidenciaIds: Array.from(new Set([...(e.evidenciaIds ?? []), ...evidenciaIds])) }
        : e
    ),
  });
}

/**
 * B7 · Reapertura por resultado de seguimiento: la actividad validada vuelve a
 * ejecución con el motivo registrado (el recorrido vuelve sobre sí mismo).
 */
export function reabrirActividad(
  registro: RegistroWorkspaceEmpresa,
  actividadId: string,
  motivo: string,
  seguimientoId: string | null = null,
  ahora: string = new Date().toISOString()
): RegistroWorkspaceEmpresa {
  const actividad = obtenerActividad(registro, actividadId);
  if (!actividad) return registro;
  if (!transicionPermitida(actividad.estado, "en_ejecucion")) return registro;
  return reemplazar(registro, {
    ...actividad,
    estado: "en_ejecucion",
    reaperturas: [...(actividad.reaperturas ?? []), { motivo, fecha: ahora, seguimientoId }],
  });
}

/** Cuántas veces la revisión pidió ajustes en esta actividad (señal para B9). */
export function ajustesSolicitados(actividad: ActividadWorkspace): number {
  return actividad.historial.filter((e) => e.revision.veredicto === "requiere_ajustes").length;
}

/** Metodología del instrumento vigente de la actividad (capa conocimiento). */
export function metodologiaDe(actividad: ActividadWorkspace): string {
  return obtenerInstrumento(actividad.instrumentoId)?.metodologia ?? "";
}

