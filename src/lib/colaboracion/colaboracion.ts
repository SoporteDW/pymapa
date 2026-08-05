/**
 * Solicitudes de Colaboración (iteración de refinamiento UX).
 *
 * Capa mínima para validar el concepto: el responsable principal pide apoyo a
 * otra persona de la empresa para una actividad concreta. Se persiste en el
 * navegador (coherente con el resto del MVP Alfa) y no modifica el Roadmap ni
 * su máquina de estados: la colaboración es una capa superpuesta.
 *
 * Fuera de alcance en esta versión: múltiples usuarios, autenticación
 * colaborativa, workflows, aprobaciones y bandejas de tareas.
 */

export type EstadoColaboracion = "en_espera" | "retomada" | "completada";

export interface SolicitudColaboracion {
  id: string;
  accionId: string;
  accionTitulo: string;
  nombre: string;
  cargo: string;
  correo: string;
  mensaje: string;
  fechaSolicitud: string;
  fechaActualizacion: string;
  estado: EstadoColaboracion;
}

export const etiquetaColaboracion: Record<EstadoColaboracion, string> = {
  en_espera: "En espera de colaboración",
  retomada: "Colaboración retomada",
  completada: "Colaboración completada",
};

const STORAGE_KEY = "pymapa-colaboraciones-v1";

function esNavegador(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function leerColaboraciones(): SolicitudColaboracion[] {
  if (!esNavegador()) return [];
  try {
    const bruto = window.localStorage.getItem(STORAGE_KEY);
    if (!bruto) return [];
    const datos = JSON.parse(bruto);
    return Array.isArray(datos) ? (datos as SolicitudColaboracion[]) : [];
  } catch (error) {
    console.warn("No se pudieron leer las solicitudes de colaboración:", error);
    return [];
  }
}

export function guardarColaboraciones(solicitudes: SolicitudColaboracion[]): void {
  if (!esNavegador()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(solicitudes));
  } catch (error) {
    console.warn("No se pudieron guardar las solicitudes de colaboración:", error);
  }
}

export interface DatosSolicitud {
  accionId: string;
  accionTitulo: string;
  nombre: string;
  cargo: string;
  correo: string;
  mensaje: string;
}

export function nuevaSolicitud(datos: DatosSolicitud): SolicitudColaboracion {
  const ahora = new Date().toISOString();
  return {
    id: `colab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ...datos,
    fechaSolicitud: ahora,
    fechaActualizacion: ahora,
    estado: "en_espera",
  };
}

/** Enlace de correo con el que se envía la solicitud al colaborador. */
export function enlaceCorreo(
  solicitud: DatosSolicitud,
  remitente: { empresa: string; responsable: string }
): string {
  const asunto = `Solicitud de colaboración: ${solicitud.accionTitulo}`;
  const cuerpo = [
    `Hola ${solicitud.nombre},`,
    "",
    `${remitente.responsable || "El responsable"} de ${remitente.empresa || "la empresa"} solicita tu apoyo en la siguiente actividad del plan de transformación digital:`,
    "",
    `Actividad: ${solicitud.accionTitulo}`,
    `Rol solicitado: ${solicitud.cargo}`,
    "",
    solicitud.mensaje,
    "",
    "Enviado desde pymapa (MVP Alfa).",
  ].join("\n");
  return `mailto:${encodeURIComponent(solicitud.correo)}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
}
