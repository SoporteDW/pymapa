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

export const RUTA_AYUDA = "/ayuda" as const;

const PREFIJOS_PRODUCTIVOS = [RUTA_EMPRESA, RUTA_HUB, RUTA_RESULTADOS, "/capacidad", RUTA_ACCESO, "/invitacion", RUTA_AYUDA];

/** Rutas del journey productivo (navegación sin enlaces legacy ni progreso demo). */
export function esRutaProductiva(pathname: string): boolean {
  return PREFIJOS_PRODUCTIVOS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Rutas públicas compartidas (landing): no pertenecen a la demo ni a producción. */
const RUTAS_PUBLICAS = ["/"];

/**
 * SPRINT-04-FIX · Autoridad única del shell. Producción si la ruta es
 * productiva, o si hay sesión y la ruta es pública compartida. El resto
 * (MVP Alfa / Moda Origen) es demostración explícita, con su aviso visible.
 */
export function modoShell(pathname: string, autenticado: boolean): "PRODUCCION" | "DEMO" {
  if (esRutaProductiva(pathname)) return "PRODUCCION";
  if (autenticado && RUTAS_PUBLICAS.includes(pathname)) return "PRODUCCION";
  return "DEMO";
}

/**
 * Navegación productiva mínima. Solo rutas productivas existentes.
 * OP-01 se accede desde el catálogo de 31 capacidades (sin entrada aparte).
 */
export const navegacionProductiva = [
  { id: "diagnostico", to: RUTA_HUB, label: "Diagnóstico" },
  { id: "resultados", to: RUTA_RESULTADOS, label: "Resultados (preliminar)" },
  { id: "empresa", to: RUTA_EMPRESA, label: "Mi empresa" },
] as const;
