/**
 * B3 · Persistencia de evidencias por empresa.
 *
 * Las evidencias son conocimiento de la empresa: se guardan por `empresaId`,
 * de forma independiente de la sesión del formulario y del modo demostración.
 * No se almacena el contenido del archivo, solo sus metadatos y su análisis.
 */

import { notificarCambioEstado } from "@/lib/estado/bus";

import type { RegistroEvidenciasEmpresa } from "./tipos";

export const CLAVE_EVIDENCIAS = "pymapa:evidencias:v1";
const VERSION_ALMACEN = 1;

interface AlmacenEvidencias {
  version: number;
  empresas: Record<string, RegistroEvidenciasEmpresa>;
}

function almacenVacio(): AlmacenEvidencias {
  return { version: VERSION_ALMACEN, empresas: {} };
}

function disponible(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function registroVacio(empresaId: string, empresaNombre: string): RegistroEvidenciasEmpresa {
  return {
    empresaId,
    empresaNombre,
    evidencias: [],
    aclaraciones: [],
    actualizadoEn: new Date().toISOString(),
  };
}

export function leerAlmacen(): AlmacenEvidencias {
  if (!disponible()) return almacenVacio();
  try {
    const bruto = window.localStorage.getItem(CLAVE_EVIDENCIAS);
    if (!bruto) return almacenVacio();
    const datos = JSON.parse(bruto) as Partial<AlmacenEvidencias>;
    if (!datos || typeof datos !== "object" || typeof datos.empresas !== "object") {
      return almacenVacio();
    }
    return { version: VERSION_ALMACEN, empresas: datos.empresas ?? {} };
  } catch (error) {
    console.warn("No se pudieron leer las evidencias guardadas:", error);
    return almacenVacio();
  }
}

export function leerRegistro(
  empresaId: string,
  empresaNombre: string
): RegistroEvidenciasEmpresa {
  const existente = leerAlmacen().empresas[empresaId];
  if (!existente) return registroVacio(empresaId, empresaNombre);
  return {
    ...registroVacio(empresaId, empresaNombre),
    ...existente,
    evidencias: Array.isArray(existente.evidencias) ? existente.evidencias : [],
    aclaraciones: Array.isArray(existente.aclaraciones) ? existente.aclaraciones : [],
  };
}

export function guardarRegistro(registro: RegistroEvidenciasEmpresa): RegistroEvidenciasEmpresa {
  const actualizado: RegistroEvidenciasEmpresa = {
    ...registro,
    actualizadoEn: new Date().toISOString(),
  };
  if (!disponible()) return actualizado;
  try {
    const almacen = leerAlmacen();
    almacen.empresas[registro.empresaId] = actualizado;
    window.localStorage.setItem(CLAVE_EVIDENCIAS, JSON.stringify(almacen));
  } catch (error) {
    console.warn("No se pudieron guardar las evidencias:", error);
  }
  notificarCambioEstado();
  return actualizado;
}

export function limpiarRegistro(
  empresaId: string,
  empresaNombre: string
): RegistroEvidenciasEmpresa {
  return guardarRegistro(registroVacio(empresaId, empresaNombre));
}
