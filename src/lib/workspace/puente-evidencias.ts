/**
 * Deuda 0.1 · Puente Workspace ↔ Evidencias.
 *
 * Un archivo entregado para validar una actividad NO es un archivo aislado:
 * queda registrado en el mismo modelo de evidencias del diagnóstico, con la
 * cadena completa:
 *
 *   Empresa → Actividad → Instrumento → Entregable → Evidencia → Revisión → Validación
 *
 * Así la evidencia permanece disponible como conocimiento acumulado de la
 * empresa, se pueda consultar desde el dominio y no se duplica el modelo.
 */

import { VERSION_ANALISIS_SIMULADO } from "@/lib/evidencias/servicio";
import type {
  EvidenciaEmpresa,
  RegistroEvidenciasEmpresa,
  TipoEvidencia,
} from "@/lib/evidencias/tipos";
import type { ActividadWorkspace, RegistroEntrega } from "./tipos";

/** Tipo de evidencia según el formato declarado por el instrumento. */
function tipoDesdeFormato(formato: ActividadWorkspace["entregable"]["formato"]): TipoEvidencia {
  switch (formato) {
    case "captura":
      return "captura";
    case "hoja_de_calculo":
    case "registro":
      return "inventario";
    case "presentacion":
    case "documento":
    default:
      return "reporte";
  }
}

export function evidenciasDeEntrega(
  actividad: ActividadWorkspace,
  entrega: RegistroEntrega,
  empresaId: string
): EvidenciaEmpresa[] {
  return entrega.archivos.map((archivo, indice) => ({
    id: `${entrega.id}-ev-${indice + 1}`,
    solicitudId: `entregable:${actividad.instrumentoId}`,
    titulo: `${actividad.entregable.titulo} — entrega ${entrega.numero}`,
    motivo: `Respalda la validación de la actividad “${actividad.titulo}”.`,
    instrucciones: actividad.entregable.descripcion,
    tipo: tipoDesdeFormato(actividad.entregable.formato),
    estado: "analizada",
    origen: "entrega_workspace",
    vinculo: {
      empresaId,
      dominioId: actividad.origen.dominioId,
      diagnosticoId: null,
      preguntaIds: [],
      hallazgoIds: actividad.origen.referencias,
      actividadIds: [actividad.id],
      entregableIds: [entrega.id],
      seguimientoIds: [],
      instrumentoId: actividad.instrumentoId,
      revisionId: entrega.revision.id,
    },
    solicitadaEn: entrega.entregadoEn,
    recibidaEn: entrega.entregadoEn,
    archivo,
    analisis: {
      id: `${entrega.id}-an-${indice + 1}`,
      version: VERSION_ANALISIS_SIMULADO,
      simulado: true,
      realizadoEn: entrega.revision.revisadoEn,
      senalesVerificadas: entrega.criteriosDeclarados,
      observaciones: [
        `Documento recibido como entregable del instrumento ${actividad.instrumentoId} (v${actividad.instrumentoVersion}).`,
        `Revisión de la entrega ${entrega.numero}: ${entrega.revision.mensaje}`,
        "El análisis es simulado: en esta versión Pymapa no lee el contenido del documento.",
      ],
      resuelveSuficiencia: entrega.revision.veredicto === "validado",
    },
  }));
}

/**
 * Incorpora (de forma idempotente) las evidencias de una entrega al registro
 * documental de la empresa y devuelve sus identificadores para enlazarlos desde
 * el historial de la actividad.
 */
export function adjuntarEvidenciasDeEntrega(
  registro: RegistroEvidenciasEmpresa,
  actividad: ActividadWorkspace,
  entrega: RegistroEntrega
): { registro: RegistroEvidenciasEmpresa; evidenciaIds: string[] } {
  const nuevas = evidenciasDeEntrega(actividad, entrega, registro.empresaId);
  if (nuevas.length === 0) return { registro, evidenciaIds: [] };

  const existentes = new Set(registro.evidencias.map((e) => e.id));
  const agregadas = nuevas.filter((e) => !existentes.has(e.id));

  return {
    registro: { ...registro, evidencias: [...registro.evidencias, ...agregadas] },
    evidenciaIds: nuevas.map((e) => e.id),
  };
}

/** Evidencias de la empresa producidas por la ejecución de una actividad. */
export function evidenciasDeActividad(
  registro: RegistroEvidenciasEmpresa,
  actividadId: string
): EvidenciaEmpresa[] {
  return registro.evidencias.filter((e) => e.vinculo.actividadIds.includes(actividadId));
}

/** Enlaza una evidencia existente con una medición de seguimiento (B7). */
export function vincularEvidenciaConSeguimiento(
  registro: RegistroEvidenciasEmpresa,
  evidenciaId: string,
  seguimientoId: string
): RegistroEvidenciasEmpresa {
  return {
    ...registro,
    evidencias: registro.evidencias.map((e) =>
      e.id === evidenciaId
        ? {
            ...e,
            vinculo: {
              ...e.vinculo,
              seguimientoIds: Array.from(
                new Set([...(e.vinculo.seguimientoIds ?? []), seguimientoId])
              ),
            },
          }
        : e
    ),
  };
}
