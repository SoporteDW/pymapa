/**
 * Identidad determinística de contenido gobernado.
 *
 * Reglas:
 * - La forma canónica ordena claves recursivamente: dos objetos con el mismo
 *   contenido producen el mismo checksum independientemente del orden de escritura.
 * - El checksum NO interpreta semántica: solo fija identidad de contenido.
 */
import { createHash } from "node:crypto";

/** Serialización canónica (claves ordenadas, sin espacios). */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entradas = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entradas.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
}

export function sha256Hex(texto: string): string {
  return createHash("sha256").update(texto, "utf8").digest("hex");
}

/** Checksum con prefijo de algoritmo, para que el registro sea autodescriptivo. */
export function computeChecksum(value: unknown): string {
  return `sha256:${sha256Hex(canonicalJson(value))}`;
}

/** Checksum de un documento que declara su propio `checksum` (se excluye del cálculo). */
export function computeSelfChecksum(documento: Record<string, unknown>): string {
  const { checksum: _ignorado, ...resto } = documento;
  return computeChecksum(resto);
}

export function verifySelfChecksum(documento: Record<string, unknown>): {
  ok: boolean;
  expected: string;
  declared: unknown;
} {
  const expected = computeSelfChecksum(documento);
  return { ok: documento["checksum"] === expected, expected, declared: documento["checksum"] };
}
