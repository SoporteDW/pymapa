/** B9 · Persistencia de recomendaciones de apoyo por empresa. */

import type { RecomendacionApoyo, RegistroApoyoEmpresa } from "./tipos";

export const CLAVE_APOYO = "pymapa:apoyo-humano:v1";
const VERSION_ALMACEN = 1;

interface AlmacenApoyo {
  version: number;
  empresas: Record<string, RegistroApoyoEmpresa>;
}

function almacenVacio(): AlmacenApoyo {
  return { version: VERSION_ALMACEN, empresas: {} };
}

function disponible(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function registroVacio(empresaId: string, empresaNombre: string): RegistroApoyoEmpresa {
  return {
    empresaId,
    empresaNombre,
    recomendaciones: [],
    actualizadoEn: new Date().toISOString(),
  };
}

export function leerAlmacen(): AlmacenApoyo {
  if (!disponible()) return almacenVacio();
  try {
    const bruto = window.localStorage.getItem(CLAVE_APOYO);
    if (!bruto) return almacenVacio();
    const datos = JSON.parse(bruto) as Partial<AlmacenApoyo>;
    if (!datos || typeof datos !== "object" || typeof datos.empresas !== "object") {
      return almacenVacio();
    }
    return { version: VERSION_ALMACEN, empresas: datos.empresas ?? {} };
  } catch (error) {
    console.warn("No se pudieron leer las solicitudes de apoyo guardadas:", error);
    return almacenVacio();
  }
}

export function leerRegistro(empresaId: string, empresaNombre: string): RegistroApoyoEmpresa {
  const existente = leerAlmacen().empresas[empresaId];
  if (!existente) return registroVacio(empresaId, empresaNombre);
  return {
    ...registroVacio(empresaId, empresaNombre),
    ...existente,
    recomendaciones: Array.isArray(existente.recomendaciones)
      ? (existente.recomendaciones as RecomendacionApoyo[])
      : [],
  };
}

export function guardarRegistro(registro: RegistroApoyoEmpresa): RegistroApoyoEmpresa {
  const actualizado: RegistroApoyoEmpresa = {
    ...registro,
    actualizadoEn: new Date().toISOString(),
  };
  if (!disponible()) return actualizado;
  try {
    const almacen = leerAlmacen();
    almacen.empresas[registro.empresaId] = actualizado;
    window.localStorage.setItem(CLAVE_APOYO, JSON.stringify(almacen));
  } catch (error) {
    console.warn("No se pudieron guardar las solicitudes de apoyo:", error);
  }
  return actualizado;
}

export function limpiarRegistro(
  empresaId: string,
  empresaNombre: string
): RegistroApoyoEmpresa {
  return guardarRegistro(registroVacio(empresaId, empresaNombre));
}
