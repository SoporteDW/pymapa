/**
 * PKG-02A · Entrada pública y navegación productiva (funciones puras).
 * Sin conocimiento diagnóstico: solo enrutamiento e identidad de empresa.
 */

/** Nombre provisional que asigna el bootstrap productivo a una organización nueva. */
export const NOMBRE_ORGANIZACION_PROVISIONAL = "Organización de trabajo";

export const RUTA_ACCESO = "/acceso" as const;
export const RUTA_EMPRESA = "/empresa" as const;
export const RUTA_HUB = "/diagnostico-productivo" as const;
export const RUTA_RESULTADOS = "/resultados-productivos" as const;

/** Destino del CTA principal "Iniciar mi recorrido" de la Home pública. */
export function rutaCtaPrincipal(autenticado: boolean): typeof RUTA_ACCESO | typeof RUTA_EMPRESA {
  // Autenticado → /empresa: completa el nombre si falta; si no, continúa al hub.
  return autenticado ? RUTA_EMPRESA : RUTA_ACCESO;
}

/** La empresa requiere onboarding mientras conserve el nombre provisional. */
export function requiereNombreEmpresa(nombre: string | null | undefined): boolean {
  const n = (nombre ?? "").trim();
  return n.length === 0 || n === NOMBRE_ORGANIZACION_PROVISIONAL;
}

/** Destino tras el login o tras pulsar el CTA principal estando autenticado. */
export function destinoProductivo(nombre: string | null | undefined): typeof RUTA_EMPRESA | typeof RUTA_HUB {
  return requiereNombreEmpresa(nombre) ? RUTA_EMPRESA : RUTA_HUB;
}

export function validarNombreEmpresa(valor: unknown): { ok: true; nombre: string } | { ok: false; error: string } {
  if (typeof valor !== "string") return { ok: false, error: "NOMBRE_REQUERIDO" };
  const nombre = valor.trim().replace(/\s+/g, " ");
  if (nombre.length < 2) return { ok: false, error: "NOMBRE_REQUERIDO" };
  if (nombre.length > 120) return { ok: false, error: "NOMBRE_DEMASIADO_LARGO" };
  if (nombre === NOMBRE_ORGANIZACION_PROVISIONAL) return { ok: false, error: "NOMBRE_PROVISIONAL" };
  return { ok: true, nombre };
}

const PREFIJOS_PRODUCTIVOS = [RUTA_EMPRESA, RUTA_HUB, RUTA_RESULTADOS, "/capacidad", RUTA_ACCESO, "/invitacion"];

/** Rutas del journey productivo (navegación sin enlaces legacy ni progreso demo). */
export function esRutaProductiva(pathname: string): boolean {
  return PREFIJOS_PRODUCTIVOS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Navegación productiva mínima. Solo rutas productivas existentes. */
export const navegacionProductiva = [
  { id: "diagnostico", to: RUTA_HUB, label: "Diagnóstico" },
  { id: "capacidades", to: "/capacidad/op-01", label: "Capacidad de referencia (OP-01)" },
  { id: "resultados", to: RUTA_RESULTADOS, label: "Resultados (preliminar)" },
  { id: "empresa", to: RUTA_EMPRESA, label: "Mi empresa" },
] as const;
