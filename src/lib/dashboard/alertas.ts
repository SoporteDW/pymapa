/**
 * Centro de alertas del dashboard (POC-07, 8.3).
 * Reutiliza las alertas operativas del POC-06 y añade causa, consecuencia y
 * recomendación, sin depender del color para transmitir la severidad.
 */

import { alertasDelRoadmap, type SeveridadAlerta } from "@/lib/roadmap/alertas";
import { formatearFecha, hoyISO } from "@/lib/roadmap/fechas";
import { DIAS_SIN_ACTIVIDAD, antiguedadBloqueo, esCritica, prioridadesCriticas } from "./metricas";
import type { AccionRoadmap, Roadmap } from "@/lib/roadmap/tipos";
import type { AlertaDashboard, TipoAlertaDashboard } from "./tipos";

const ORDEN_SEVERIDAD: Record<SeveridadAlerta, number> = {
  critica: 3,
  advertencia: 2,
  informativa: 1,
};

export const etiquetaTipoAlerta: Record<TipoAlertaDashboard, string> = {
  vencida: "Vencimiento",
  proxima: "Próxima a vencer",
  bloqueada: "Bloqueo",
  sin_responsable: "Sin responsable",
  dependencia: "Dependencia",
  sin_fecha: "Sin fecha",
  sin_actividad: "Sin actividad",
  critica_pendiente: "Prioridad crítica",
};

export const etiquetaSeveridad: Record<SeveridadAlerta, string> = {
  critica: "Crítica",
  advertencia: "Advertencia",
  informativa: "Informativa",
};

const CONSECUENCIA: Record<TipoAlertaDashboard, string> = {
  vencida: "El plan pierde credibilidad y las siguientes acciones se retrasan.",
  proxima: "Si no se actúa esta semana, la acción pasará a vencida.",
  bloqueada: "El avance está detenido y el impacto esperado no se materializa.",
  sin_responsable: "Sin dueño, la acción no avanza aunque esté lista.",
  dependencia: "Comenzarla ahora generaría retrabajo.",
  sin_fecha: "No es posible medir cumplimiento ni anticipar atrasos.",
  sin_actividad: "El seguimiento se enfría y los atrasos se detectan tarde.",
  critica_pendiente: "Los riesgos de mayor impacto siguen abiertos.",
};

const RECOMENDACION: Record<TipoAlertaDashboard, string> = {
  vencida: "Reprograma la fecha objetivo o registra el avance real.",
  proxima: "Confirma responsable y cierra los pasos pendientes.",
  bloqueada: "Registra la resolución del impedimento y reactiva la acción.",
  sin_responsable: "Asigna un responsable con nombre y apellido.",
  dependencia: "Avanza primero la acción habilitadora.",
  sin_fecha: "Define una fecha objetivo para programarla.",
  sin_actividad: "Abre el Roadmap y actualiza el estado de las acciones abiertas.",
  critica_pendiente: "Prioriza estas acciones en la próxima semana.",
};

function ultimaFechaHistorial(roadmap: Roadmap, accionId?: string): string | null {
  const registros = accionId
    ? roadmap.historial.filter((r) => r.accionId === accionId)
    : roadmap.historial;
  if (registros.length === 0) return null;
  return [...registros].sort((a, b) => b.fecha.localeCompare(a.fecha))[0]!.fecha;
}

