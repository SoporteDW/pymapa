/**
 * PILOT-READY-01 · PKG-01 · Registro estático de los 31 Knowledge Packs publicados.
 *
 * Imports estáticos en build time (Cloudflare Workers no tiene filesystem ni
 * resolución de módulos en runtime). Sin reglas de negocio por capacidad: el
 * registro solo indexa por capabilityId, verifica integridad y falla cerrado.
 * EC-01 no está materializada y queda excluida por construcción.
 *
 * SERVER-SIDE: solo lo importan runtime.server.ts y los tests.
 */
import { createHash } from "node:crypto";
import pack_op01 from "../../../knowledge/packs/op-01/1.0.0/pack.json" with { type: "json" };
import pub_op01 from "../../../knowledge/packs/op-01/1.0.0/published.json" with { type: "json" };
import pack_op02 from "../../../knowledge/packs/op-02/1.0.0/pack.json" with { type: "json" };
import pub_op02 from "../../../knowledge/packs/op-02/1.0.0/published.json" with { type: "json" };
import pack_op03 from "../../../knowledge/packs/op-03/1.0.0/pack.json" with { type: "json" };
import pub_op03 from "../../../knowledge/packs/op-03/1.0.0/published.json" with { type: "json" };
import pack_op04 from "../../../knowledge/packs/op-04/1.0.0/pack.json" with { type: "json" };
import pub_op04 from "../../../knowledge/packs/op-04/1.0.0/published.json" with { type: "json" };
import pack_op05 from "../../../knowledge/packs/op-05/1.0.0/pack.json" with { type: "json" };
import pub_op05 from "../../../knowledge/packs/op-05/1.0.0/published.json" with { type: "json" };
import pack_dg01 from "../../../knowledge/packs/dg-01/1.0.0/pack.json" with { type: "json" };
import pub_dg01 from "../../../knowledge/packs/dg-01/1.0.0/published.json" with { type: "json" };
import pack_dg02 from "../../../knowledge/packs/dg-02/1.0.0/pack.json" with { type: "json" };
import pub_dg02 from "../../../knowledge/packs/dg-02/1.0.0/published.json" with { type: "json" };
import pack_dg03 from "../../../knowledge/packs/dg-03/1.0.0/pack.json" with { type: "json" };
import pub_dg03 from "../../../knowledge/packs/dg-03/1.0.0/published.json" with { type: "json" };
import pack_dg04 from "../../../knowledge/packs/dg-04/1.0.0/pack.json" with { type: "json" };
import pub_dg04 from "../../../knowledge/packs/dg-04/1.0.0/published.json" with { type: "json" };
import pack_dg05 from "../../../knowledge/packs/dg-05/1.0.0/pack.json" with { type: "json" };
import pub_dg05 from "../../../knowledge/packs/dg-05/1.0.0/published.json" with { type: "json" };
import pack_pc01 from "../../../knowledge/packs/pc-01/1.0.0/pack.json" with { type: "json" };
import pub_pc01 from "../../../knowledge/packs/pc-01/1.0.0/published.json" with { type: "json" };
import pack_pc02 from "../../../knowledge/packs/pc-02/1.0.0/pack.json" with { type: "json" };
import pub_pc02 from "../../../knowledge/packs/pc-02/1.0.0/published.json" with { type: "json" };
import pack_pc03 from "../../../knowledge/packs/pc-03/1.0.0/pack.json" with { type: "json" };
import pub_pc03 from "../../../knowledge/packs/pc-03/1.0.0/published.json" with { type: "json" };
import pack_pc04 from "../../../knowledge/packs/pc-04/1.0.0/pack.json" with { type: "json" };
import pub_pc04 from "../../../knowledge/packs/pc-04/1.0.0/published.json" with { type: "json" };
import pack_pc05 from "../../../knowledge/packs/pc-05/1.0.0/pack.json" with { type: "json" };
import pub_pc05 from "../../../knowledge/packs/pc-05/1.0.0/published.json" with { type: "json" };
import pack_dt01 from "../../../knowledge/packs/dt-01/1.0.0/pack.json" with { type: "json" };
import pub_dt01 from "../../../knowledge/packs/dt-01/1.0.0/published.json" with { type: "json" };
import pack_dt02 from "../../../knowledge/packs/dt-02/1.0.0/pack.json" with { type: "json" };
import pub_dt02 from "../../../knowledge/packs/dt-02/1.0.0/published.json" with { type: "json" };
import pack_dt03 from "../../../knowledge/packs/dt-03/1.0.0/pack.json" with { type: "json" };
import pub_dt03 from "../../../knowledge/packs/dt-03/1.0.0/published.json" with { type: "json" };
import pack_dt04 from "../../../knowledge/packs/dt-04/1.0.0/pack.json" with { type: "json" };
import pub_dt04 from "../../../knowledge/packs/dt-04/1.0.0/published.json" with { type: "json" };
import pack_dt05 from "../../../knowledge/packs/dt-05/1.0.0/pack.json" with { type: "json" };
import pub_dt05 from "../../../knowledge/packs/dt-05/1.0.0/published.json" with { type: "json" };
import pack_dt06 from "../../../knowledge/packs/dt-06/1.0.0/pack.json" with { type: "json" };
import pub_dt06 from "../../../knowledge/packs/dt-06/1.0.0/published.json" with { type: "json" };
import pack_cm01 from "../../../knowledge/packs/cm-01/1.0.0/pack.json" with { type: "json" };
import pub_cm01 from "../../../knowledge/packs/cm-01/1.0.0/published.json" with { type: "json" };
import pack_cm02 from "../../../knowledge/packs/cm-02/1.0.0/pack.json" with { type: "json" };
import pub_cm02 from "../../../knowledge/packs/cm-02/1.0.0/published.json" with { type: "json" };
import pack_cm03 from "../../../knowledge/packs/cm-03/1.0.0/pack.json" with { type: "json" };
import pub_cm03 from "../../../knowledge/packs/cm-03/1.0.0/published.json" with { type: "json" };
import pack_cm04 from "../../../knowledge/packs/cm-04/1.0.0/pack.json" with { type: "json" };
import pub_cm04 from "../../../knowledge/packs/cm-04/1.0.0/published.json" with { type: "json" };
import pack_cm05 from "../../../knowledge/packs/cm-05/1.0.0/pack.json" with { type: "json" };
import pub_cm05 from "../../../knowledge/packs/cm-05/1.0.0/published.json" with { type: "json" };
import pack_cm06 from "../../../knowledge/packs/cm-06/1.0.0/pack.json" with { type: "json" };
import pub_cm06 from "../../../knowledge/packs/cm-06/1.0.0/published.json" with { type: "json" };
import pack_ec02 from "../../../knowledge/packs/ec-02/1.0.0/pack.json" with { type: "json" };
import pub_ec02 from "../../../knowledge/packs/ec-02/1.0.0/published.json" with { type: "json" };
import pack_ec03 from "../../../knowledge/packs/ec-03/1.0.0/pack.json" with { type: "json" };
import pub_ec03 from "../../../knowledge/packs/ec-03/1.0.0/published.json" with { type: "json" };
import pack_ec04 from "../../../knowledge/packs/ec-04/1.0.0/pack.json" with { type: "json" };
import pub_ec04 from "../../../knowledge/packs/ec-04/1.0.0/published.json" with { type: "json" };
import pack_ec05 from "../../../knowledge/packs/ec-05/1.0.0/pack.json" with { type: "json" };
import pub_ec05 from "../../../knowledge/packs/ec-05/1.0.0/published.json" with { type: "json" };

