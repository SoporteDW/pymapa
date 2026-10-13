/**
 * SPRINT-04-FIX · Pruebas a nivel de handler productivo (boundary autenticado).
 * Se ejercitan los handlers reales; solo se sustituyen el cliente PostgreSQL
 * (repositorio en memoria con membresías) y el bootstrap de contexto.
 * NO sustituyen la validación humana en navegador autenticado.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { createInMemoryProductionRepository, type ProductionRepository } from "./puertos";

const ORG = "00000000-0000-0000-0000-000000000001";
const ASSESSMENT = {
  id: "assess-1", organizationId: ORG, caseId: "case-1", knowledgeVersionId: "kv-runtime",
  type: "BASELINE" as const, startedAt: "2026-10-01T00:00:00Z", closedAt: null, updatedAt: "2026-10-01T00:00:00Z",
};
let base: ProductionRepository;

vi.mock("./runtime.server", async (orig) => {
  const real = await orig<typeof import("./runtime.server")>();
  return {
    ...real,
    createSupabaseProductionRepository: () => base,
    asegurarContextoProductivo: async () => ASSESSMENT,
  };
});

const h = await import("./capability-handlers");
const { cargarEngine } = await import("./runtime.server");

function montar(memberships: { organizationId: string; userId: string; role: "OWNER" | "ADMIN" | "MEMBER" }[]) {
  base = createInMemoryProductionRepository([ASSESSMENT], memberships);
}
const ctx = (userId: string) => ({ userId, supabase: {} });

async function primeraAdquisicion(capabilityId: string) {
  const ws = await h.getCapabilityWorkspaceHandler(ctx("owner"), capabilityId, {});
  const a = ws.workspace.nextQuestion ?? ws.workspace.pendingInformationTasks[0];
  expect(a).toBeTruthy();
  return a!.acquisitionId;
}
const responder = (user: string, capabilityId: string, acquisitionId: string) =>
  h.submitCapabilityResponseHandler(ctx(user), capabilityId, {
    acquisitionId, knowledgeState: "KNOWN", semanticValue: "Descripción aportada",
  });

beforeEach(() => montar([{ organizationId: ORG, userId: "owner", role: "OWNER" }]));

describe("SPRINT-04 · A · OWNER responde tres capacidades en secuencia", () => {
  it("DG-01 → PC-01 → DT-01 persisten", async () => {
    for (const cap of ["DG-01", "PC-01", "DT-01"]) {
      const r = await responder("owner", cap, await primeraAdquisicion(cap));
      expect(r.rejectionReason ?? null).toBeNull();
      expect(r.accepted).toBe(true);
    }
    const asign = await base.listAssignments(ASSESSMENT.id);
    expect(asign.map((a) => a.scopeRef).sort()).toEqual(["DG-01", "DT-01", "PC-01"]);
    expect(asign.every((a) => a.scopeType === "CAPABILITY")).toBe(true);
    // Reintento en la misma capacidad reutiliza la asignación válida.
    await responder("owner", "DG-01", await primeraAdquisicion("DG-01"));
    expect((await base.listAssignments(ASSESSMENT.id)).length).toBe(3);
  });
});

describe("SPRINT-04 · B · autorización de respondents", () => {
  it("MEMBER sin asignación es rechazado y no recibe asignación automática", async () => {
    montar([
      { organizationId: ORG, userId: "owner", role: "OWNER" },
      { organizationId: ORG, userId: "miembro", role: "MEMBER" },
    ]);
    const acq = await primeraAdquisicion("PC-01");
    const r = await responder("miembro", "PC-01", acq);
    expect(r.accepted).toBe(false);
    expect(r.rejectionReason).toBe("RESPONDENT_WITHOUT_ASSIGNMENT");
    expect(await base.listAssignments(ASSESSMENT.id)).toHaveLength(0);
  });

  it("respondent con asignación DG-01 no puede responder PC-01", async () => {
    montar([{ organizationId: ORG, userId: "delegado", role: "MEMBER" }]);
    const r0 = await base.insertRespondent({ organizationId: ORG, userId: "delegado", email: null, displayName: null, roleLabel: null, status: "ACTIVE" });
    await base.insertAssignment({ organizationId: ORG, assessmentId: ASSESSMENT.id, respondentId: r0.id, scopeType: "CAPABILITY", scopeRef: "DG-01", status: "IN_PROGRESS", delegatedFromAssignmentId: null, delegationReason: null });
    const ok = await responder("delegado", "DG-01", await primeraAdquisicion("DG-01"));
    expect(ok.accepted).toBe(true);
    const no = await responder("delegado", "PC-01", await primeraAdquisicion("PC-01"));
    expect(no.rejectionReason).toBe("OUT_OF_ASSIGNMENT_SCOPE");
    expect(await base.listAssignments(ASSESSMENT.id)).toHaveLength(1);
  });

  it("alcance INFORMATION_NEED calificado no cruza capacidades con ids repetidos", async () => {
    const { assignmentCubreAdquisicion, calificarAlcance } = await import("./caso-uso");
    const a = { scopeType: "INFORMATION_NEED" as const, scopeRef: calificarAlcance("DG-01", "NI01") };
    const acq = { id: "ACQ·NI01", informationNeedRef: "NI01", variableRefs: ["VA01"] };
    expect(assignmentCubreAdquisicion(a, acq, { id: "DG-01", domainId: "DG" })).toBe(true);
    expect(assignmentCubreAdquisicion(a, acq, { id: "PC-01", domainId: "PC" })).toBe(false);
  });

  it("no se puede invitar con un alcance de otra capacidad", async () => {
    await expect(
      h.inviteCapabilityRespondentHandler(ctx("owner"), "PC-01", { email: "x@ejemplo.com", scopeType: "CAPABILITY", scopeRef: "DG-01" }),
    ).rejects.toThrow("SCOPE_OUTSIDE_CAPABILITY");
  });

  it("no se puede vincular evidencia a observaciones de otra capacidad", async () => {
    await responder("owner", "DG-01", await primeraAdquisicion("DG-01"));
    const obsDg = (await base.listObservations(ASSESSMENT.id))[0]!;
    await expect(
      h.registerCapabilityEvidenceHandler(ctx("owner"), "PC-01", { evidenceType: "DOCUMENT", source: "DOCUMENT", title: "Doc", observationIds: [obsDg.id] }),
    ).rejects.toThrow("OBSERVATION_OUTSIDE_CAPABILITY");
  });
});

describe("SPRINT-04 · D · evidencia reutilizable sin contaminación", () => {
  it("evidencia de DG-01 aparece en PC-01 solo como de la organización, y PC-01 sigue sin respuestas", async () => {
    await responder("owner", "DG-01", await primeraAdquisicion("DG-01"));
    const obsDg = (await base.listObservations(ASSESSMENT.id))[0]!;
    await h.registerCapabilityEvidenceHandler(ctx("owner"), "DG-01", { evidenceType: "DOCUMENT", source: "DOCUMENT", title: "Manual", observationIds: [obsDg.id] });
    const dg = await h.getCapabilityCollaborationHandler(ctx("owner"), "DG-01", {});
    const pc = await h.getCapabilityCollaborationHandler(ctx("owner"), "PC-01", {});
    expect(dg.evidence.map((e) => e.relation)).toEqual(["CAPABILITY"]);
    expect(pc.evidence.map((e) => e.relation)).toEqual(["ORGANIZATION"]);
    expect(pc.observations).toHaveLength(0);
    expect(pc.assignments.every((a) => a.scopeRef !== "DG-01")).toBe(true);
    const wsPc = await h.getCapabilityWorkspaceHandler(ctx("owner"), "PC-01", {});
    expect(wsPc.workspace.counts.answered).toBe(0);
  });
});

describe("SPRINT-04 · C/E/F/G · UI y navegación (estático)", () => {
  it("C · la ruta de capacidad remonta el estado por capabilityId", () => {
    const src = readFileSync("src/routes/_authenticated/capacidad.$id.tsx", "utf8");
    expect(src).toMatch(/<CapacidadGenerica key=\{capabilityId\}/);
  });
  it("E · /ayuda y rutas productivas nunca usan el shell MVP Alfa", async () => {
    const { modoShell, navegacionProductiva } = await import("./entrada");
    for (const p of ["/ayuda", "/diagnostico-productivo", "/capacidad/pc-01", "/capacidad/op-01", "/empresa", "/resultados-productivos"]) {
      expect(modoShell(p, true)).toBe("PRODUCCION");
    }
    expect(modoShell("/", true)).toBe("PRODUCCION");
    expect(modoShell("/moda-origen", true)).toBe("DEMO");
    const legacy = ["/perfil", "/diagnostico", "/resultados", "/inicio", "/dashboard"];
    expect(navegacionProductiva.some((n) => legacy.includes(n.to))).toBe(false);
  });
  it("F · la ayuda no afirma persistencia en el navegador", async () => {
    const src = readFileSync("src/routes/ayuda.tsx", "utf8");
    expect(src).not.toMatch(/localStorage|en este navegador y podrás|MVP Alfa/);
    expect(src).toMatch(/no en este navegador/);
  });
  it("G · OP-01 sin entrada aparte; el catálogo genérico la conduce a su experiencia", async () => {
    const { navegacionProductiva } = await import("./entrada");
    expect(navegacionProductiva.some((n) => n.to.includes("op-01"))).toBe(false);
    expect(cargarEngine("OP-01").pack.capability.id).toBe("OP-01");
  });
});
