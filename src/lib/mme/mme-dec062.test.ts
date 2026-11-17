/**
 * Port trazable de pruebas/test_dec062.py (25) y test_integration_contract.py (8) — DEC-062 06B.
 * Cada caso reproduce las mismas entradas y compara la salida completa con la referencia Python
 * congelada en datos/referencia-python/python-reference-results.json.
 * Datos 100 % sintéticos de laboratorio. No es madurez empresarial verificada.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import referencia from "./datos/referencia-python/python-reference-results.json";
import { MME_CATALOGO as CAT, MME_OP05_EJECUCION as OP05, conteosCatalogo } from "./catalogo.server";
import { assess, signAttestation } from "./evaluador.server";
import { MME_ENGINE_VERSION, type ActivationRegistry, type EvidenceStore, type Attestation, type ConflictResolution, type MmeLevel, type MmeCheckType, type AttestationVerdict, type PolicyRegistry } from "./tipos";

const S = "SYNTHETIC-LAB-ONLY-SECRET";
const SIG = { reviewer: { role: "METHODOLOGIST", secret: S } };
const blob = new TextEncoder().encode("ONLY SYNTHETIC EVIDENCE");
const EVID: EvidenceStore = {
  e1: { content: blob, sha256: createHash("sha256").update(blob).digest("hex"), source: "SYNTHETIC", observed_at: "2026-11-16" },
};
const CID = "CM-03";
const REF: Record<string, unknown> = referencia.cases;
function capability(cid: string) {
  const c = CAT.capabilities[cid];
  if (!c) throw new Error("Missing synthetic capability: " + cid);
  return c;
}
function conflict(a: Attestation) {
  if (!a.conflict_resolution) throw new Error("Missing synthetic conflict resolution");
  return a.conflict_resolution;
}

function registry(cid: string): ActivationRegistry {
  const r: ActivationRegistry = {};
  for (const l of Object.values(capability(cid).levels))
    for (const id of [l.original_predicate_id, ...l.checks.map((x) => x.id)])
      r[id] = { version: CAT.version, state: "ENABLED", authorization: "LAB_SYNTHETIC_ONLY" };
  return r;
}
function attest(o: { cid?: string; lvl?: MmeLevel; kind?: MmeCheckType; verdict?: AttestationVerdict; resolution?: ConflictResolution } = {}) {
  const { cid = "CM-03", lvl = "M1", kind = "HECHO", verdict = "PASS", resolution } = o;
  const d = capability(cid).levels[lvl].checks.find((x) => x.type === kind);
  if (!d) throw new Error("Missing synthetic check");
  const payload =
    kind === "HECHO"
      ? { fact_kind: d.fact_kind, facts: Object.fromEntries(d.required_domain_fields.map((f: string) => [f, "SYNTHETIC_VALUE_" + f])), semantic_reviewed: true }
      : kind === "OPERACION"
        ? { applied_case_ref: "synth", observed_result: "synth" }
        : kind === "CONTEXTO"
          ? { actor: "lab", period: "2026-Q3", scope: "lab" }
          : { source_corroborates_claim: true };
  const a: Attestation = { check_id: d.id, assessment_id: "A1", verdict, reviewer_id: "reviewer", issued_at: "2026-11-16", version: MME_ENGINE_VERSION, evidence_refs: ["e1"], payload };
  if (resolution !== undefined) a.conflict_resolution = resolution;
  return signAttestation(a, S);
}
const res = (materiality: ConflictResolution["materiality"], verdict: ConflictResolution["resolved_verdict"] = "PASS") => ({
  materiality, resolved_verdict: verdict, rationale: "Synthetic human review", evidence_refs: ["e1"], authority_id: "reviewer", decision_version: "DEC062-LAB-1",
});
function na(o: { company?: string; assessment?: string; target?: "CAPABILITY" | "CONDITION"; cid?: string } = {}) {
  const { company = "C1", assessment = "A1", target = "CAPABILITY", cid = CID } = o;
  const d: import("./tipos").ApplicabilityDecision = { company_id: company, assessment_id: assessment, capability_id: cid, catalog_version: CAT.version, target_type: target, context: "Synthetic relevant context", justification: "Explicit synthetic nonapplicability", evidence_refs: ["e1"], authority_id: "reviewer", decision_version: "NA-LAB-1", issued_at: "2026-11-16" };
  if (target === "CONDITION") d.rubric_id = capability(cid).levels.M1.rubric_id;
  return signAttestation(d, S);
}
function run(o: { cid?: string; ats?: Attestation[]; evidenceStore?: EvidenceStore; policyRegistry?: PolicyRegistry; activationRegistry?: ActivationRegistry; scope?: string; naDecisions?: import("./tipos").ApplicabilityDecision[] } = {}) {
  const cid = o.cid ?? CID;
  return assess(cid, {
    catalog: CAT, attestations: o.ats ?? [], assessmentId: "A1", companyId: "C1",
    evidenceStore: o.evidenceStore ?? EVID, signers: SIG,
    policyRegistry: o.policyRegistry ?? { [cid]: CAT.version },
    activationRegistry: o.activationRegistry ?? registry(cid),
    ...(o.scope !== undefined ? { scope: o.scope } : {}),
    ...(o.naDecisions !== undefined ? { naDecisions: o.naDecisions } : {}),
  });
}
const resign = (a: Attestation) => { const { signature: _s, ...u } = a; return signAttestation(u, S); };
const revoked = (): EvidenceStore => {
  const e = EVID["e1"];
  if (!e) throw new Error("Missing synthetic evidence");
  return { e1: { ...e, revoked_at: "2026-11-17" } };
};
/** Equivalencia: salida TS idéntica a la referencia Python. */
const eq = (key: string, r: unknown) => expect(JSON.parse(JSON.stringify(r))).toEqual(REF[key]);

