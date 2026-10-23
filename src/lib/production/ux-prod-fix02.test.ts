/**
 * UX-PROD-FIX-02 · Pruebas de aceptación automatizadas (handlers reales,
 * repositorio en memoria aislado: nunca toca la organización Digiway Corp).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { createInMemoryProductionRepository, type ProductionRepository } from "./puertos";
import { destinoRutaLegacy, modoShell } from "./entrada";

const ORG = "00000000-0000-0000-0000-0000000000aa";
const ORG_B = "00000000-0000-0000-0000-0000000000bb";
const ASSESSMENT = {
  id: "assess-fix02", organizationId: ORG, caseId: "case-fix02", knowledgeVersionId: "kv-runtime",
  type: "BASELINE" as const, startedAt: "2026-10-01T00:00:00Z", closedAt: null, updatedAt: "2026-10-01T00:00:00Z",
};
const ASSESSMENT_B = { ...ASSESSMENT, id: "assess-b", organizationId: ORG_B, caseId: "case-b" };
let base: ProductionRepository;
let actual = ASSESSMENT;

vi.mock("./runtime.server", async (orig) => {
  const real = await orig<typeof import("./runtime.server")>();
  return {
    ...real,
    createSupabaseProductionRepository: () => base,
    asegurarContextoProductivo: async () => actual,
  };
});

const h = await import("./capability-handlers");
const ctx = (userId: string) => ({ userId, supabase: {} });

beforeEach(() => {
  actual = ASSESSMENT;
  base = createInMemoryProductionRepository([ASSESSMENT, ASSESSMENT_B], [
    { organizationId: ORG, userId: "owner", role: "OWNER" },
    { organizationId: ORG, userId: "miembro", role: "MEMBER" },
    { organizationId: ORG_B, userId: "otro", role: "OWNER" },
  ]);
});

async function tarea(cap: string) {
  const ws = await h.getCapabilityWorkspaceHandler(ctx("owner"), cap, {});
  return (ws.workspace.nextQuestion ?? ws.workspace.pendingInformationTasks[0])!.acquisitionId;
}
const responder = (user: string, cap: string, acquisitionId: string, valor: string, corrige?: string) =>
  h.submitCapabilityResponseHandler(ctx(user), cap, {
    acquisitionId, knowledgeState: "KNOWN", semanticValue: valor,
    ...(corrige ? { correctsObservationId: corrige } : {}),
  });

describe("1 · Un solo producto: rutas legacy redirigidas", () => {
  it("toda ruta legacy tiene destino productivo; las productivas no se tocan", () => {
    for (const r of ["/perfil", "/inicio", "/diagnostico", "/diagnostico/paso/1", "/resultados", "/resultados/x", "/dashboard", "/plan-de-accion/workspace/x", "/roadmap", "/seguimiento", "/proyecto/a", "/apoyo", "/cohorte", "/colaboracion", "/demostracion", "/moda-origen"]) {
      expect(destinoRutaLegacy(r)).not.toBeNull();
    }
    for (const r of ["/", "/acceso", "/empresa", "/diagnostico-productivo", "/resultados-productivos", "/capacidad/DG-02", "/ayuda", "/invitacion", "/plan-de-accion"]) {
      expect(destinoRutaLegacy(r)).toBeNull();
    }
    expect(destinoRutaLegacy("/perfil")).toBe("/empresa");
    expect(modoShell("/ayuda", true)).toBe("PRODUCCION");
  });
  it("header, ayuda y home no enlazan a la demo legacy ni al perfil local", () => {
    for (const f of ["src/components/layout/app-header.tsx", "src/routes/ayuda.tsx", "src/routes/index.tsx"]) {
      const src = readFileSync(f, "utf8");
      expect(src).not.toMatch(/to="\/(demostracion|moda-origen|perfil|inicio)"/);
    }
  });
});

describe("2/3/4 · Historial, corrección gobernada y aclaración DG-02", () => {
  it("dos valores distintos → NEEDS_CLARIFICATION con procedencia; corregir resuelve sin borrar", async () => {
    const acq = await tarea("DG-02");
    await responder("owner", "DG-02", acq, "Valor A");
    await responder("owner", "DG-02", acq, "Valor B");
    let ws = await h.getCapabilityWorkspaceHandler(ctx("owner"), "DG-02", {});
    expect(ws.workspace.interactionState).toBe("NEEDS_CLARIFICATION");
    expect(ws.clarificationDetails).toHaveLength(1);
    expect(ws.clarificationDetails[0]!.reason).toBe("DIVERGENT_VALUES");
    expect(ws.clarificationDetails[0]!.conflictingSemanticValues.sort()).toEqual(["Valor A", "Valor B"]);
    const objetivo = ws.responseHistory.find((x) => x.semanticValue === "Valor B")!;
    expect(objetivo.canCorrect).toBe(true);
    expect(objetivo.submittedBySelf).toBe(true);

    const r = await responder("owner", "DG-02", acq, "Valor A", objetivo.observationId);
    expect(r.accepted).toBe(true);
    ws = await h.getCapabilityWorkspaceHandler(ctx("owner"), "DG-02", {});
    expect(ws.workspace.counts.contradictions).toBe(0);
    expect(ws.workspace.interactionState).not.toBe("NEEDS_CLARIFICATION");
    // Historial preservado: 3 filas, la corregida marcada.
    expect(ws.responseHistory).toHaveLength(3);
    expect(ws.responseHistory.find((x) => x.observationId === objetivo.observationId)!.supersededByObservationId).toBeTruthy();
  });

  it("no se puede corregir dos veces la misma respuesta ni otra adquisición", async () => {
    const acq = await tarea("DG-02");
    const r1 = await responder("owner", "DG-02", acq, "X");
    await responder("owner", "DG-02", acq, "Y", r1.observationId!);
    const again = await responder("owner", "DG-02", acq, "Z", r1.observationId!);
    expect(again.rejectionReason).toBe("CORRECTION_TARGET_INVALID");
  });

  it("5 · un respondent invitado no corrige respuestas de otra persona", async () => {
    const acq = await tarea("DG-02");
    const r1 = await responder("owner", "DG-02", acq, "Del dueño");
    const inv = await base.insertRespondent({ organizationId: ORG, userId: "miembro", email: null, displayName: null, roleLabel: null, status: "ACTIVE" });
    await base.insertAssignment({ organizationId: ORG, assessmentId: ASSESSMENT.id, respondentId: inv.id, scopeType: "CAPABILITY", scopeRef: "DG-02", status: "IN_PROGRESS", delegatedFromAssignmentId: null, delegationReason: null });
    const ws = await h.getCapabilityWorkspaceHandler(ctx("miembro"), "DG-02", {});
    expect(ws.responseHistory[0]!.canCorrect).toBe(false);
    const r = await responder("miembro", "DG-02", acq, "Cambio", r1.observationId!);
    expect(r.accepted).toBe(false);
    expect(r.rejectionReason).toBe("CORRECTION_NOT_AUTHORIZED");
  });
});

describe("6/7 · Contadores por tipo de adquisición", () => {
  it("OP-01/OP-02 cuentan preguntas literales; no muestran 0 trabajo pendiente", async () => {
    for (const cap of ["OP-01", "OP-02"]) {
      const ws = await h.getCapabilityWorkspaceHandler(ctx("owner"), cap, {});
      expect(ws.workspace.counts.literalQuestions).toBeGreaterThan(0);
      expect(ws.workspace.counts.pendingQuestions).toBe(ws.workspace.counts.literalQuestions);
    }
  });
  it("capacidades por requerimientos cuentan tareas, no preguntas", async () => {
    const ws = await h.getCapabilityWorkspaceHandler(ctx("owner"), "OP-03", {});
    expect(ws.workspace.counts.informationTasks).toBe(ws.workspace.counts.pendingInformationTasks);
    expect(ws.workspace.counts.informationTasks + ws.workspace.counts.literalQuestions).toBe(ws.workspace.counts.totalAcquisitions);
  });
});

describe("8/9 · Evidencia: procedencia y reutilización sin transferencia automática", () => {
  it("cargada en DG-01 sin vínculo → pendiente allí, reutilizable en PC-01; vincular no transfiere", async () => {
    await h.registerCapabilityEvidenceHandler(ctx("owner"), "DG-01", { evidenceType: "DOCUMENT", source: "DOCUMENT", title: "Organigrama" });
    const dg = await h.getCapabilityCollaborationHandler(ctx("owner"), "DG-01", {});
    expect(dg.evidence[0]!.relation).toBe("NEEDS_LINK");
    expect(dg.evidence[0]!.uploadContextCapabilityId).toBe("DG-01");
    const pc = await h.getCapabilityCollaborationHandler(ctx("owner"), "PC-01", {});
    expect(pc.evidence[0]!.relation).toBe("ORGANIZATION");

    const r = await responder("owner", "PC-01", await tarea("PC-01"), "Respuesta PC");
    await h.linkCapabilityEvidenceHandler(ctx("owner"), "PC-01", { evidenceId: dg.evidence[0]!.id, observationId: r.observationId! });
    const pc2 = await h.getCapabilityCollaborationHandler(ctx("owner"), "PC-01", {});
    expect(pc2.evidence[0]!.relation).toBe("CAPABILITY");
    const dg2 = await h.getCapabilityCollaborationHandler(ctx("owner"), "DG-01", {});
    expect(dg2.evidence[0]!.relation).toBe("NEEDS_LINK");
    expect(dg2.evidence[0]!.links[0]!.capabilityId).toBe("PC-01");
  });
  it("no vincula a observaciones de otra capacidad", async () => {
    await h.registerCapabilityEvidenceHandler(ctx("owner"), "DG-01", { evidenceType: "DOCUMENT", source: "DOCUMENT", title: "Doc" });
    const ev = (await h.getCapabilityCollaborationHandler(ctx("owner"), "DG-01", {})).evidence[0]!;
    const r = await responder("owner", "PC-01", await tarea("PC-01"), "x");
    await expect(h.linkCapabilityEvidenceHandler(ctx("owner"), "DG-01", { evidenceId: ev.id, observationId: r.observationId! })).rejects.toThrow("OBSERVATION_OUTSIDE_CAPABILITY");
  });
});

describe("10/11 · Hub inmediato y métricas = registros persistidos", () => {
  it("tras guardar, el hub refleja la respuesta y los totales coinciden", async () => {
    await responder("owner", "CM-05", await tarea("CM-05"), "uno");
    await h.registerCapabilityEvidenceHandler(ctx("owner"), "CM-05", { evidenceType: "DOCUMENT", source: "DOCUMENT", title: "d" });
    const hub = await h.getDiagnosticHubHandler(ctx("owner"));
    expect(hub.capabilities).toHaveLength(31);
    expect(hub.capabilities.find((c) => c.capabilityId === "CM-05")!.counts!.answered).toBe(1);
    expect(hub.totals.responsesActive).toBe((await base.listObservations(ASSESSMENT.id)).length);
    expect(hub.totals.evidenceUploaded).toBe(1);
    expect(hub.totals.evidenceLinked).toBe(0);
    expect(new Set(hub.capabilities.map((c) => c.domainId)).size).toBe(6);
  });
});

describe("13 · Aislamiento de tenant", () => {
  it("otra organización no ve respuestas ni documentos ajenos", async () => {
    await responder("owner", "DG-02", await tarea("DG-02"), "privado");
    await h.registerCapabilityEvidenceHandler(ctx("owner"), "DG-02", { evidenceType: "DOCUMENT", source: "DOCUMENT", title: "privado" });
    actual = ASSESSMENT_B;
    const ws = await h.getCapabilityWorkspaceHandler(ctx("otro"), "DG-02", {});
    expect(ws.responseHistory).toHaveLength(0);
    const col = await h.getCapabilityCollaborationHandler(ctx("otro"), "DG-02", {});
    expect(col.evidence).toHaveLength(0);
  });
});
