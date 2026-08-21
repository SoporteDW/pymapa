/**
 * B9 · Servicio de apoyo humano: funciones puras sobre el registro por empresa.
 *
 * Ciclo demostrativo: sugerida → reservada → realizada → retorno al recorrido.
 */

import { obtenerReglaApoyo, type SugerenciaApoyo } from "./reglas";
import type {
  EstadoApoyo,
  OrigenApoyo,
  RecomendacionApoyo,
  RegistroApoyoEmpresa,
  ReservaSesionApoyo,
  ResultadoSesionApoyo,
} from "./tipos";

export const etiquetaEstadoApoyo: Record<EstadoApoyo, string> = {
  sugerida: "Apoyo sugerido",
  reservada: "Sesión reservada (demo)",
  realizada: "Sesión realizada (demo)",
  descartada: "Descartada",
};

function identificador(): string {
  return `ap-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function reemplazar(
  registro: RegistroApoyoEmpresa,
  recomendacion: RecomendacionApoyo
): RegistroApoyoEmpresa {
  const actualizado = { ...recomendacion, actualizadoEn: new Date().toISOString() };
  const existe = registro.recomendaciones.some((r) => r.id === recomendacion.id);
  return {
    ...registro,
    recomendaciones: existe
      ? registro.recomendaciones.map((r) => (r.id === recomendacion.id ? actualizado : r))
      : [...registro.recomendaciones, actualizado],
  };
}

/**
 * Idempotente por (regla, origen): la misma condición detectada dos veces no
 * genera dos recomendaciones abiertas.
 */
export function registrarRecomendacion(
  registro: RegistroApoyoEmpresa,
  sugerencia: SugerenciaApoyo,
  origen: OrigenApoyo,
  empresaId: string,
  ahora: string = new Date().toISOString()
): { registro: RegistroApoyoEmpresa; recomendacion: RecomendacionApoyo } {
  const existente = registro.recomendaciones.find(
    (r) =>
      r.reglaId === sugerencia.reglaId &&
      r.origen.referenciaId === origen.referenciaId &&
      r.estado !== "descartada"
  );
  if (existente) return { registro, recomendacion: existente };

  const recomendacion: RecomendacionApoyo = {
    id: identificador(),
    empresaId,
    reglaId: sugerencia.reglaId,
    reglaVersion: sugerencia.reglaVersion,
    motivoTipo: sugerencia.motivoTipo,
    especialidad: sugerencia.especialidad,
    porQue: sugerencia.porQue,
    objetivos: sugerencia.objetivos,
    origen,
    estado: "sugerida",
    reserva: null,
    resultado: null,
    creadaEn: ahora,
    actualizadoEn: ahora,
  };
  return { registro: reemplazar(registro, recomendacion), recomendacion };
}

export interface EntradaReserva {
  especialistaId: string;
  especialistaNombre: string;
  fecha: string;
  hora: string;
}

/** Reserva demostrativa: no constituye una cita real. */
export function reservarSesion(
  registro: RegistroApoyoEmpresa,
  recomendacionId: string,
  entrada: EntradaReserva,
  ahora: string = new Date().toISOString()
): { registro: RegistroApoyoEmpresa; reserva: ReservaSesionApoyo | null } {
  const recomendacion = registro.recomendaciones.find((r) => r.id === recomendacionId);
  if (!recomendacion || recomendacion.estado === "realizada") {
    return { registro, reserva: null };
  }
  const reserva: ReservaSesionApoyo = {
    especialistaId: entrada.especialistaId,
    especialistaNombre: entrada.especialistaNombre,
    fecha: entrada.fecha,
    hora: entrada.hora,
    confirmadaEn: ahora,
    demostrativa: true,
  };
  return {
    registro: reemplazar(registro, { ...recomendacion, estado: "reservada", reserva }),
    reserva,
  };
}

/**
 * Cierra la salida de autopista: la sesión se realizó y su conclusión vuelve al
 * contexto de la actividad de origen.
 */
export function registrarSesionRealizada(
  registro: RegistroApoyoEmpresa,
  recomendacionId: string,
  conclusion: string,
  recomendacionRetorno: string,
  ahora: string = new Date().toISOString()
): { registro: RegistroApoyoEmpresa; resultado: ResultadoSesionApoyo | null } {
  const recomendacion = registro.recomendaciones.find((r) => r.id === recomendacionId);
  if (!recomendacion || recomendacion.estado !== "reservada") {
    return { registro, resultado: null };
  }
  const resultado: ResultadoSesionApoyo = {
    realizadaEn: ahora,
    conclusion: conclusion.trim(),
    recomendacionRetorno: recomendacionRetorno.trim(),
    demostrativa: true,
  };
  return {
    registro: reemplazar(registro, { ...recomendacion, estado: "realizada", resultado }),
    resultado,
  };
}

export function descartarRecomendacion(
  registro: RegistroApoyoEmpresa,
  recomendacionId: string
): RegistroApoyoEmpresa {
  const recomendacion = registro.recomendaciones.find((r) => r.id === recomendacionId);
  if (!recomendacion) return registro;
  return reemplazar(registro, { ...recomendacion, estado: "descartada" });
}

export function recomendacionesDe(
  registro: RegistroApoyoEmpresa,
  filtro: { referenciaId?: string; estado?: EstadoApoyo }
): RecomendacionApoyo[] {
  return registro.recomendaciones.filter((r) => {
    if (filtro.referenciaId && r.origen.referenciaId !== filtro.referenciaId) return false;
    if (filtro.estado && r.estado !== filtro.estado) return false;
    return true;
  });
}

export function abiertas(registro: RegistroApoyoEmpresa): RecomendacionApoyo[] {
  return registro.recomendaciones.filter(
    (r) => r.estado === "sugerida" || r.estado === "reservada"
  );
}

/** Explicabilidad: fuente de la regla que originó la recomendación. */
export function fuenteRegla(recomendacion: RecomendacionApoyo): string {
  return obtenerReglaApoyo(recomendacion.reglaId)?.fuente ?? "Reglas de apoyo Pymapa";
}