describe("Equivalencia de firma canónica TS ↔ Python", () => {
  it("HMAC de atestación y N/A coincide byte a byte", () => {
    expect(attest().signature).toBe(referencia.signatures.attest_default);
    expect(na().signature).toBe(referencia.signatures.na_default);
  });
});

describe("DEC-062 · 25 pruebas del evaluador (test_dec062.py)", () => {
  it("test_01 catálogo 31/155/620", () => {
    const c = conteosCatalogo();
    expect([c.capacidades, c.rubricas, c.verificaciones]).toEqual([31, 155, 620]);
  });
  it("test_02 OP-05 64 adquisiciones", () => expect(OP05.length).toBe(64));
  it("test_03 PASS positivo sin madurez automática", () => {
    const r = run({ ats: [attest()] }); expect(r.status).toBe("BOUNDED_UNCERTAIN"); expect(r.level).toBeNull(); eq("test_03", r);
  });
  it("test_04 FAIL negativo", () => {
    const r = run({ ats: [attest({ verdict: "FAIL" })] }); expect(r.levels?.[0]?.checks.HECHO?.status).toBe("FAIL"); eq("test_04", r);
  });
  it("test_05 UNKNOWN", () => { const r = run(); expect(r.status).toBe("NOT_DETERMINED"); eq("test_05", r); });
  it("test_06 conflicto material", () => {
    const r = run({ ats: [attest({ verdict: "CONFLICT", resolution: res("MATERIAL") })] }); expect(r.status).toBe("REVIEW_REQUIRED"); eq("test_06", r);
  });
  it("test_07 conflicto no material con PASS explícito", () => {
    const r = run({ ats: [attest({ verdict: "CONFLICT", resolution: res("NON_MATERIAL") })] });
    expect(r.levels?.[0]?.checks.HECHO?.status).toBe("PASS"); expect(r.status).not.toBe("REVIEW_REQUIRED"); eq("test_07", r);
  });
  it("test_08 no material no es PASS automático", () => {
    const r = run({ ats: [attest({ verdict: "CONFLICT", resolution: res("NON_MATERIAL", "UNKNOWN") })] });
    expect(r.levels?.[0]?.checks.HECHO?.status).toBe("UNKNOWN"); eq("test_08", r);
  });
  it("test_09 conflicto sin autoridad (IA)", () => {
    const a: Attestation = attest({ verdict: "CONFLICT", resolution: res("NON_MATERIAL") }); conflict(a).authority_id = "AI_BOT";
    const r = run({ ats: [resign(a)] }); expect(r.status).toBe("REVIEW_REQUIRED"); eq("test_09", r);
  });
  it("test_10 conflicto sin materialidad", () => { const r = run({ ats: [attest({ verdict: "CONFLICT" })] }); expect(r.status).toBe("REVIEW_REQUIRED"); eq("test_10", r); });
  it("test_11 N/A contextual", () => { const r = run({ naDecisions: [na()] }); expect(r.status).toBe("NOT_APPLICABLE_CONTEXTUAL"); eq("test_11", r); });
  it("test_12 N/A de otra empresa", () => { const r = run({ naDecisions: [na({ company: "C2" })] }); expect(r.status).toBe("REVIEW_REQUIRED"); eq("test_12", r); });
  it("test_13 N/A de otro assessment", () => { const r = run({ naDecisions: [na({ assessment: "A2" })] }); expect(r.status).toBe("REVIEW_REQUIRED"); eq("test_13", r); });
  it("test_14 N/A de condición exige política", () => { const r = run({ naDecisions: [na({ target: "CONDITION" })] }); expect(r.status).toBe("REVIEW_REQUIRED_NA_AGGREGATION_POLICY"); eq("test_14", r); });
  it("test_15 N/A con firma alterada", () => { const d: import("./tipos").ApplicabilityDecision = na(); d.signature = "tampered"; const r = run({ naDecisions: [d] }); expect(r.status).toBe("REVIEW_REQUIRED"); eq("test_15", r); });
  it("test_16 N/A con evidencia revocada", () => { const r = run({ naDecisions: [na()], evidenceStore: revoked() }); expect(r.status).toBe("REVIEW_REQUIRED"); eq("test_16", r); });
  it("test_17 evidencia revocada", () => { const r = run({ ats: [attest()], evidenceStore: revoked() }); expect(r.status).toBe("REVIEW_REQUIRED"); eq("test_17", r); });
  it("test_18 sin activación", () => { const r = run({ activationRegistry: {} }); expect(r.status).toBe("BLOCKED_NO_ITEM_AUTHORIZATION"); eq("test_18", r); });
  it("test_19 llave global capability:NA ignorada", () => { const r = run({ policyRegistry: { [CID + ":NA"]: CAT.version } }); expect(r.status).toBe("BLOCKED_NO_AUTHORIZATION"); eq("test_19", r); });
  it("test_20 OP-05 excluida del diagnóstico inicial", () => { const r = run({ cid: "OP-05" }); expect(r.status).toBe("EXCLUDED_OP05"); eq("test_20", r); });
  it("test_21 OP-05 ejecución mismo motor", () => { const r = run({ cid: "OP-05", scope: "EXECUTION_OP05" }); expect(r.status).toBe("NOT_DETERMINED"); eq("test_21", r); });
  it("test_22 OP-05 ejecución sin aprobación", () => { const r = run({ cid: "OP-05", scope: "EXECUTION_OP05", activationRegistry: {} }); expect(r.status).toBe("BLOCKED_NO_ITEM_AUTHORIZATION"); eq("test_22", r); });
  it("test_23 revisor IA no autorizado", () => { const a: Attestation = attest(); a.reviewer_id = "AI_BOT"; const r = run({ ats: [resign(a)] }); expect(r.status).toBe("REVIEW_REQUIRED"); eq("test_23", r); });
  it("test_24 binding candidato no se habilita solo", () => {
    const a: Attestation = attest(); a.binding_id = "B-CANDIDATE"; a.binding_version = "1";
    const r = run({ ats: [resign(a)] }); expect(r.status).toBe("BLOCKED_BINDING_NOT_AUTHORIZED"); eq("test_24", r);
  });
  it("test_25 N/A sin empresa", () => { const r = run({ naDecisions: [na({ company: "" })] }); expect(r.status).toBe("REVIEW_REQUIRED"); eq("test_25", r); });
});

