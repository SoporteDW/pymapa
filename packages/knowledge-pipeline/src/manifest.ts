/**
 * Manifest industrial de capacidades.
 *
 * Registra, por capacidad, el estado real de la industrialización. Ninguna
 * capacidad se marca SOURCE_READY si su fuente autorizada no está disponible.
 */
import { computeChecksum } from "./checksum.ts";
import {
  AUTHORITATIVE_SOURCE_REQUIRED,
  EXPECTED_CAPABILITY_COUNT,
  type CapabilityPipelineState,
  type MasterIndex,
} from "./master.ts";
import type { CapabilityPipelineResult } from "./pipeline.ts";

export interface CapabilityManifestEntry {
  capabilityId: string;
  domainId: string;
  sourceAvailability: "SOURCE_MISSING" | "SOURCE_READY";
  sourceVersion: string | null;
  sourceReference: string | null;
  extractionStatus: "NOT_STARTED" | "APPROVED" | "IN_REVIEW" | "DRAFT";
  packId: string | null;
  packVersion: string | null;
  packStatus: CapabilityPipelineState;
  schemaValidation: "NOT_RUN" | "PASS" | "FAIL";
  semanticValidation: "NOT_RUN" | "PASS" | "FAIL";
  fixtureStatus: "NONE" | "PRESENT";
  runtimeTestStatus: "NOT_RUN" | "PASS" | "FAIL" | "REVIEW_REQUIRED";
  governanceReviewStatus: "NOT_REQUESTED" | "PENDING" | "APPROVED" | "REJECTED";
  publicationStatus: "UNPUBLISHED" | "PUBLISHED" | "SUPERSEDED";
  gapCount: number;
  publicationBlockingGapCount: number;
  checksum: string | null;
}

export interface CapabilityManifest {
  masterIdentity: string;
  masterVersion: string;
  baselineStatus: string;
  expectedCapabilityCount: number;
  registeredCapabilityCount: number;
  sourceReadyCount: number;
  publishedCount: number;
  missingSourceCount: number;
  /** Señal de cierre: la fuente autorizada completa no está en el repositorio. */
  authoritativeSourceRequired: boolean;
  signal: typeof AUTHORITATIVE_SOURCE_REQUIRED | "SOURCE_COMPLETE";
  entries: CapabilityManifestEntry[];
  checksum: string;
}

export function buildCapabilityManifest(input: {
  master: MasterIndex;
  results: CapabilityPipelineResult[];
}): CapabilityManifest {
  const porCapacidad = new Map(input.results.map((r) => [r.capabilityId, r]));

  const entries: CapabilityManifestEntry[] = input.master.capabilities.map((capacidad) => {
    const resultado = porCapacidad.get(capacidad.id);
    if (!resultado) {
      return {
        capabilityId: capacidad.id,
        domainId: capacidad.domainId,
        sourceAvailability: capacidad.sourceAvailability,
        sourceVersion: capacidad.sourceVersion,
        sourceReference: null,
        extractionStatus: "NOT_STARTED",
        packId: null,
        packVersion: null,
        packStatus: capacidad.sourceAvailability === "SOURCE_READY" ? "SOURCE_READY" : "SOURCE_MISSING",
        schemaValidation: "NOT_RUN",
        semanticValidation: "NOT_RUN",
        fixtureStatus: "NONE",
        runtimeTestStatus: "NOT_RUN",
        governanceReviewStatus: "NOT_REQUESTED",
        publicationStatus: "UNPUBLISHED",
        gapCount: 0,
        publicationBlockingGapCount: 0,
        checksum: null,
      };
    }
    return resultado.manifestEntry;
  });

  const sourceReadyCount = entries.filter((e) => e.sourceAvailability === "SOURCE_READY").length;
  const publishedCount = entries.filter((e) => e.publicationStatus === "PUBLISHED").length;
  const missingSourceCount = input.master.expectedCapabilityCount - sourceReadyCount;
  const authoritativeSourceRequired = missingSourceCount > 0;

  const manifest: Omit<CapabilityManifest, "checksum"> = {
    masterIdentity: input.master.identity,
    masterVersion: input.master.version,
    baselineStatus: input.master.baselineStatus,
    expectedCapabilityCount: input.master.expectedCapabilityCount,
    registeredCapabilityCount: entries.length,
    sourceReadyCount,
    publishedCount,
    missingSourceCount,
    authoritativeSourceRequired,
    signal: authoritativeSourceRequired ? AUTHORITATIVE_SOURCE_REQUIRED : "SOURCE_COMPLETE",
    entries,
  };

  return { ...manifest, checksum: computeChecksum(manifest) };
}

export { EXPECTED_CAPABILITY_COUNT };
