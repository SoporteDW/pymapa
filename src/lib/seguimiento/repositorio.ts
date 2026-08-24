/**
 * B7 · Persistencia del seguimiento por empresa.
 *
 * Mismo criterio que evidencias y workspace: el conocimiento es de la EMPRESA y
 * se guarda por `empresaId`, por lo que el modo demostración (que usa otro id)
 * nunca contamina los datos reales.
 */

import { notificarCambioEstado } from "@/lib/estado/bus";

import type { RegistroSeguimientoEmpresa, SeguimientoActividad } from "./tipos";

export const CLAVE_SEGUIMIENTO = "pymapa:seguimiento:v1";
const VERSION_ALMACEN = 1;

interface AlmacenSeguimiento {
  version: number;
  empresas: Record<string, RegistroSeguimientoEmpresa>;
}

function almacenVacio(): AlmacenSeguimiento {
  return { version: VERSION_ALMACEN, empresas: {} };
}

function disponible(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function registroVacio(
  empresaId: string,
  empresaNombre: string
): RegistroSeguimientoEmpresa {
  return {
    empresaId,
    empresaNombre,
    seguimientos: [],
    actualizadoEn: new Date().toISOString(),
  };
}

export function leerAlmacen(): AlmacenSeguimiento {
  if (!disponible()) return almacenVacio();
  try {
    const bruto = window.localStorage.getItem(CLAVE_SEGUIMIENTO);
    if (!bruto) return almacenVacio();
    const datos = JSON.parse(bruto) as Partial<AlmacenSeguimiento>;
    if (!datos || typeof datos !== "object" || typeof datos.empresas !== "object") {
      return almacenVacio();
    }
    return { version: VERSION_ALMACEN, empresas: datos.empresas ?? {} };
  } catch (error) {
    console.warn("No se pudo leer el seguimiento guardado:", error);
    return almacenVacio();
  }
}

export function leerRegistro(
  empresaId: string,
  empresaNombre: string
): RegistroSeguimientoEmpresa {
  const existente = leerAlmacen().empresas[empresaId];
  if (!existente) return registroVacio(empresaId, empresaNombre);
  return {
    ...registroVacio(empresaId, empresaNombre),
    ...existente,
    seguimientos: Array.isArray(existente.seguimientos)
      ? (existente.seguimientos as SeguimientoActividad[])
      : [],
  };
}

export function guardarRegistro(
  registro: RegistroSeguimientoEmpresa
): RegistroSeguimientoEmpresa {
  const actualizado: RegistroSeguimientoEmpresa = {
    ...registro,
    actualizadoEn: new Date().toISOString(),
  };
  if (!disponible()) return actualizado;
  try {
    const almacen = leerAlmacen();
    almacen.empresas[registro.empresaId] = actualizado;
    window.localStorage.setItem(CLAVE_SEGUIMIENTO, JSON.stringify(almacen));
  } catch (error) {
    console.warn("No se pudo guardar el seguimiento:", error);
  }
  notificarCambioEstado();
  return actualizado;
}

export function limpiarRegistro(
  empresaId: string,
  empresaNombre: string
): RegistroSeguimientoEmpresa {
  return guardarRegistro(registroVacio(empresaId, empresaNombre));
}