describe("DEC-062 · 8 pruebas de contrato sintético (test_integration_contract.py)", () => {
  it("test_26 catálogo inicial excluye OP-05", () => {
    expect(Object.keys(CAT.capabilities).length).toBe(31);
    expect(Object.values(CAT.capabilities).filter((c) => c.stage === "INITIAL_DIAGNOSIS").length).toBe(30);
  });
  it("test_27 OP-05 5 rúbricas / 20 checks", () => {
    const l = capability("OP-05").levels;
    expect(Object.keys(l).length).toBe(5);
    expect(Object.values(l).reduce((n, x) => n + x.checks.length, 0)).toBe(20);
  });
  it("test_28 ningún candidato OP-05 habilitado", () => {
    expect(OP05.every((x) => x.scope === "EXECUTION_OP05" && !x.included_initial_diagnosis)).toBe(true);
    const r = run({ cid: "OP-05", scope: "EXECUTION_OP05", activationRegistry: {} }); expect(r.status).toBe("BLOCKED_NO_ITEM_AUTHORIZATION"); eq("test_28", r);
  });
  it("test_29 indicador exige autorización individual", () => { const r = run({ ats: [attest({ lvl: "M4" })] }); expect(r.status).toBe("BLOCKED_INDICATOR_NOT_AUTHORIZED"); eq("test_29", r); });
  it("test_30 N/A no anula atestaciones", () => { const r = run({ ats: [attest()], naDecisions: [na()] }); expect(r.status).toBe("REVIEW_REQUIRED"); eq("test_30", r); });
  it("test_31 alcance incorrecto", () => {
    const a = run({ cid: "OP-05", scope: "INITIAL_DIAGNOSIS" }); expect(a.status).toBe("EXCLUDED_OP05"); eq("test_31a", a);
    const b = run({ cid: "CM-03", scope: "EXECUTION_OP05" }); expect(b.status).toBe("REVIEW_REQUIRED"); eq("test_31b", b);
  });
  it("test_32 sin autorización de política", () => { const r = run({ policyRegistry: {} }); expect(r.status).toBe("BLOCKED_NO_AUTHORIZATION"); eq("test_32", r); });
  it("test_33 indicador CANDIDATE bloquea aun con registro de prueba", () => {
    const reg = registry(CID); reg["IND-CM-03"] = { version: "1.0.0", state: "CANDIDATE" };
    const r = run({ ats: [attest({ lvl: "M5" })], activationRegistry: reg }); expect(r.status).toBe("BLOCKED_INDICATOR_NOT_AUTHORIZED"); eq("test_33", r);
  });
});
