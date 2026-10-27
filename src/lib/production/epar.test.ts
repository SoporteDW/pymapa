import { describe, expect, it } from "vitest";
import { eparBodySchema, hasProfessionalAuthority, EPAR_ORIGIN, type ProfessionalAuthority } from "./epar-contract";
import { verifyEparScope, verifyEparAuthority, saveEpar, reviewEpar } from "./epar.server";
import { OFFICIAL_CAPABILITY_IDS } from "./packs-registry";
const org = "9816dfad-a1be-4140-8293-c4cab34f3603";
const assessment = "c71d7b34-9da0-4755-8394-418172412731";
const user = "d918f1e4-d569-4569-b60e-fe3b90ec86da";
const authorityId = "10000000-0000-4000-8000-000000000001";
const scope = { organizationId: org, assessmentId: assessment, capabilityId: "OP-02" };
const authority: ProfessionalAuthority = { id: authorityId, organization_id: org, evaluator_user_id: user, assessment_id: assessment, capability_ids: [...OFFICIAL_CAPABILITY_IDS], valid_from: "2020-01-01T00:00:00Z", valid_until: "2099-01-01T00:00:00Z" };
const body = { authorityId, state: "INSUFFICIENT_INFORMATION", conclusion: null, justification: "Faltan datos", limitations: "Solo fuentes sintéticas", uncertainty: "Sin conclusión", pendingInformation: "Confirmar información", sources: "QA sintética", sourceDate: "2020-01-01T00:00:00Z", validUntil: "2098-01-01T00:00:00Z", responseIds: [], evidenceIds: [] };
function fakeDb(options: { authority?: ProfessionalAuthority | null; revoked?: boolean; member?: boolean; assessment?: boolean; foreignEvidence?: boolean; foreignResponse?: boolean } = {}) {
  const calls: { name: string; args: unknown }[] = [];
  const db = {
    from(table: string) {
      const filters: Record<string, unknown> = {};
      const q: any = { select: () => q, eq: (k: string, v: unknown) => { filters[k] = v; return q; }, in: () => q, maybeSingle: () => q,
        then(resolve: (v: unknown) => unknown) {
          const data = table === "memberships" ? (options.member === false ? null : { id: "m", role: "ADMIN" }) : table === "assessments" ? (options.assessment === false ? null : { id: assessment }) : table === "professional_authorities" ? ("authority" in options ? options.authority : authority) : table === "professional_authority_events" ? (options.revoked ? [{ id: "revoked" }] : []) : table === "evidence" ? (options.foreignEvidence ? [] : [{ id: authorityId }]) : table === "responses" ? [{ id: authorityId, payload: { capabilityId: options.foreignResponse ? "OP-01" : "OP-02" } }] : [];
          return Promise.resolve({ data, error: null }).then(resolve);
        } };
      return q;
    },
    rpc: async (name: string, args: unknown) => { calls.push({ name, args }); return { data: authorityId, error: null }; },
  };
  return { db, calls };
}
describe("B02 explicit professional authority", () => {
  it("ADMIN without professional designation is DENIED", async () => { const { db } = fakeDb({ authority: null }); await expect(verifyEparAuthority(db, user, scope, authorityId)).rejects.toThrow("EPAR_AUTHORITY_DENIED"); });
  it.each(OFFICIAL_CAPABILITY_IDS)("designated evaluator within %s is ALLOWED", capabilityId => expect(hasProfessionalAuthority(authority, { ...scope, capabilityId }, user, false, Date.parse("2026-10-27T20:18:00Z"))).toBe(true));
  it("out-of-scope evaluator is DENIED", () => expect(hasProfessionalAuthority({ ...authority, capability_ids: ["OP-01"] }, scope, user, false, Date.now())).toBe(false));
  it("revoked authority is DENIED", async () => { const { db } = fakeDb({ revoked: true }); await expect(verifyEparAuthority(db, user, scope, authorityId)).rejects.toThrow("EPAR_AUTHORITY_DENIED"); });
  it("expired authority is DENIED", () => expect(hasProfessionalAuthority({ ...authority, valid_until: "2026-10-27T20:18:00Z" }, scope, user, false, Date.parse("2026-10-27T20:18:00Z"))).toBe(false));
  it("future authority is DENIED", () => expect(hasProfessionalAuthority({ ...authority, valid_from: "2090-01-01T00:00:00Z" }, scope, user, false, Date.now())).toBe(false));
  it("different evaluator cannot reuse authority", () => expect(hasProfessionalAuthority(authority, scope, authorityId, false, Date.now())).toBe(false));
  it("assessment-limited authority cannot cross assessments", () => expect(hasProfessionalAuthority(authority, { ...scope, assessmentId: authorityId }, user, false, Date.now())).toBe(false));
});
describe("B02 tenant and references", () => {
  it("organization A cannot use B scope on server", async () => { const { db } = fakeDb({ member: false }); await expect(verifyEparScope(db, user, scope)).rejects.toThrow("EPAR_SCOPE_FORBIDDEN"); });
  it("organization B cannot use A scope on server", async () => { const { db } = fakeDb({ assessment: false }); await expect(verifyEparScope(db, authorityId, scope)).rejects.toThrow("EPAR_SCOPE_FORBIDDEN"); });
  it("foreign evidence rejected before RPC", async () => { const { db, calls } = fakeDb({ foreignEvidence: true }); await expect(saveEpar(db, user, scope, { ...body, evidenceIds: [authorityId] })).rejects.toThrow("EPAR_REFERENCE_FORBIDDEN"); expect(calls).toEqual([]); });
  it("foreign capability response rejected before RPC", async () => { const { db, calls } = fakeDb({ foreignResponse: true }); await expect(saveEpar(db, user, scope, { ...body, responseIds: [authorityId] })).rejects.toThrow("EPAR_REFERENCE_FORBIDDEN"); expect(calls).toEqual([]); });
});
describe("B02 professional semantics and history", () => {
  it("insufficient information permits abstention without conclusion", () => expect(eparBodySchema.parse(body).conclusion).toBeNull());
  it("contradictory information never writes an institutional finding", async () => { const { db, calls } = fakeDb(); await saveEpar(db, user, scope, { ...body, state: "CONTRADICTORY_INFORMATION" }); expect(calls.map(c => c.name)).toEqual(["register_professional_assessment"]); expect(EPAR_ORIGIN).toBe("PROFESSIONAL_ASSESSMENT"); });
  it("non-applicability does not force conclusion", () => expect(eparBodySchema.parse({ ...body, state: "NOT_APPLICABLE" }).conclusion).toBeNull());
  it("abstention rejects forced conclusion", () => expect(eparBodySchema.safeParse({ ...body, conclusion: "Conclusión forzada" }).success).toBe(false));
  it("substantiated assessment requires a conclusion", () => expect(eparBodySchema.safeParse({ ...body, state: "SUBSTANTIATED", evidenceIds: [authorityId] }).success).toBe(false));
  it("substantiated assessment requires source records", () => expect(eparBodySchema.safeParse({ ...body, state: "SUBSTANTIATED", conclusion: "Juicio humano" }).success).toBe(false));
  it("review required can abstain", () => expect(eparBodySchema.parse({ ...body, state: "REVIEW_REQUIRED" }).conclusion).toBeNull());
  it("version replacement requires previous version", () => expect(eparBodySchema.safeParse({ ...body, evaluationId: authorityId }).success).toBe(false));
  it("new version retains previous reference through dedicated RPC", async () => { const { db, calls } = fakeDb(); await saveEpar(db, user, scope, { ...body, evaluationId: authorityId, previousVersionId: authorityId }); expect(calls[0]?.args).toMatchObject({ _body: { evaluationId: authorityId, previousVersionId: authorityId } }); });
  it("review only appends dedicated professional event", async () => { const { db, calls } = fakeDb(); await reviewEpar(db, user, scope, { versionId: authorityId, authorityId, decision: "CHANGES_REQUESTED", note: "Falta información" }); expect(calls.map(c => c.name)).toEqual(["review_professional_assessment"]); });
  it.each(["justification", "limitations", "uncertainty", "sources"])("requires professional %s", field => expect(eparBodySchema.safeParse({ ...body, [field]: "" }).success).toBe(false));
});