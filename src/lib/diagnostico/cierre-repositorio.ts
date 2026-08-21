/**
 * Macroentrega 4.1 · Cierre formal del diagnóstico.
 *
 * El cuestionario y la profundización se derivan de sus propios datos, pero el
 * paso "el diagnóstico quedó cerrado y el informe emitido" es una decisión del
 * usuario y necesita memoria propia. Aquí se guarda únicamente ese hecho.
 */

export const CLAVE_CIERRE_DIAGNOSTICO = "pymapa:diagnostico-cerrado:v1";

export interface CierreDiagnostico {
  /** Diagnóstico cerrado (id de la sesión del instrumento). */
  diagnosticoId: string | null;
  cerradoEn: string | null;
}

export function cierreVacio(): CierreDiagnostico {
  return { diagnosticoId: null, cerradoEn: null };
}

function store(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function leerCierre(): CierreDiagnostico {
  const s = store();
  if (!s) return cierreVacio();
  try {
    const crudo = s.getItem(CLAVE_CIERRE_DIAGNOSTICO);
    if (!crudo) return cierreVacio();
    return { ...cierreVacio(), ...(JSON.parse(crudo) as Partial<CierreDiagnostico>) };
  } catch {
    return cierreVacio();
  }
}

/** Registra el cierre del diagnóstico vigente (idempotente). */
export function registrarCierre(diagnosticoId: string | null): CierreDiagnostico {
  const cierre: CierreDiagnostico = {
    diagnosticoId,
    cerradoEn: new Date().toISOString(),
  };
  const s = store();
  try {
    s?.setItem(CLAVE_CIERRE_DIAGNOSTICO, JSON.stringify(cierre));
  } catch (error) {
    console.warn("No se pudo registrar el cierre del diagnóstico:", error);
  }
  return cierre;
}

export function limpiarCierre(): void {
  store()?.removeItem(CLAVE_CIERRE_DIAGNOSTICO);
}

/** Verdadero solo si el cierre corresponde al diagnóstico vigente. */
export function diagnosticoCerrado(
  cierre: CierreDiagnostico,
  diagnosticoId: string | null
): boolean {
  if (!cierre.cerradoEn) return false;
  if (!cierre.diagnosticoId || !diagnosticoId) return Boolean(cierre.cerradoEn);
  return cierre.diagnosticoId === diagnosticoId;
}
