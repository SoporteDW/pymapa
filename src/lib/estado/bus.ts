/**
 * Macroentrega 5.2 · Bus de estado del journey.
 *
 * Causa raíz corregida: cada hook mantenía su propia copia local del registro
 * persistido y solo lo leía al montar. Dos instancias del mismo estado en una
 * misma pantalla (por ejemplo `useEvidencias` y el `useEvidencias` interno de
 * `useEstadoDiagnostico`) quedaban desincronizadas y producían mensajes
 * contradictorios ("información suficiente" junto a "faltan 3 aspectos").
 *
 * Este bus es la pieza que faltaba: toda escritura de repositorio notifica una
 * versión global y todos los hooks vuelven a leer la fuente única de verdad.
 * No guarda datos: solo señaliza "el estado de la empresa cambió".
 */

import { useSyncExternalStore } from "react";

type Suscriptor = () => void;

const suscriptores = new Set<Suscriptor>();
let version = 0;

/** Llamado por los repositorios después de cada escritura efectiva. */
export function notificarCambioEstado(): void {
  version += 1;
  for (const suscriptor of [...suscriptores]) {
    try {
      suscriptor();
    } catch (error) {
      console.warn("Un suscriptor del estado falló al notificarse:", error);
    }
  }
}

export function suscribirEstado(suscriptor: Suscriptor): () => void {
  suscriptores.add(suscriptor);
  return () => {
    suscriptores.delete(suscriptor);
  };
}

export function versionEstado(): number {
  return version;
}

/** Versión vigente del estado; cambia en cada escritura de cualquier módulo. */
export function useVersionEstado(): number {
  return useSyncExternalStore(suscribirEstado, versionEstado, () => 0);
}

/**
 * Evita re-render en cascada cuando la relectura devuelve datos equivalentes.
 * Se compara por contenido porque los registros se rehidratan desde JSON.
 */
export function mismoRegistro<T>(a: T, b: T): boolean {
  if (a === b) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}
