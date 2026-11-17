import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import ref from "./datos/referencia-python/g21-reference-results.json";
import { MME_CATALOGO as catalog } from "./catalogo.server";
import { assess, canonical, MME_SIGNATURE_NUMERIC_VERSION, signAttestation, validateAttestation } from "./evaluador.server";
import type { ActivationRegistry, EvidenceStore } from "./tipos";

const secret = "SYNTHETIC-G21-ONLY";
const signers = { reviewer: { role: "METHODOLOGIST", secret } };
const content = new TextEncoder().encode("SYNTHETIC G21 EVIDENCE");
const evidenceStore: EvidenceStore = { e1: {
  content, sha256: createHash("sha256").update(content).digest("hex"),
  source: "SYNTHETIC", observed_at: "2026-11-17",
} };
const activationRegistry: ActivationRegistry = {};
const capability = catalog.capabilities["CM-03"];
if (!capability) throw new Error("Missing synthetic capability");
for (const level of Object.values(capability.levels)) {
  for (const id of [level.original_predicate_id, ...level.checks.map((c) => c.id)])
    activationRegistry[id] = { version: catalog.version, state: "ENABLED" };
}

describe("G2.1 · versioned numerical signing", () => {
  it.each([1, 1.0, 1.25])("legacy signed number %s requires explicit version", (n) => {
    expect(() => signAttestation({ payload: { n } }, secret)).toThrow("SIGNED_NUMBER_REQUIRES_V2");
  });
  it("Python 1.0/1 and negative zero have identical V2 HMAC in TypeScript", () => {
    expect(signAttestation(ref.numeric.input, secret).signature).toBe(ref.numeric.signature);
    const a = { signature_version: MME_SIGNATURE_NUMERIC_VERSION, payload: { n: 1.0 } };
    expect(signAttestation(a, secret).signature).toBe(signAttestation({ ...a, payload: { n: 1 } }, secret).signature);
  });
  it.each([1.25, NaN, Infinity, 9007199254740992])("V2 rejects nonintegral/unsafe %s", (n) => {
    expect(() => signAttestation({ signature_version: MME_SIGNATURE_NUMERIC_VERSION, n }, secret))
      .toThrow("SIGNED_NUMBER_NOT_SAFE_INTEGER");
  });
  it("decimal text is not rewritten", () => {
    expect(canonical({ n: "1.25" })).toBe('{"n":"1.25"}');
  });
  it("unknown signature version is rejected", () => {
    expect(() => signAttestation({ signature_version: "unknown" }, secret)).toThrow("UNSUPPORTED_SIGNATURE_VERSION");
  });
  it("unversioned numeric mutation yields a safe validation error", () => {
    const sample = ref.conflicts[0];
    if (!sample) throw new Error("Missing fixture");
    const a = { ...sample.attestation, payload: { n: 1.0 } };
    expect(validateAttestation(a, { checkId: a.check_id, assessmentId: "A1", evidenceStore, signers }))
      .toContain("SIGNED_NUMBER_REQUIRES_V2");
  });
});

describe("G2.1 · strict conflict evidence · Python ↔ TypeScript", () => {
  it.each(ref.conflicts)("$label: validation and complete outcome match Python", (test) => {
    const a = test.attestation;
    expect(validateAttestation(a, { checkId: a.check_id, assessmentId: "A1", evidenceStore, signers }))
      .toEqual(test.errors);
    const result = assess("CM-03", {
      catalog, attestations: [a], assessmentId: "A1", evidenceStore, signers,
      policyRegistry: { "CM-03": catalog.version }, activationRegistry,
    });
    expect(JSON.parse(JSON.stringify(result))).toEqual(test.outcome);
    if (test.label !== "valid") {
      expect(test.errors).toContain("CONFLICT_EVIDENCE_REFS_INVALID");
      expect(result.status).toBe("REVIEW_REQUIRED");
      expect(result.level).toBeNull();
    } else expect(test.errors).toEqual([]);
    expect(signAttestation(a, secret).signature).toBe(a.signature);
  });
});