export function construirAlertas(
  roadmap: Roadmap,
  acciones: AccionRoadmap[],
  hoy = hoyISO()
): AlertaDashboard[] {
  const visibles = new Map(acciones.map((a) => [a.id, a]));

  const operativas: AlertaDashboard[] = alertasDelRoadmap(roadmap, hoy)
    .filter((alerta) => visibles.has(alerta.accionId))
    .map((alerta, indice) => {
      const accion = visibles.get(alerta.accionId)!;
      const bloqueo = roadmap.bloqueos.find(
        (b) => b.accionId === accion.id && b.estado === "abierto"
      );
      const causa =
        alerta.tipo === "bloqueada" && bloqueo
          ? `${alerta.detalle} Abierto hace ${antiguedadBloqueo(
              bloqueo.fechaDeteccion,
              null,
              hoy
            )} día(s).`
          : alerta.tipo === "vencida" && accion.fechaObjetivo
            ? `${alerta.detalle} Fecha objetivo: ${formatearFecha(accion.fechaObjetivo)}.`
            : alerta.detalle;
      return {
        id: `alerta-${alerta.tipo}-${accion.id}-${indice}`,
        type: alerta.tipo,
        severity: alerta.severidad,
        title: `${alerta.titulo}: ${accion.titulo}`,
        causa,
        consecuencia: CONSECUENCIA[alerta.tipo],
        recomendacion: RECOMENDACION[alerta.tipo],
        createdAt: ultimaFechaHistorial(roadmap, accion.id) ?? accion.actualizadaEn,
        relatedActionId: accion.id,
        relatedActionTitle: accion.titulo,
        dimensionId: accion.origen.dimensionId,
        status: "abierta" as const,
      };
    });

  const extra: AlertaDashboard[] = [];

  const criticas = prioridadesCriticas(acciones).filter((a) => a.estado !== "EN_CURSO");
  if (criticas.length > 0) {
    extra.push({
      id: "alerta-criticas",
      type: "critica_pendiente",
      severity: "critica",
      title: `${criticas.length} prioridad(es) crítica(s) sin iniciar`,
      causa: `Acciones críticas abiertas: ${criticas
        .slice(0, 3)
        .map((a) => a.titulo)
        .join(", ")}.`,
      consecuencia: CONSECUENCIA.critica_pendiente,
      recomendacion: RECOMENDACION.critica_pendiente,
      createdAt: null,
      relatedActionId: criticas[0]!.id,
      relatedActionTitle: criticas[0]!.titulo,
      dimensionId: criticas[0]!.origen.dimensionId,
      status: "abierta",
    });
  }

  const ultima = ultimaFechaHistorial(roadmap);
  const hayAbiertas = acciones.some(
    (a) => a.estado !== "COMPLETADA" && a.estado !== "DESCARTADA"
  );
  if (hayAbiertas) {
    const dias = ultima
      ? Math.max(
          0,
          Math.round(
            (new Date(`${hoy}T00:00:00.000Z`).getTime() - new Date(ultima).getTime()) / 86_400_000
          )
        )
      : null;
    if (dias === null || dias >= DIAS_SIN_ACTIVIDAD) {
      extra.push({
        id: "alerta-sin-actividad",
        type: "sin_actividad",
        severity: "advertencia",
        title: "Sin actividad registrada recientemente",
        causa:
          dias === null
            ? "No hay registros de seguimiento en el plan."
            : `El último registro fue hace ${dias} días.`,
        consecuencia: CONSECUENCIA.sin_actividad,
        recomendacion: RECOMENDACION.sin_actividad,
        createdAt: ultima,
        relatedActionId: null,
        relatedActionTitle: null,
        dimensionId: null,
        status: "abierta",
      });
    }
  }

  return [...extra, ...operativas].sort(
    (a, b) => ORDEN_SEVERIDAD[b.severity] - ORDEN_SEVERIDAD[a.severity]
  );
}

export function contarPorSeveridad(
  alertas: AlertaDashboard[]
): Record<SeveridadAlerta, number> {
  return {
    critica: alertas.filter((a) => a.severity === "critica").length,
    advertencia: alertas.filter((a) => a.severity === "advertencia").length,
    informativa: alertas.filter((a) => a.severity === "informativa").length,
  };
}

/** Marca acciones que ya no requieren alerta crítica (usado en pruebas y filtros). */
export function alertasCriticasDe(alertas: AlertaDashboard[]): AlertaDashboard[] {
  return alertas.filter((a) => a.severity === "critica");
}

export { esCritica };