/** Taxonomía oficial publicada (31). El orden es el canónico por dominio. */
export const OFFICIAL_CAPABILITY_IDS = [
  "OP-01",
  "OP-02",
  "OP-03",
  "OP-04",
  "OP-05",
  "DG-01",
  "DG-02",
  "DG-03",
  "DG-04",
  "DG-05",
  "PC-01",
  "PC-02",
  "PC-03",
  "PC-04",
  "PC-05",
  "DT-01",
  "DT-02",
  "DT-03",
  "DT-04",
  "DT-05",
  "DT-06",
  "CM-01",
  "CM-02",
  "CM-03",
  "CM-04",
  "CM-05",
  "CM-06",
  "EC-02",
  "EC-03",
  "EC-04",
  "EC-05",
] as const;

export type OfficialCapabilityId = (typeof OFFICIAL_CAPABILITY_IDS)[number];

export const RUNTIME_MANIFEST_IDENTIFIER = "PYMAPA-RUNTIME-MANIFEST";
export const RUNTIME_MANIFEST_VERSION = "1.0.0";

interface PublishedRecord {
  packId: string;
  packVersion: string;
  status: string;
  checksum: string;
}

interface PackIdentity {
  packId: string;
  packVersion: string;
  capability: { id: string; domainId: string; name: string };
}

