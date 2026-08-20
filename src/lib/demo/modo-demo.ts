/**
 * Modo Demostración controlado.
 *
 * Permite recorrer el producto con datos simulados sin destruir la información
 * de una empresa real: antes de activar la demostración se respalda todo el
 * estado local y, al salir, se restaura tal como estaba.
 */

import {
  exportarSesion,
  importarSesion,
  reiniciarSesionCompleta,
  type RespaldoSesion,
} from "@/lib/integracion/sesion-trabajo";
import { limpiarEstado as limpiarDiagnostico } from "@/lib/diagnostico/repositorio";

export const CLAVE_MODO_DEMO = "pymapa:modo-demo:v1";
export const CLAVE_RESPALDO_REAL = "pymapa:respaldo-empresa-real:v1";

export type ModoDemo = "completa" | "paso_a_paso";

export interface EstadoModoDemo {
  activo: boolean;
  modo: ModoDemo | null;
  perfilId: string | null;
  perfilNombre: string | null;
  iniciadoEn: string | null;
  /** Verdadero cuando hay datos de una empresa real guardados para restaurar. */
  hayRespaldoReal: boolean;
}

export function modoDemoInicial(): EstadoModoDemo {
  return {
    activo: false,
    modo: null,
    perfilId: null,
    perfilNombre: null,
    iniciadoEn: null,
    hayRespaldoReal: false,
  };
}

function store(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function leerModoDemo(): EstadoModoDemo {
  const s = store();
  if (!s) return modoDemoInicial();
  try {
    const crudo = s.getItem(CLAVE_MODO_DEMO);
    if (!crudo) return modoDemoInicial();
    const parseado = JSON.parse(crudo) as Partial<EstadoModoDemo>;
    return { ...modoDemoInicial(), ...parseado };
  } catch {
    return modoDemoInicial();
  }
}

const EVENTO_CAMBIO = "pymapa:modo-demo-cambio";

/** Notifica a todas las vistas montadas que el modo demostración cambió. */
export function notificarCambioModoDemo(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENTO_CAMBIO));
}

export function suscribirModoDemo(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENTO_CAMBIO, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENTO_CAMBIO, callback);
    window.removeEventListener("storage", callback);
  };
}

function escribirModoDemo(estado: EstadoModoDemo): EstadoModoDemo {
  const s = store();
  try {
    s?.setItem(CLAVE_MODO_DEMO, JSON.stringify(estado));
  } catch (error) {
    console.warn("No se pudo guardar el modo demostración:", error);
  }
  notificarCambioModoDemo();
  return estado;
}

/** Respalda el estado real solo si aún no existe un respaldo pendiente. */
export function respaldarEmpresaReal(): boolean {
  const s = store();
  if (!s) return false;
  if (s.getItem(CLAVE_RESPALDO_REAL)) return true;
  try {
    const respaldo = exportarSesion();
    s.setItem(CLAVE_RESPALDO_REAL, JSON.stringify(respaldo));
    return true;
  } catch (error) {
    console.warn("No se pudo respaldar la información real:", error);
    return false;
  }
}

/** Restaura el estado real respaldado y elimina el respaldo. */
export function restaurarEmpresaReal(): boolean {
  const s = store();
  if (!s) return false;
  const crudo = s.getItem(CLAVE_RESPALDO_REAL);
  reiniciarSesionCompleta();
  limpiarDiagnostico();
  if (!crudo) {
    s.removeItem(CLAVE_MODO_DEMO);
    return false;
  }
  try {
    const respaldo = JSON.parse(crudo) as RespaldoSesion;
    importarSesion(respaldo);
  } catch (error) {
    console.warn("No se pudo restaurar la información real:", error);
  }
  s.removeItem(CLAVE_RESPALDO_REAL);
  s.removeItem(CLAVE_MODO_DEMO);
  return true;
}

/** Limpia únicamente los datos del recorrido (nunca el respaldo real). */
export function limpiarDatosRecorrido(): void {
  reiniciarSesionCompleta();
  limpiarDiagnostico();
}

export function activarModoDemo(
  modo: ModoDemo,
  perfil: { id: string; nombre: string }
): EstadoModoDemo {
  const hayRespaldoReal = respaldarEmpresaReal();
  return escribirModoDemo({
    activo: true,
    modo,
    perfilId: perfil.id,
    perfilNombre: perfil.nombre,
    iniciadoEn: new Date().toISOString(),
    hayRespaldoReal,
  });
}
