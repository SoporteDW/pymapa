/**
 * Alertas operativas del Roadmap (POC-06, sección 15).
 * Cada alerta declara severidad, motivo y qué hacer, sin depender del color.
 */

import { dependenciasPendientes } from "./estados";
import { estaProximaAVencer, estaVencida, sinFecha, sinResponsable } from "./avance";
import { hoyISO } from "./fechas";
import type { AccionRoadmap, Roadmap } from "./tipos";

export type TipoAlerta =
  | "vencida"
  | "proxima"
  | "bloqueada"
  | "sin_responsable"
  | "dependencia"
  | "sin_fecha";

export type SeveridadAlerta = "critica" | "advertencia" | "informativa";

export interface AlertaOperativa {
  tipo: TipoAlerta;
  severidad: SeveridadAlerta;
  titulo: string;
  detalle: string;
  accionId: string;
  accionTitulo: string;
}

export function alertasDeAccion(
  roadmap: Roadmap,
  accion: AccionRoadmap,
  hoy = hoyISO()
): AlertaOperativa[] {
  if (accion.estado === "DESCARTADA") return [];
  const base = { accionId: accion.id, accionTitulo: accion.titulo };
  const alertas: AlertaOperativa[] = [];

  if (estaVencida(accion, hoy)) {
    alertas.push({
      ...base,
      tipo: "vencida",
      severidad: "critica",
      titulo: "Vencida",
      detalle: "La fecha objetivo ya pasó y la acción no está completada. Revísala o reprográmala.",
    });
  } else if (estaProximaAVencer(accion, hoy)) {
    alertas.push({
      ...base,
      tipo: "proxima",
      severidad: "advertencia",
      titulo: "Próxima a vencer",
      detalle: "Quedan tres días o menos para la fecha objetivo.",
    });
  }

  if (accion.estado === "BLOQUEADA") {
    const bloqueo = roadmap.bloqueos.find((b) => b.accionId === accion.id && b.estado === "abierto");
    alertas.push({
      ...base,
      tipo: "bloqueada",
      severidad: "critica",
      titulo: "Bloqueada",
      detalle: bloqueo?.descripcion ?? "Hay un impedimento registrado sin descripción.",
    });
  }

  if (sinResponsable(accion)) {
    alertas.push({
      ...base,
      tipo: "sin_responsable",
      severidad: "advertencia",
      titulo: "Sin responsable",
      detalle: `Nadie tiene asignada esta acción. Sugerencia: ${accion.responsableSugerido}.`,
    });
  }

  const pendientes = dependenciasPendientes(roadmap, accion);
  if (pendientes.length > 0 && accion.estado !== "EN_CURSO" && accion.estado !== "COMPLETADA") {
    alertas.push({
      ...base,
      tipo: "dependencia",
      severidad: "informativa",
      titulo: "Dependencia pendiente",
      detalle: `Primero debe avanzar: ${pendientes.map((d) => d.titulo).join(", ")}.`,
    });
  }

  if (sinFecha(accion)) {
    alertas.push({
      ...base,
      tipo: "sin_fecha",
      severidad: "informativa",
      titulo: "Sin fecha",
      detalle: "Aparece en “Por programar” hasta que definas una fecha objetivo.",
    });
  }

  return alertas;
}

export function alertasDelRoadmap(roadmap: Roadmap, hoy = hoyISO()): AlertaOperativa[] {
  const orden: Record<SeveridadAlerta, number> = { critica: 3, advertencia: 2, informativa: 1 };
  return roadmap.acciones
    .flatMap((accion) => alertasDeAccion(roadmap, accion, hoy))
    .sort((a, b) => orden[b.severidad] - orden[a.severidad]);
}
