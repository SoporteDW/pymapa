/**
 * Analítica de interacción provisional (POC-02, sección 13).
 * Registra eventos en memoria y en localStorage para facilitar la validación
 * del prototipo. No envía datos a ningún servicio externo.
 */

export type EventoInteraccion =
  | "vista_abierta"
  | "perfil_guardado"
  | "diagnostico_iniciado"
  | "paso_completado"
  | "diagnostico_completado"
  | "resultados_generados"
  | "dimension_abierta"
  | "accion_abierta"
  | "accion_iniciada"
  | "accion_completada"
  | "datos_demo_cargados"
  | "datos_reiniciados"
  | "ruta_invalida";

const STORAGE_KEY = "pyme-digital-eventos-v1";
const MAX_EVENTOS = 100;

export interface RegistroEvento {
  evento: EventoInteraccion;
  detalle?: Record<string, string | number | boolean> | undefined;
  fecha: string;
}

export function registrarEvento(
  evento: EventoInteraccion,
  detalle?: Record<string, string | number | boolean>
) {
  const registro: RegistroEvento = { evento, detalle, fecha: new Date().toISOString() };
  if (typeof window === "undefined") return;
  try {
    const previo = window.localStorage.getItem(STORAGE_KEY);
    const lista: RegistroEvento[] = previo ? JSON.parse(previo) : [];
    lista.unshift(registro);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lista.slice(0, MAX_EVENTOS)));
  } catch {
    // La analítica provisional nunca debe bloquear la navegación.
  }
}

export function leerEventos(): RegistroEvento[] {
  if (typeof window === "undefined") return [];
  try {
    const previo = window.localStorage.getItem(STORAGE_KEY);
    return previo ? (JSON.parse(previo) as RegistroEvento[]) : [];
  } catch {
    return [];
  }
}