const ENTRADAS: ReadonlyArray<{ capabilityId: string; pack: unknown; published: unknown }> = [
  { capabilityId: "OP-01", pack: pack_op01, published: pub_op01 },
  { capabilityId: "OP-02", pack: pack_op02, published: pub_op02 },
  { capabilityId: "OP-03", pack: pack_op03, published: pub_op03 },
  { capabilityId: "OP-04", pack: pack_op04, published: pub_op04 },
  { capabilityId: "OP-05", pack: pack_op05, published: pub_op05 },
  { capabilityId: "DG-01", pack: pack_dg01, published: pub_dg01 },
  { capabilityId: "DG-02", pack: pack_dg02, published: pub_dg02 },
  { capabilityId: "DG-03", pack: pack_dg03, published: pub_dg03 },
  { capabilityId: "DG-04", pack: pack_dg04, published: pub_dg04 },
  { capabilityId: "DG-05", pack: pack_dg05, published: pub_dg05 },
  { capabilityId: "PC-01", pack: pack_pc01, published: pub_pc01 },
  { capabilityId: "PC-02", pack: pack_pc02, published: pub_pc02 },
  { capabilityId: "PC-03", pack: pack_pc03, published: pub_pc03 },
  { capabilityId: "PC-04", pack: pack_pc04, published: pub_pc04 },
  { capabilityId: "PC-05", pack: pack_pc05, published: pub_pc05 },
  { capabilityId: "DT-01", pack: pack_dt01, published: pub_dt01 },
  { capabilityId: "DT-02", pack: pack_dt02, published: pub_dt02 },
  { capabilityId: "DT-03", pack: pack_dt03, published: pub_dt03 },
  { capabilityId: "DT-04", pack: pack_dt04, published: pub_dt04 },
  { capabilityId: "DT-05", pack: pack_dt05, published: pub_dt05 },
  { capabilityId: "DT-06", pack: pack_dt06, published: pub_dt06 },
  { capabilityId: "CM-01", pack: pack_cm01, published: pub_cm01 },
  { capabilityId: "CM-02", pack: pack_cm02, published: pub_cm02 },
  { capabilityId: "CM-03", pack: pack_cm03, published: pub_cm03 },
  { capabilityId: "CM-04", pack: pack_cm04, published: pub_cm04 },
  { capabilityId: "CM-05", pack: pack_cm05, published: pub_cm05 },
  { capabilityId: "CM-06", pack: pack_cm06, published: pub_cm06 },
  { capabilityId: "EC-02", pack: pack_ec02, published: pub_ec02 },
  { capabilityId: "EC-03", pack: pack_ec03, published: pub_ec03 },
  { capabilityId: "EC-04", pack: pack_ec04, published: pub_ec04 },
  { capabilityId: "EC-05", pack: pack_ec05, published: pub_ec05 },
];

/** Serialización canónica (claves ordenadas), idéntica a la del pipeline. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entradas = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entradas.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
}

export function checksumOf(value: unknown): string {
  return `sha256:${createHash("sha256").update(canonicalJson(value), "utf8").digest("hex")}`;
}

export interface RegisteredPack {
  capabilityId: string;
  domainId: string;
  name: string;
  packId: string;
  packVersion: string;
  /** Checksum canónico del pack, verificado contra published.json. */
  packChecksum: string;
  publicationStatus: "PUBLISHED";
  pack: unknown;
}

