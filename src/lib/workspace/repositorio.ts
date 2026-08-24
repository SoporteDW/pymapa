/**
 * B4 · Persistencia del workspace por empresa.
 *
 * El estado de ejecución es conocimiento de la EMPRESA: se guarda por
 * `empresaId`, independiente de la sesión del formulario. El modo demostración
 * usa su propio `empresaId`, por lo que los datos reales quedan separados.
 */

import { notificarCambioEstado } from "@/lib/estado/bus";

import type { ActividadWorkspace, RegistroWorkspaceEmpresa } from "./tipos";

export const CLAVE_WORKSPACE = "pymapa:workspace:v1";
const VERSION_ALMACEN = 1;

interface AlmacenWorkspace {
  version: number;
  empresas: Record<string, RegistroWorkspaceEmpresa>;
}

function almacenVacio(): AlmacenWorkspace {
  return { version: VERSION_ALMACEN, empresas: {} };
}

function disponible(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function registroVacio(empresaId: string, empresaNombre: string): RegistroWorkspaceEmpresa {
  return {
    empresaId,
    empresaNombre,
    actividades: [],
    actualizadoEn: new Date().toISOString(),
  };
}

export function leerAlmacen(): AlmacenWorkspace {
  if (!disponible()) return almacenVacio();
  try {
    const bruto = window.localStorage.getItem(CLAVE_WORKSPACE);
    if (!bruto) return almacenVacio();
    const datos = JSON.parse(bruto) as Partial<AlmacenWorkspace>;
    if (!datos || typeof datos !== "object" || typeof datos.empresas !== "object") {
      return almacenVacio();
    }
    return { version: VERSION_ALMACEN, empresas: datos.empresas ?? {} };
  } catch (error) {
    console.warn("No se pudo leer el workspace guardado:", error);
    return almacenVacio();
  }
}

export function leerRegistro(empresaId: string, empresaNombre: string): RegistroWorkspaceEmpresa {
  const existente = leerAlmacen().empresas[empresaId];
  if (!existente) return registroVacio(empresaId, empresaNombre);
  return {
    ...registroVacio(empresaId, empresaNombre),
    ...existente,
    actividades: Array.isArray(existente.actividades)
      ? (existente.actividades as ActividadWorkspace[])
      : [],
  };
}

export function guardarRegistro(registro: RegistroWorkspaceEmpresa): RegistroWorkspaceEmpresa {
  const actualizado: RegistroWorkspaceEmpresa = {
    ...registro,
    actualizadoEn: new Date().toISOString(),
  };
  if (!disponible()) return actualizado;
  try {
    const almacen = leerAlmacen();
    almacen.empresas[registro.empresaId] = actualizado;
    window.localStorage.setItem(CLAVE_WORKSPACE, JSON.stringify(almacen));
  } catch (error) {
    console.warn("No se pudo guardar el workspace:", error);
  }
  notificarCambioEstado();
  return actualizado;
}

export function limpiarRegistro(
  empresaId: string,
  empresaNombre: string
): RegistroWorkspaceEmpresa {
  return guardarRegistro(registroVacio(empresaId, empresaNombre));
}
