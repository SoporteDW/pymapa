/**
 * Source-to-pack diff.
 *
 * Objetivo: ninguna modificación semántica puede pasar inadvertida entre la
 * fuente gobernada y el Pack Candidate.
 */
import { NOT_EXPLICIT } from "@pymapa/knowledge-schema";
import { PACK_IDENTITY_KEYS } from "./generator.ts";
import type { CapabilitySource } from "./master.ts";

export interface DiffEntry {
  path: string;
  source?: unknown;
  pack?: unknown;
  note: string;
}

export interface SourceToPackDiff {
  /** Contenido de la fuente ausente en el pack. */
  missingSourceContent: DiffEntry[];
  /** Contenido presente en el pack que la fuente no declara. */
  addedContent: DiffEntry[];
  /** Mismo path, contenido distinto: cambio semántico. */
  semanticChanges: DiffEntry[];
  /** Transformaciones de identidad declaradas (no semánticas). */
  transformedContent: DiffEntry[];
  /** Marcas NOT_EXPLICIT_IN_KNOWLEDGE_MASTER que siguen sin resolver. */
  unresolvedMappings: DiffEntry[];
  /** Pérdida de procedencia entre fuente y pack. */
  provenanceLoss: DiffEntry[];
  clean: boolean;
}

/** Aplana un valor a pares path → primitivo, de forma estable. */
export function flattenPaths(valor: unknown, prefijo = ""): Map<string, unknown> {
  const salida = new Map<string, unknown>();
  if (valor === null || typeof valor !== "object") {
    salida.set(prefijo, valor === undefined ? null : valor);
    return salida;
  }
  if (Array.isArray(valor)) {
    if (valor.length === 0) salida.set(prefijo, "[]");
    valor.forEach((item, i) => {
      for (const [k, v] of flattenPaths(item, `${prefijo}[${i}]`)) salida.set(k, v);
    });
    return salida;
  }
  const entradas = Object.entries(valor as Record<string, unknown>);
  if (entradas.length === 0) salida.set(prefijo, "{}");
  for (const [clave, v] of entradas) {
    for (const [k, vv] of flattenPaths(v, prefijo ? `${prefijo}.${clave}` : clave))
      salida.set(k, vv);
  }
  return salida;
}

export function sourceToPackDiff(
  source: CapabilitySource,
  pack: Record<string, unknown>,
): SourceToPackDiff {
  const identidad = new Set<string>(PACK_IDENTITY_KEYS);
  const seccionesPack: Record<string, unknown> = {};
  for (const [clave, valor] of Object.entries(pack)) {
    if (!identidad.has(clave)) seccionesPack[clave] = valor;
  }

  const planoFuente = flattenPaths(source.sections);
  const planoPack = flattenPaths(seccionesPack);

  const missingSourceContent: DiffEntry[] = [];
  const addedContent: DiffEntry[] = [];
  const semanticChanges: DiffEntry[] = [];
  const unresolvedMappings: DiffEntry[] = [];

  for (const [path, valorFuente] of planoFuente) {
    if (!planoPack.has(path)) {
      missingSourceContent.push({
        path,
        source: valorFuente,
        note: "omitido en el Pack Candidate",
      });
      continue;
    }
    const valorPack = planoPack.get(path);
    if (JSON.stringify(valorFuente) !== JSON.stringify(valorPack)) {
      semanticChanges.push({
        path,
        source: valorFuente,
        pack: valorPack,
        note: "el contenido del pack difiere del wording gobernado",
      });
    }
    if (typeof valorFuente === "string" && valorFuente.includes(NOT_EXPLICIT)) {
      if (typeof valorPack === "string" && valorPack.includes(NOT_EXPLICIT)) {
        unresolvedMappings.push({
          path,
          source: valorFuente,
          note: "gap preservado, sigue sin resolver",
        });
      } else {
        semanticChanges.push({
          path,
          source: valorFuente,
          pack: valorPack,
          note: "una marca NOT_EXPLICIT_IN_KNOWLEDGE_MASTER fue resuelta sin autorización",
        });
      }
    }
  }

  for (const [path, valorPack] of planoPack) {
    if (!planoFuente.has(path)) {
      addedContent.push({ path, pack: valorPack, note: "contenido no declarado por la fuente" });
    }
  }

  const transformedContent: DiffEntry[] = [...identidad]
    .filter((clave) => clave in pack)
    .map((clave) => ({
      path: clave,
      pack: pack[clave],
      note: "identidad de pack asignada por el generador",
    }));

  const master = pack["knowledgeMaster"] as Record<string, unknown> | undefined;
  const provenanceLoss: DiffEntry[] = [];
  if (!master) {
    provenanceLoss.push({ path: "knowledgeMaster", note: "el pack no declara procedencia" });
  } else {
    if (master["sourceReference"] !== source.provenance.sourceReference) {
      provenanceLoss.push({
        path: "knowledgeMaster.sourceReference",
        source: source.provenance.sourceReference,
        pack: master["sourceReference"],
        note: "la referencia de fuente no coincide",
      });
    }
    if (master["version"] !== source.master.version) {
      provenanceLoss.push({
        path: "knowledgeMaster.version",
        source: source.master.version,
        pack: master["version"],
        note: "la MasterVersion no coincide",
      });
    }
    if (master["status"] !== source.master.baselineStatus) {
      provenanceLoss.push({
        path: "knowledgeMaster.status",
        source: source.master.baselineStatus,
        pack: master["status"],
        note: "el baseline status no coincide",
      });
    }
  }

  return {
    missingSourceContent,
    addedContent,
    semanticChanges,
    transformedContent,
    unresolvedMappings,
    provenanceLoss,
    clean:
      missingSourceContent.length === 0 &&
      addedContent.length === 0 &&
      semanticChanges.length === 0 &&
      provenanceLoss.length === 0,
  };
}