/** Verifica una entrada; cualquier incoherencia es un error de integridad. */
export function verifyEntry(entry: { capabilityId: string; pack: unknown; published: unknown }): RegisteredPack {
  const pack = entry.pack as PackIdentity;
  const pub = entry.published as PublishedRecord;
  const fallo = (motivo: string) => new Error(`KNOWLEDGE_PACK_INTEGRITY_ERROR: ${entry.capabilityId} · ${motivo}`);
  if (!pack?.capability?.id || pack.capability.id !== entry.capabilityId) throw fallo("capabilityId");
  if (pub?.status !== "PUBLISHED") throw fallo("no publicado");
  if (pub.packId !== pack.packId || pub.packVersion !== pack.packVersion) throw fallo("identidad de publicación");
  const checksum = checksumOf(pack);
  if (checksum !== pub.checksum) throw fallo("checksum");
  return {
    capabilityId: entry.capabilityId,
    domainId: pack.capability.domainId,
    name: pack.capability.name,
    packId: pack.packId,
    packVersion: pack.packVersion,
    packChecksum: checksum,
    publicationStatus: "PUBLISHED",
    pack: entry.pack,
  };
}

let cache: ReadonlyMap<string, RegisteredPack> | null = null;

function registro(): ReadonlyMap<string, RegisteredPack> {
  if (cache) return cache;
  const mapa = new Map<string, RegisteredPack>();
  for (const e of ENTRADAS) {
    if (mapa.has(e.capabilityId)) throw new Error(`KNOWLEDGE_PACK_DUPLICATED: ${e.capabilityId}`);
    mapa.set(e.capabilityId, verifyEntry(e));
  }
  if (mapa.size !== OFFICIAL_CAPABILITY_IDS.length) throw new Error("KNOWLEDGE_PACK_REGISTRY_INCOMPLETE");
  cache = mapa;
  return mapa;
}

export function isPublishedCapability(capabilityId: unknown): capabilityId is OfficialCapabilityId {
  return typeof capabilityId === "string" && (OFFICIAL_CAPABILITY_IDS as readonly string[]).includes(capabilityId);
}

/** Lookup genérico. Falla cerrado ante IDs desconocidos, no publicados o inválidos. */
export function getRegisteredPack(capabilityId: string): RegisteredPack {
  if (!isPublishedCapability(capabilityId)) throw new Error(`KNOWLEDGE_PACK_NOT_REGISTERED: ${capabilityId}`);
  const entrada = registro().get(capabilityId);
  if (!entrada) throw new Error(`KNOWLEDGE_PACK_NOT_REGISTERED: ${capabilityId}`);
  return entrada;
}

export function getPack(capabilityId: string): unknown {
  return getRegisteredPack(capabilityId).pack;
}

export interface CapabilityCatalogEntry {
  capabilityId: string;
  name: string;
  domainId: string;
  packId: string;
  packVersion: string;
  packChecksum: string;
  publicationStatus: "PUBLISHED";
}

/** Catálogo con identidad gobernada por la fuente (sin copy inventada). */
export function listPublishedCapabilities(): CapabilityCatalogEntry[] {
  return OFFICIAL_CAPABILITY_IDS.map((id) => {
    const { pack: _pack, ...identidad } = getRegisteredPack(id);
    return identidad;
  });
}

/** Líneas del manifiesto compuesto: una por pack, en orden canónico. */
export function runtimeManifestEntries(
  packs: ReadonlyArray<Pick<RegisteredPack, "capabilityId" | "packId" | "packVersion" | "packChecksum">> = OFFICIAL_CAPABILITY_IDS.map(getRegisteredPack),
) {
  return [...packs]
    .map((p) => ({ capabilityId: p.capabilityId, packId: p.packId, packVersion: p.packVersion, packChecksum: p.packChecksum }))
    .sort((a, b) => (a.capabilityId < b.capabilityId ? -1 : a.capabilityId > b.capabilityId ? 1 : 0));
}

/** Checksum compuesto determinista del release ejecutable (independiente del orden). */
export function computeRuntimeManifestChecksum(
  packs?: ReadonlyArray<Pick<RegisteredPack, "capabilityId" | "packId" | "packVersion" | "packChecksum">>,
): string {
  return checksumOf({
    identifier: RUNTIME_MANIFEST_IDENTIFIER,
    version: RUNTIME_MANIFEST_VERSION,
    packs: runtimeManifestEntries(packs),
  });
}
