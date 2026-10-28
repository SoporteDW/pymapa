import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInMemoryProductionRepository, type ProductionRepository } from "./puertos";

const org = "00000000-0000-4000-8000-000000000001";
const assessment = { id: "assessment", organizationId: org, caseId: "case", knowledgeVersionId: "kv", type: "BASELINE" as const, startedAt: "2026-10-28T00:00:00Z", closedAt: null, updatedAt: "2026-10-28T00:00:00Z" };
let base: ProductionRepository;
const files = new Map<string, Uint8Array>();
vi.mock("./runtime.server", async (original) => ({ ...(await original<typeof import("./runtime.server")>()), createSupabaseProductionRepository: () => base, asegurarContextoProductivo: async () => assessment }));
const h = await import("./capability-handlers");
const ctx = (userId = "owner") => ({ userId, supabase: { storage: { from: () => ({ download: async (path: string) => ({ data: files.has(path) ? new Blob([new Uint8Array(files.get(path) ?? [])]) : null, error: null }) }) } } });
beforeEach(async () => {
  base = createInMemoryProductionRepository([assessment], [{ organizationId: org, userId: "owner", role: "OWNER" }, { organizationId: org, userId: "member", role: "MEMBER" }]);
  files.clear();
  const dir = join(__dirname, "fixtures/expediente-qhapaq");
  for (const name of readdirSync(dir)) {
    files.set(name, new Uint8Array(readFileSync(join(dir, name))));
    await base.insertEvidence({ organizationId: org, assessmentId: assessment.id, caseId: assessment.caseId, candidateRef: null, evidenceType: "DOCUMENT", source: "DOCUMENT", storageBucket: "evidence", storagePath: name, title: name, note: null, submittedBy: "owner", respondentId: null, capturedAt: null });
  }
});
async function propuesta() {
  const d = await h.getExpedienteHandler(ctx());
  const p = d.proposals.find((p) => p.capabilityId === "DG-01" && p.acquisitionId === "ACQ·NI01");
  if (!p) throw new Error("Expected literal DG-01 proposal");
  return { capabilityId: p.capabilityId, acquisitionId: p.acquisitionId, evidenceId: p.evidenceId, fragmentId: p.fragmentId };
}
describe("confirmación transversal verificada", () => {
  it("rechaza evidencia ajena antes de persistir", async () => {
    await expect(h.confirmExpedienteBatchHandler(ctx(), { items: [{ capabilityId: "DG-01", acquisitionId: "ACQ·NI01", evidenceId: "00000000-0000-4000-8000-000000000099", fragmentId: "p1-f0" }] })).rejects.toThrow("EVIDENCE_NOT_IN_ASSESSMENT");
    expect(await base.listResponses(assessment.id)).toEqual([]);
  });
  it("MEMBER no confirma ni obtiene autoridad automática", async () => {
    await expect(h.confirmExpedienteBatchHandler(ctx("member"), { items: [await propuesta()] })).rejects.toThrow("OWNER_ADMIN_REQUIRED");
    expect(await base.listResponses(assessment.id)).toEqual([]);
  });
  it("un fragmento arbitrario no es una propuesta verificada", async () => {
    const r = await h.confirmExpedienteBatchHandler(ctx(), { items: [{ ...await propuesta(), fragmentId: "p99-f999" }] });
    expect(r.results[0]?.reason).toBe("PROPOSAL_NOT_VERIFIED");
    expect(await base.listResponses(assessment.id)).toEqual([]);
  });
  it("guarda cita, respuesta, observación y evaluación, sin duplicar en un reintento secuencial", async () => {
    const item = await propuesta();
    const r = await h.confirmExpedienteBatchHandler(ctx(), { items: [item, item] });
    expect(r.confirmed).toBe(1);
    expect(r.results[0]?.responseId).toBeTruthy();
    expect(r.results[0]?.observationId).toBeTruthy();
    expect(r.results[0]?.evaluationRunId).toBeTruthy();
    const rows = await base.listResponses(assessment.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.payload?.raw).toMatchObject({ evidenceId: item.evidenceId, fragmentId: item.fragmentId, confirmedByUserId: "owner" });
    const retry = await h.confirmExpedienteBatchHandler(ctx(), { items: [item] });
    expect(retry.confirmed).toBe(0);
    expect(retry.results[0]?.reason).toBe("ALREADY_ANSWERED");
    expect(await base.listResponses(assessment.id)).toHaveLength(1);
  });
});