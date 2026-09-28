/**
 * PILOT-READY-01 · PKG-02 · Trabajo accionable server-authoritative,
 * aislamiento por capacidad y journey autenticado.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { OFFICIAL_CAPABILITY_IDS, getRegisteredPack, listPublishedCapabilities } from "./packs-registry";
import { cargarEngine, hashTokenInvitacion } from "./runtime.server";
import { createActionableProjector } from "./actionable";
import { scopeRepositoryToCapability } from "./capability-scope";
import { createInMemoryProductionRepository } from "./puertos";
import * as casoUso from "./caso-uso";

const RAIZ = process.cwd();
const leer = (...p: string[]) => readFileSync(join(RAIZ, ...p), "utf8");
type RawPack = {
  acquisitions: { id: string; question?: unknown; informationNeedRef?: string; correspondenceStatement?: string; variableRefs: string[] }[];
  informationNeeds?: { id: string; statement: string }[];
  variables: { id: string; name: string }[];
};

function asmt(kv: string) {
  return { id: "assess-1", organizationId: "00000000-0000-0000-0000-000000000001", caseId: "case-1", knowledgeVersionId: kv, type: "BASELINE" as const, startedAt: "2026-09-28T00:00:00Z", closedAt: null, updatedAt: "2026-09-28T00:00:00Z" };
}

async function montar(capabilityId: string) {
  const org = "00000000-0000-0000-0000-000000000001";
  const a = asmt("kv-runtime");
  const base = createInMemoryProductionRepository([a]);
  const engine = cargarEngine(capabilityId);
  const repository = scopeRepositoryToCapability(base, capabilityId);
  const deps = { engine, repository, knowledgeVersionId: "kv-runtime" };
  const projector = createActionableProjector(getRegisteredPack(capabilityId).pack);
  const ws = async () => {
    const e = await casoUso.evaluarCapacidad(deps, a.id);
    return projector.derive({ engine, evaluation: e!.evaluation, answeredAcquisitionIds: e!.answeredAcquisitionIds });
  };
  const responder = (acquisitionId: string, knowledgeState: "KNOWN" | "UNKNOWN" | "NOT_APPLICABLE" | "CONTRADICTORY", extra: Record<string, unknown> = {}) =>
    casoUso.submitAcquisitionResponse(deps, {
      assessmentId: a.id,
      organizationId: org,
      submittedBy: null,
      acquisitionId,
      knowledgeState,
      semanticValue: knowledgeState === "KNOWN" ? "Descripción aportada" : null,
      ...extra,
    });
  return { base, engine, deps, assessment: a, ws, responder, raw: getRegisteredPack(capabilityId).pack as RawPack };
}

describe("PKG-02 · A · preguntas literales", () => {
  it.each(["OP-01", "CM-01", "DT-04"])("%s expone la pregunta literal del Engine", async (id) => {
    const m = await montar(id);
    const w = await m.ws();
    expect(w.interactionState).toBe("NOT_STARTED");
    expect(w.nextQuestion).not.toBeNull();
    const literal = m.raw.acquisitions.find((x) => x.id === w.nextQuestion!.acquisitionId)!.question;
    expect(w.nextQuestion!.question).toBe(literal);
  });
});

describe("PKG-02 · B · INFORMATION_NEED sin pregunta", () => {
  it.each(["DG-01", "PC-01", "DT-01"])("%s no se trata como completa y devuelve NI literales", async (id) => {
    const m = await montar(id);
    const w = await m.ws();
    expect(w.nextQuestion).toBeNull();
    expect(w.interactionState).not.toBe("ACQUISITION_EXHAUSTED");
    expect(w.pendingInformationTasks.length).toBeGreaterThan(0);
    for (const t of w.pendingInformationTasks) {
      expect(t.question).toBeNull();
      const ni = m.raw.informationNeeds!.find((n) => n.id === t.informationNeedRef)!;
      expect(t.informationNeedStatement).toBe(ni.statement);
    }
    const primera = w.pendingInformationTasks[0]!;
    const r = await m.responder(primera.acquisitionId, "KNOWN");
    expect(r.accepted).toBe(true);
    const obs = await m.deps.repository.listObservations(m.assessment.id);
    expect(obs[0]!.value.acquisitionRef).toBe(primera.acquisitionId);
    const w2 = await m.ws();
    expect(w2.interactionState).toBe("AWAITING_INFORMATION");
    expect(w2.pendingInformationTasks.some((t) => t.acquisitionId === primera.acquisitionId)).toBe(false);
  });
});

describe("PKG-02 · C · GOVERNED_STRUCTURAL_CORRESPONDENCE", () => {
  it.each(["DT-02", "DT-03", "DT-06"])("%s expone variable y correspondencia literales, sin NI inventada", async (id) => {
    const m = await montar(id);
    const w = await m.ws();
    expect(w.pendingInformationTasks.length).toBeGreaterThan(0);
    for (const t of w.pendingInformationTasks) {
      expect(t.mode).toBe("GOVERNED_STRUCTURAL_CORRESPONDENCE");
      expect(t.informationNeedRef).toBeNull();
      expect(t.informationNeedStatement).toBeNull();
      const raw = m.raw.acquisitions.find((x) => x.id === t.acquisitionId)!;
      expect(t.correspondenceStatement).toBe(raw.correspondenceStatement);
      expect(t.variables[0]!.name).toBe(m.raw.variables.find((v) => v.id === raw.variableRefs[0])!.name);
    }
    expect((await m.responder(w.pendingInformationTasks[0]!.acquisitionId, "UNKNOWN")).accepted).toBe(true);
  });
});

describe("PKG-02 · D · capacidad mixta", () => {
  it.each(["OP-03", "OP-04"])("%s: tras agotar preguntas quedan NI pendientes", async (id) => {
    const m = await montar(id);
    let w = await m.ws();
    expect(w.nextQuestion).not.toBeNull();
    for (let i = 0; i < 50 && w.nextQuestion; i++) {
      await m.responder(w.nextQuestion.acquisitionId, "UNKNOWN");
      w = await m.ws();
    }
    expect(w.nextQuestion).toBeNull();
    expect(w.pendingInformationTasks.length).toBeGreaterThan(0);
    expect(w.interactionState).toBe("AWAITING_INFORMATION");
  });
});

describe("PKG-02 · E · estados de respuesta", () => {
  it("CONTRADICTORY sin fuentes es rechazado por el Engine", async () => {
    const m = await montar("DG-01");
    const t = (await m.ws()).pendingInformationTasks;
    expect((await m.responder(t[0]!.acquisitionId, "CONTRADICTORY", { semanticValue: "x" })).accepted).toBe(false);
  });
  it("KNOWN / UNKNOWN / NOT_APPLICABLE+motivo / CONTRADICTORY son aceptados", async () => {
    const m = await montar("DG-01");
    const t = (await m.ws()).pendingInformationTasks;
    expect((await m.responder(t[0]!.acquisitionId, "KNOWN")).accepted).toBe(true);
    expect((await m.responder(t[1]!.acquisitionId, "UNKNOWN")).accepted).toBe(true);
    expect((await m.responder(t[2]!.acquisitionId, "NOT_APPLICABLE", { notApplicableReason: "No opera ese canal" })).accepted).toBe(true);
    expect((await m.responder(t[3]!.acquisitionId, "CONTRADICTORY", { semanticValue: "Dos versiones", conflictingObservationIds: (await m.deps.repository.listObservations(m.assessment.id)).slice(0, 2).map((o) => o.id) })).accepted).toBe(true);
  });
});

describe("PKG-02 · aislamiento por capacidad en Assessment compartido", () => {
  it("respuestas de DG-01 no contaminan PC-01 (ids ACQ·NI01 repetidos)", async () => {
    const a = asmt("kv");
    const base = createInMemoryProductionRepository([a]);
    const dg = scopeRepositoryToCapability(base, "DG-01");
    const pc = scopeRepositoryToCapability(base, "PC-01");
    await casoUso.submitAcquisitionResponse(
      { engine: cargarEngine("DG-01"), repository: dg, knowledgeVersionId: "kv" },
      { assessmentId: a.id, organizationId: "o", submittedBy: null, acquisitionId: "ACQ·NI01", knowledgeState: "UNKNOWN" },
    );
    expect(await dg.listResponses(a.id)).toHaveLength(1);
    expect(await pc.listResponses(a.id)).toHaveLength(0);
    expect(await pc.listObservations(a.id)).toHaveLength(0);
  });
  it("filas históricas sin etiqueta pertenecen a OP-01", async () => {
    const base = createInMemoryProductionRepository([asmt("kv")]);
    await base.insertResponse({ organizationId: "o", assessmentId: "a", submittedBy: null, acquisitionRef: "OP01-P01", payload: {} });
    expect(await scopeRepositoryToCapability(base, "OP-01").listResponses("a")).toHaveLength(1);
    expect(await scopeRepositoryToCapability(base, "DG-01").listResponses("a")).toHaveLength(0);
  });
});

describe("PKG-02 · G · invitaciones", () => {
  const h = leer("src/lib/production/capability-handlers.ts");
  it("el enlace usa el token en claro en el fragmento, nunca el id ni el hash", () => {
    expect(h).toContain("invitationPath: `/invitacion#${token}`");
    expect(h).not.toMatch(/invitationPath:.*invitation\.id/);
    expect(h).not.toMatch(/token_hash\s*:/);
    expect(hashTokenInvitacion("x")).not.toBe("x");
  });
  it("la aceptación compara hash y exige email coincidente", () => {
    expect(h).toContain('.eq("token_hash", hash)');
    expect(h).toContain("EMAIL_MISMATCH");
  });
  it("delegación admite CAPABILITY e INFORMATION_NEED", () => {
    const c = leer("src/components/capacidad/colaboracion-panel.tsx");
    expect(c).toContain('"CAPABILITY"');
    expect(c).toContain('"INFORMATION_NEED"');
  });
});

describe("PKG-02 · H · navegación", () => {
  it("el hub representa las 31 capacidades oficiales sin EC-01", () => {
    const ids = listPublishedCapabilities().map((c) => c.capabilityId);
    expect(ids).toHaveLength(31);
    expect(ids).not.toContain("EC-01");
    expect(new Set(ids.map((i) => i.slice(0, 2)))).toEqual(new Set(["DG", "PC", "OP", "DT", "CM", "EC"]));
    expect(OFFICIAL_CAPABILITY_IDS).toEqual(ids);
  });
  it("rutas productivas existen y el login lleva al hub", () => {
    for (const f of ["capacidad.$id.tsx", "diagnostico-productivo.tsx", "resultados-productivos.tsx", "capacidad.op-01.tsx"]) {
      expect(existsSync(join(RAIZ, "src/routes/_authenticated", f))).toBe(true);
    }
    expect(leer("src/routes/acceso.tsx")).toContain('"/diagnostico-productivo"');
  });
  it("capacidad inválida falla cerrada", () => {
    expect(() => cargarEngine("EC-01")).toThrow();
    expect(() => cargarEngine("ZZ-99")).toThrow();
  });
  it("las pantallas productivas no enlazan al diagnóstico legacy ni usan mocks", () => {
    const archivos = [
      "src/routes/_authenticated/capacidad.$id.tsx",
      "src/routes/_authenticated/diagnostico-productivo.tsx",
      "src/routes/_authenticated/resultados-productivos.tsx",
      "src/components/diagnostico/catalogo-capacidades.tsx",
      "src/components/capacidad/acquisition-renderer.tsx",
      "src/components/capacidad/acquisition-input.tsx",
      "src/components/capacidad/evidencia-panel.tsx",
      "src/components/capacidad/colaboracion-panel.tsx",
    ];
    for (const f of archivos) {
      const s = leer(f);
      expect(s).not.toMatch(/to[=:]\s*["'](\/diagnostico|\/dashboard|\/resultados|\/plan-de-accion|\/inicio)["'/]/);
      expect(s).not.toMatch(/data\/mocks|use-sesion|localStorage/);
    }
  });
  it("el proyector solo usa tipos del Engine y los handlers lo cargan dinámicamente", () => {
    const a = leer("src/lib/production/actionable.ts");
    expect(a).not.toMatch(/import \{[^}]*\} from "@pymapa\/knowledge-engine"/);
    expect(a).not.toMatch(/createKnowledgeEngine/);
    expect(leer("src/lib/production/capability-handlers.ts")).toContain('await import("./actionable")');
  });
  it("el renderer no fabrica preguntas desde requerimientos de información", () => {
    const r = leer("src/components/capacidad/acquisition-renderer.tsx");
    expect(r).not.toMatch(/¿/);
  });
});
