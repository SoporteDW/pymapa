/**
 * INT-01 · E1 · Pruebas del DocumentAdmissionBridge.
 *
 * Fixtures 100% sintéticos (organizaciones org-qa-a / org-qa-b, sin datos
 * reales). Packs reales publicados: DG-01 (NI 1:1) y CM-05 (progresiva
 * multimapeada). Sin llamadas a IA. Verifica:
 * - Admisión factual gobernada crea observación física validada por el Engine.
 * - CANDIDATE/REJECTED/temáticos/sin correspondencia factual: nunca crean
 *   observaciones.
 * - CM-05: variable genérica sin correspondencia factual nunca se asigna.
 * - Idempotencia: reintento no duplica; observaciones manuales intactas.
 * - Aislamiento: mappings de otra organización nunca se procesan.
 * - Invalidación append-only: SUPERSEDED retira la observación del Engine
 *   mediante registro de CONTROL, sin borrar historial.
 * - Master / packs / Engine intactos (checksum del pack DG-01 verificado).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createKnowledgeEngine } from "@pymapa/knowledge-engine";
import {
  createInMemoryProductionRepository,
  type DocumentMappingRecord,
  type ObservationRecord,
} from "./puertos";
import { admitirCorrespondenciasDocumentales } from "./document-admission-bridge";
import { evaluarAssessment, observacionesVigentes } from "./caso-uso";

const packDg01Raw = readFileSync(join(process.cwd(), "knowledge", "packs", "dg-01", "1.0.0", "pack.json"), "utf8");
const packCm05Raw = readFileSync(join(process.cwd(), "knowledge", "packs", "cm-05", "1.0.0", "pack.json"), "utf8");
const packDg01 = JSON.parse(packDg01Raw) as Parameters<typeof createKnowledgeEngine>[0];
const packCm05 = JSON.parse(packCm05Raw) as Parameters<typeof createKnowledgeEngine>[0];

const KV = "kv-runtime-manifest-1.0.0";
const ORG_A = "org-qa-a";
const ORG_B = "org-qa-b";
const ASSESS = "assess-qa-1";

function mapping(parcial: Partial<DocumentMappingRecord>): DocumentMappingRecord {
  return {
    id: "map-1",
    organizationId: ORG_A,
    assessmentId: ASSESS,
    fragmentId: "frag-1",
    interpretationId: "interp-1",
    capabilityId: "DG-01",
    targetType: "VARIABLE",
    targetRef: "VA01",
    knowledgeVersionId: KV,
    knowledgePackId: "PYMAPA-DG-01",
    knowledgePackVersion: "1.0.0",
    proposedBy: "AI",
    status: "VALIDATED",
    admissionBasis: "HUMAN_VALIDATION",
    admissionRuleRef: null,
    factualCorrespondenceRef: "ACQ·NI01",
    validatedBy: "user-admin-qa",
    validatedAt: "2026-01-02T00:00:00.000Z",
    supersedesMappingId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    extractionId: "ext-1",
    evidenceId: "ev-1",
    fragmentText: "cita literal sintética",
    interpretationStatement: "Hecho interpretado sintético sobre DG-01",
    ...parcial,
  };
}

function setup(pack = packDg01) {
  const engine = createKnowledgeEngine(pack);
  const repo = createInMemoryProductionRepository();
  const deps = { engine, repository: repo.repository, knowledgeVersionId: KV };
  return { engine, repo, deps };
}

describe("INT-01-E1 · DocumentAdmissionBridge", () => {
  it("admite una correspondencia VALIDATED con correspondencia factual gobernada (DG-01)", async () => {
    const { engine, repo, deps } = setup();
    repo.estado.documentMappings.push(mapping({}));
    const report = await admitirCorrespondenciasDocumentales(deps, { assessmentId: ASSESS, organizationId: ORG_A });
    expect(report.admitted).toBe(1);
    expect(report.rejected).toEqual([]);
    const obs = repo.estado.observations;
    expect(obs).toHaveLength(1);
    expect(obs[0].variableRef).toBe("VA01");
    expect(obs[0].sourceResponseId).toBeNull();
    expect(obs[0].value.knowledgeState).toBe("KNOWN");
    expect(obs[0].value.semanticValue).toBe("Hecho interpretado sintético sobre DG-01");
    expect(obs[0].value.documentProvenance?.mappingId).toBe("map-1");
    expect(obs[0].value.documentProvenance?.evidenceId).toBe("ev-1");
    // Trazabilidad: vínculo observación ↔ evidencia y evento de auditoría.
    expect(repo.estado.observationEvidenceLinks).toHaveLength(1);
    expect(repo.estado.observationEvidenceLinks[0].evidenceId).toBe("ev-1");
    expect(repo.estado.auditEvents.some((e) => e.eventType === "DOCUMENT_OBSERVATION_ADMITTED")).toBe(true);
    // La observación alimenta el Engine como variable evaluable.
    const resultado = evaluarAssessment(engine, observacionesVigentes(obs));
    expect(resultado.variableEvaluations.find((v) => v.variableRef === "VA01")?.state).toBe("KNOWN");
  });

  it("rechaza CANDIDATE y REJECTED sin crear observaciones", async () => {
    const { repo, deps } = setup();
    repo.estado.documentMappings.push(
      mapping({ id: "m-cand", status: "CANDIDATE", validatedBy: null }),
      mapping({ id: "m-rej", status: "REJECTED" }),
    );
    const report = await admitirCorrespondenciasDocumentales(deps, { assessmentId: ASSESS, organizationId: ORG_A });
    expect(report.admitted).toBe(0);
    expect(report.rejected).toHaveLength(2);
    expect(report.rejected.every((r) => r.reason === "STATUS_NOT_VALIDATED")).toBe(true);
    expect(repo.estado.observations).toHaveLength(0);
  });

  it("rechaza mappings temáticos (INFORMATION_NEED / ACQUISITION) aunque estén VALIDATED", async () => {
    const { repo, deps } = setup();
    repo.estado.documentMappings.push(
      mapping({ id: "m-ni", targetType: "INFORMATION_NEED", targetRef: "NI01", factualCorrespondenceRef: null }),
      mapping({ id: "m-acq", targetType: "ACQUISITION", targetRef: "ACQ·NI01", factualCorrespondenceRef: null }),
      mapping({ id: "m-var-sin-factual", factualCorrespondenceRef: null }),
    );
    const report = await admitirCorrespondenciasDocumentales(deps, { assessmentId: ASSESS, organizationId: ORG_A });
    expect(report.admitted).toBe(0);
    expect(report.rejected.map((r) => r.reason).sort()).toEqual([
      "FACTUAL_CORRESPONDENCE_REQUIRED",
      "THEMATIC_MAPPING_NOT_FACTUAL",
      "THEMATIC_MAPPING_NOT_FACTUAL",
    ]);
    expect(repo.estado.observations).toHaveLength(0);
  });

  it("CM-05: variable genérica de adquisición progresiva nunca se asigna", async () => {
    const { repo, deps } = setup(packCm05);
    // VA01 es la variable genérica a la que apuntan todas las progresivas.
    repo.estado.documentMappings.push(
      mapping({
        id: "m-cm05",
        capabilityId: "CM-05",
        targetRef: "VA01",
        factualCorrespondenceRef: "ACQ·P1·01",
        knowledgePackId: "PYMAPA-CM-05",
      }),
    );
    const report = await admitirCorrespondenciasDocumentales(deps, { assessmentId: ASSESS, organizationId: ORG_A });
    expect(report.admitted).toBe(0);
    expect(report.rejected[0].reason).toBe("PROGRESSIVE_VARIABLE_WITHOUT_GOVERNED_FACTUAL_MAPPING");
    expect(repo.estado.observations).toHaveLength(0);
  });

  it("rechaza incompatibilidades de organización, versión de conocimiento y pack", async () => {
    const { repo, deps } = setup();
    repo.estado.documentMappings.push(
      mapping({ id: "m-org", organizationId: ORG_B }),
      mapping({ id: "m-kv", knowledgeVersionId: "kv-otra" }),
      mapping({ id: "m-pack", knowledgePackVersion: "9.9.9" }),
      mapping({ id: "m-cap", capabilityId: "DG-02" }),
    );
    const report = await admitirCorrespondenciasDocumentales(deps, { assessmentId: ASSESS, organizationId: ORG_A });
    expect(report.admitted).toBe(0);
    expect(report.rejected.map((r) => r.reason)).toEqual([
      "ORGANIZATION_MISMATCH",
      "KNOWLEDGE_VERSION_MISMATCH",
      "PACK_VERSION_MISMATCH",
      "CAPABILITY_MISMATCH",
    ]);
    expect(repo.estado.observations).toHaveLength(0);
  });

  it("idempotencia: reintento no duplica la observación ni el vínculo", async () => {
    const { repo, deps } = setup();
    repo.estado.documentMappings.push(mapping({}));
    await admitirCorrespondenciasDocumentales(deps, { assessmentId: ASSESS, organizationId: ORG_A });
    const segundo = await admitirCorrespondenciasDocumentales(deps, { assessmentId: ASSESS, organizationId: ORG_A });
    expect(segundo.admitted).toBe(0);
    expect(segundo.items[0].outcome).toBe("ALREADY_ADMITTED");
    expect(repo.estado.observations).toHaveLength(1);
    expect(repo.estado.observationEvidenceLinks).toHaveLength(1);
  });

  it("no toca observaciones manuales preexistentes", async () => {
    const { repo, deps } = setup();
    const manual: Omit<ObservationRecord, "id" | "createdAt"> = {
      organizationId: ORG_A,
      assessmentId: ASSESS,
      sourceResponseId: "resp-manual-1",
      respondentId: null,
      variableRef: "VA02",
      value: { knowledgeState: "KNOWN", semanticValue: "respuesta manual", acquisitionRef: "ACQ·NI02" },
    };
    await repo.repository.insertObservation(manual);
    repo.estado.documentMappings.push(mapping({}));
    await admitirCorrespondenciasDocumentales(deps, { assessmentId: ASSESS, organizationId: ORG_A });
    const obs = repo.estado.observations;
    expect(obs).toHaveLength(2);
    const manualGuardada = obs.find((o) => o.sourceResponseId === "resp-manual-1")!;
    expect(manualGuardada.value.documentProvenance).toBeUndefined();
    expect(manualGuardada.value.semanticValue).toBe("respuesta manual");
  });

  it("invalidación append-only: SUPERSEDED retira la observación del Engine sin borrar historial", async () => {
    const { engine, repo, deps } = setup();
    const m = mapping({});
    repo.estado.documentMappings.push(m);
    await admitirCorrespondenciasDocumentales(deps, { assessmentId: ASSESS, organizationId: ORG_A });
    const admitida = repo.estado.observations[0];

    // El mapping queda SUPERSEDED (transición gobernada del Bloque 1).
    repo.estado.documentMappings[0] = { ...m, status: "SUPERSEDED", supersedesMappingId: "map-2" };
    const report = await admitirCorrespondenciasDocumentales(deps, { assessmentId: ASSESS, organizationId: ORG_A });
    expect(report.invalidated).toBe(1);

    // Historial intacto: la admitida sigue existiendo; hay un registro de CONTROL.
    expect(repo.estado.observations).toHaveLength(2);
    const control = repo.estado.observations.find((o) => o.value.documentControl)!;
    expect(control.value.documentControl).toEqual({ kind: "INVALIDATION", mappingId: "map-1" });
    expect(control.value.correctsObservationId).toBe(admitida.id);
    expect(repo.estado.auditEvents.some((e) => e.eventType === "DOCUMENT_OBSERVATION_INVALIDATED")).toBe(true);

    // El registro de control jamás llega al Engine; VA01 vuelve a NOT_OBSERVED.
    const vigentes = observacionesVigentes(repo.estado.observations);
    expect(vigentes).toHaveLength(0);
    const resultado = evaluarAssessment(engine, vigentes);
    expect(resultado.variableEvaluations.find((v) => v.variableRef === "VA01")?.state).toBe("NOT_OBSERVED");

    // Idempotencia de la invalidación.
    const tercero = await admitirCorrespondenciasDocumentales(deps, { assessmentId: ASSESS, organizationId: ORG_A });
    expect(tercero.invalidated).toBe(0);
    expect(repo.estado.observations).toHaveLength(2);
  });

  it("baseline intacto: checksum del pack DG-01 publicado sin cambios", () => {
    const checksum = createHash("sha256").update(packDg01Raw).digest("hex");
    const published = JSON.parse(
      readFileSync(join(process.cwd(), "knowledge", "packs", "published.json"), "utf8"),
    ) as Record<string, { checksum: string }>;
    expect(published["PYMAPA-DG-01"].checksum).toBe(checksum);
  });
});
