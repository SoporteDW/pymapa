/** B8 · Persistencia de delegaciones por empresa (mismo criterio que evidencias). */

import { notificarCambioEstado } from "@/lib/estado/bus";

import type { Delegacion, RegistroDelegacionEmpresa } from "./tipos";

export const CLAVE_DELEGACION = "pymapa:delegacion:v1";
const VERSION_ALMACEN = 1;

interface AlmacenDelegacion {
  version: number;
  empresas: Record<string, RegistroDelegacionEmpresa>;
}

function almacenVacio(): AlmacenDelegacion {
  return { version: VERSION_ALMACEN, empresas: {} };
}

function disponible(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function registroVacio(
  empresaId: string,
  empresaNombre: string
): RegistroDelegacionEmpresa {
  return {
    empresaId,
    empresaNombre,
    delegaciones: [],
    actualizadoEn: new Date().toISOString(),
  };
}

export function leerAlmacen(): AlmacenDelegacion {
  if (!disponible()) return almacenVacio();
  try {
    const bruto = window.localStorage.getItem(CLAVE_DELEGACION);
    if (!bruto) return almacenVacio();
    const datos = JSON.parse(bruto) as Partial<AlmacenDelegacion>;
    if (!datos || typeof datos !== "object" || typeof datos.empresas !== "object") {
      return almacenVacio();
    }
    return { version: VERSION_ALMACEN, empresas: datos.empresas ?? {} };
  } catch (error) {
    console.warn("No se pudieron leer las delegaciones guardadas:", error);
    return almacenVacio();
  }
}

export function leerRegistro(
  empresaId: string,
  empresaNombre: string
): RegistroDelegacionEmpresa {
  const existente = leerAlmacen().empresas[empresaId];
  if (!existente) return registroVacio(empresaId, empresaNombre);
  return {
    ...registroVacio(empresaId, empresaNombre),
    ...existente,
    delegaciones: Array.isArray(existente.delegaciones)
      ? (existente.delegaciones as Delegacion[])
      : [],
  };
}

export function guardarRegistro(
  registro: RegistroDelegacionEmpresa
): RegistroDelegacionEmpresa {
  const actualizado: RegistroDelegacionEmpresa = {
    ...registro,
    actualizadoEn: new Date().toISOString(),
  };
  if (!disponible()) return actualizado;
  try {
    const almacen = leerAlmacen();
    almacen.empresas[registro.empresaId] = actualizado;
    window.localStorage.setItem(CLAVE_DELEGACION, JSON.stringify(almacen));
  } catch (error) {
    console.warn("No se pudieron guardar las delegaciones:", error);
  }
  notificarCambioEstado();
  return actualizado;
}

export function limpiarRegistro(
  empresaId: string,
  empresaNombre: string
): RegistroDelegacionEmpresa {
  return guardarRegistro(registroVacio(empresaId, empresaNombre));
}
