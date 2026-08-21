/**
 * B8 · Servicio de delegación: funciones puras sobre el registro por empresa.
 *
 * Ciclo: pendiente_tercero → recibido → incorporado.
 * El correo se prepara pero no se envía automáticamente: la solicitud queda
 * marcada como simulada (`correoSimulado: true`).
 */

import { areaSugerida } from "./areas";
import type {
  Delegacion,
  EstadoDelegacion,
  OrigenDelegacion,
  RegistroDelegacionEmpresa,
} from "./tipos";

export const etiquetaEstadoDelegacion: Record<EstadoDelegacion, string> = {
  pendiente_tercero: "Pendiente del tercero",
  recibido: "Recibido",
  incorporado: "Incorporado al conocimiento",
};

export const descripcionEstadoDelegacion: Record<EstadoDelegacion, string> = {
  pendiente_tercero:
    "La solicitud está preparada y quedó registrada como pendiente de la persona asignada.",
  recibido: "La persona respondió: falta revisar e incorporar la información al recorrido.",
  incorporado: "La información ya forma parte del conocimiento acumulado de la empresa.",
};

function identificador(): string {
  return `del-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export interface EntradaDelegacion {
  empresaId: string;
  origen: OrigenDelegacion;
  nombre: string;
  correo: string;
  area?: string;
  tarea: string;
  fechaEsperada?: string | null;
  empresaNombre?: string;
  solicitante?: string;
}

export function mensajeDelegacion(entrada: EntradaDelegacion): string {
  return [
    `Hola ${entrada.nombre},`,
    "",
    `${entrada.solicitante || "El responsable"} de ${entrada.empresaNombre || "la empresa"} necesita tu apoyo dentro del recorrido de transformación digital en pymapa.`,
    "",
    `Tema: ${entrada.origen.referenciaTitulo}`,
    `Dominio: ${entrada.origen.dominioNombre}`,
    `Lo que se necesita: ${entrada.tarea}`,
    entrada.fechaEsperada ? `Fecha esperada: ${entrada.fechaEsperada}` : "",
    "",
    "Cuando respondas, la información se incorporará al diagnóstico de la empresa.",
  ]
    .filter((linea) => linea !== "")
    .join("\n");
}

export function construirDelegacion(
  entrada: EntradaDelegacion,
  ahora: string = new Date().toISOString()
): Delegacion {
  return {
    id: identificador(),
    empresaId: entrada.empresaId,
    origen: entrada.origen,
    nombre: entrada.nombre.trim(),
    correo: entrada.correo.trim(),
    area: (entrada.area ?? areaSugerida(entrada.origen.dominioId).nombre).trim(),
    tarea: entrada.tarea.trim(),
    fechaEsperada: entrada.fechaEsperada ?? null,
    estado: "pendiente_tercero",
    correoSimulado: true,
    mensajePreparado: mensajeDelegacion(entrada),
    solicitadaEn: ahora,
    recibidaEn: null,
    incorporadaEn: null,
    respuesta: "",
    actualizadoEn: ahora,
  };
}

function reemplazar(
  registro: RegistroDelegacionEmpresa,
  delegacion: Delegacion
): RegistroDelegacionEmpresa {
  const actualizado = { ...delegacion, actualizadoEn: new Date().toISOString() };
  const existe = registro.delegaciones.some((d) => d.id === delegacion.id);
  return {
    ...registro,
    delegaciones: existe
      ? registro.delegaciones.map((d) => (d.id === delegacion.id ? actualizado : d))
      : [...registro.delegaciones, actualizado],
  };
}

export function delegar(
  registro: RegistroDelegacionEmpresa,
  entrada: EntradaDelegacion,
  ahora?: string
): { registro: RegistroDelegacionEmpresa; delegacion: Delegacion | null } {
  if (!entrada.nombre.trim() || !entrada.correo.trim() || !entrada.tarea.trim()) {
    return { registro, delegacion: null };
  }
  const delegacion = construirDelegacion(entrada, ahora);
  return { registro: reemplazar(registro, delegacion), delegacion };
}

/** El tercero respondió: la información llega pero aún no se incorpora. */
export function marcarRecibido(
  registro: RegistroDelegacionEmpresa,
  delegacionId: string,
  respuesta: string,
  ahora: string = new Date().toISOString()
): RegistroDelegacionEmpresa {
  const delegacion = registro.delegaciones.find((d) => d.id === delegacionId);
  if (!delegacion || delegacion.estado === "incorporado") return registro;
  return reemplazar(registro, {
    ...delegacion,
    estado: "recibido",
    respuesta: respuesta.trim(),
    recibidaEn: ahora,
  });
}

/** La respuesta pasa a formar parte del conocimiento acumulado de la empresa. */
export function marcarIncorporado(
  registro: RegistroDelegacionEmpresa,
  delegacionId: string,
  ahora: string = new Date().toISOString()
): RegistroDelegacionEmpresa {
  const delegacion = registro.delegaciones.find((d) => d.id === delegacionId);
  if (!delegacion || delegacion.estado !== "recibido") return registro;
  return reemplazar(registro, {
    ...delegacion,
    estado: "incorporado",
    incorporadaEn: ahora,
  });
}

export function delegacionesDe(
  registro: RegistroDelegacionEmpresa,
  filtro: { referenciaId?: string; estado?: EstadoDelegacion }
): Delegacion[] {
  return registro.delegaciones.filter((d) => {
    if (filtro.referenciaId && d.origen.referenciaId !== filtro.referenciaId) return false;
    if (filtro.estado && d.estado !== filtro.estado) return false;
    return true;
  });
}

export function pendientesDeTerceros(registro: RegistroDelegacionEmpresa): Delegacion[] {
  return registro.delegaciones.filter((d) => d.estado !== "incorporado");
}
