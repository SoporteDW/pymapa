/**
 * PYMAPA-MME v1.0 · G1 · Catálogo versionado (server-only).
 * Fuente: paquete DEC-062 06B (catálogo 31/155/620, OP-05 64) y kit de cotejo (445 vínculos).
 * Todos los predicados, checks, vínculos e indicadores quedan INACTIVOS por defecto.
 */
import catalogoJson from "./datos/catalogo_mme_31_155_620.json";
import op05Json from "./datos/op05_64_execution_only.json";
import vinculosJson from "./datos/09_DATOS_vinculos_candidatos_445.json";
import type { ActivationRegistry, MmeCandidateBinding, MmeCatalog } from "./tipos";

export const MME_CATALOGO: MmeCatalog = catalogoJson as unknown as MmeCatalog;
export const MME_OP05_EJECUCION = op05Json as unknown as Array<{
  scope: "EXECUTION_OP05";
  included_initial_diagnosis: boolean;
  [k: string]: unknown;
}>;
export const MME_VINCULOS_CANDIDATOS = vinculosJson as unknown as MmeCandidateBinding[];

/** SHA-256 de los archivos de origen tal como se recibieron. */
export const MME_FUENTES_SHA256 = {
  "catalogo_mme_31_155_620.json": "c53e80f94110d0a33fc07f514a40bffd6fa3ec829c40ec803b2efb9339623151",
  "op05_64_execution_only.json": "cf84723e59d3dfdd313cf8d89c543d3ded0f83c632bc89828b1d6ea08dc79fba",
  "09_DATOS_vinculos_candidatos_445.json": "f636b4e5238ea9521a9d714e811ba4d26df772fc83366cc6f4c1d153533970d4",
  "mme_dec062.py": "80f0a28b611d4fc4dd58939923d490842f62909b7593cbda19cdd76be553c896",
} as const;

/** Registro de activación por defecto: vacío → nada habilitado. */
export function registroActivacionInactivo(): ActivationRegistry {
  return {};
}

export function conteosCatalogo(cat: MmeCatalog = MME_CATALOGO) {
  const caps = Object.values(cat.capabilities);
  return {
    capacidades: caps.length,
    rubricas: caps.reduce((n, c) => n + Object.keys(c.levels).length, 0),
    verificaciones: caps.reduce(
      (n, c) => n + Object.values(c.levels).reduce((m, l) => m + l.checks.length, 0),
      0,
    ),
    indicadores: Object.keys(cat.indicators).length,
    vinculos: MME_VINCULOS_CANDIDATOS.length,
  };
}
