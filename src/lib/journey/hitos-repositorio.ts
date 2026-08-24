/**
 * Macroentrega 5 · Hitos narrativos del Journey Maestro.
 *
 * Registran momentos de transición que el usuario ya vivió (la entrada a
 * "Actuar", el cierre del Plan de Acción, la entrada a "Seguir"). No son datos
 * del diagnóstico ni del workspace: sirven para que el único CTA principal no
 * repita una transición pedagógica que ya ocurrió.
 */

import { notificarCambioEstado } from "@/lib/estado/bus";

export const CLAVE_HITOS_JOURNEY = "pyme-digital:journey:hitos:v1";

export interface HitosJourney {
  /** El usuario ya vio la transición "Del diagnóstico a actividades concretas". */
  entradaActuar: boolean;
  /** El usuario ya vio el cierre del Plan de Acción (Entregable 2). */
  cierrePlan: boolean;
  /** El usuario ya vio la entrada a la etapa Seguir (Entregable 3). */
  entradaSeguir: boolean;
  actualizadoEn: string | null;
}

export function hitosVacios(): HitosJourney {
  return {
    entradaActuar: false,
    cierrePlan: false,
    entradaSeguir: false,
    actualizadoEn: null,
  };
}

export function leerHitos(): HitosJourney {
  if (typeof window === "undefined") return hitosVacios();
  try {
    const crudo = window.localStorage.getItem(CLAVE_HITOS_JOURNEY);
    if (!crudo) return hitosVacios();
    const datos = JSON.parse(crudo) as Partial<HitosJourney>;
    return {
      entradaActuar: datos.entradaActuar === true,
      cierrePlan: datos.cierrePlan === true,
      entradaSeguir: datos.entradaSeguir === true,
      actualizadoEn: datos.actualizadoEn ?? null,
    };
  } catch (error) {
    console.warn("No se pudieron leer los hitos del recorrido:", error);
    return hitosVacios();
  }
}

export function guardarHitos(hitos: HitosJourney): HitosJourney {
  const siguiente: HitosJourney = { ...hitos, actualizadoEn: new Date().toISOString() };
  if (typeof window === "undefined") return siguiente;
  try {
    window.localStorage.setItem(CLAVE_HITOS_JOURNEY, JSON.stringify(siguiente));
  } catch (error) {
    console.warn("No se pudieron guardar los hitos del recorrido:", error);
  }
  notificarCambioEstado();
  return siguiente;
}

export function marcarHito(clave: keyof Omit<HitosJourney, "actualizadoEn">): HitosJourney {
  const actuales = leerHitos();
  if (actuales[clave]) return actuales;
  return guardarHitos({ ...actuales, [clave]: true });
}

export function limpiarHitos(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CLAVE_HITOS_JOURNEY);
}
