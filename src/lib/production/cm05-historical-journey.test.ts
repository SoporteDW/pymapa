/**
 * CM05-HISTORICAL-JOURNEY-FIX · reproduce el historial real (respuestas +
 * correcciones encadenadas) y comprueba que ninguna pregunta con respuesta
 * vigente reaparece como siguiente paso. No parte de una capacidad vacía.
 */
import { describe, expect, it } from "vitest";
import { cargarEngine } from "./runtime.server";
import { OFFICIAL_CAPABILITY_IDS, getRegisteredPack } from "./packs-registry";
import { createInMemoryProductionRepository, type AssessmentRecord } from "./puertos";
import { scopeRepositoryToCapability } from "./capability-scope";
import * as casoUso from "./caso-uso";

type Acq = { id: string; acquisitionMode?: string; variableRefs: string[]; question?: unknown };

function montar(cap: string) {
  const a = { id: "a-h", organizationId: "00000000-0000-0000-0000-0000000000aa", knowledgeVersionId: "kv", status: "OPEN", closedAt: null, createdAt: "2026-01-01T00:00:00.000Z" } as unknown as AssessmentRecord;
  const base = createInMemoryProductionRepository([a]);
  const deps = { engine: cargarEngine(cap), repository: scopeRepositoryToCapability(base, cap), knowledgeVersionId: "kv" };
  const resp = (acquisitionId: string, semanticValue: string, extra: Record<string, unknown> = {}) =>
    casoUso.submitAcquisitionResponse(deps, { assessmentId: a.id, organizationId: a.organizationId, submittedBy: null, acquisitionId, knowledgeState: "KNOWN", semanticValue, ...extra });
  const ultimaObs = async (acq: string) => (await base.listObservations(a.id)).filter((o) => o.value.acquisitionRef === acq).at(-1)!;
  const acqs = (getRegisteredPack(cap).pack as { acquisitions: Acq[] }).acquisitions;
  return { base, deps, a, resp, ultimaObs, acqs };
}

describe("CM-05 · recorrido con historial previo", () => {
  it("4 respuestas + correcciones encadenadas: siguiente es P1·05, sin contradicción", async () => {
    const m = montar("CM-05");
    const p = m.acqs.filter((x) => casoUso.esAdquisicionDeCapacidad(x) && typeof x.question === "string");
    const [p1, p2, p3, p4, p5] = p;
    for (const [i, q] of [p1, p2, p3, p4].entries()) expect((await m.resp(q!.id, `texto libre ${i}`)).accepted).toBe(true);
    // Cadena de correcciones como en el historial real.
    for (const v of ["Definido", "En el primer momento de atención", "Es correcto y puede continuar"]) {
      const prev = await m.ultimaObs(p1!.id);
      expect((await m.resp(p1!.id, v, { correctsObservationId: prev.id })).accepted).toBe(true);
    }
    // "Salir y volver": nueva lectura completa desde el repositorio.
    const next = await casoUso.getNextAcquisition(m.deps, m.a.id);
    expect(next?.acquisitionId).toBe(p5!.id);
    const e = (await casoUso.evaluarCapacidad(m.deps, m.a.id))!;
    expect(e.evaluation.contradictions).toHaveLength(0);
    expect(e.evaluation.answeredAcquisitionRefs).toEqual(expect.arrayContaining([p1!.id, p2!.id, p3!.id, p4!.id]));
    // Historial preservado: nada borrado.
    expect((await m.base.listObservations(m.a.id)).length).toBe(7);
    // Responder P1·05 y volver: no reaparece.
    await m.resp(p5!.id, "respuesta cinco");
    const despues = await casoUso.getNextAcquisition(m.deps, m.a.id);
    expect([p1, p2, p3, p4, p5].map((x) => x!.id)).not.toContain(despues?.acquisitionId);
    // Ninguna VA declarada conocida sin correspondencia gobernada.
    const e2 = (await casoUso.evaluarCapacidad(m.deps, m.a.id))!;
    expect(e2.evaluation.variableEvaluations.every((v) => v.state !== "KNOWN")).toBe(true);
  });

  it("valores distintos en la MISMA pregunta sin corrección siguen siendo contradicción", async () => {
    const m = montar("CM-05");
    const p1 = m.acqs.find((x) => casoUso.esAdquisicionDeCapacidad(x) && typeof x.question === "string")!;
    await m.resp(p1.id, "A");
    await m.resp(p1.id, "B");
    const e = (await casoUso.evaluarCapacidad(m.deps, m.a.id))!;
    expect(e.evaluation.contradictions.length).toBeGreaterThan(0);
  });

  it.each(OFFICIAL_CAPABILITY_IDS)("%s · una pregunta respondida nunca vuelve como siguiente", async (cap) => {
    const m = montar(cap);
    const n1 = await casoUso.getNextAcquisition(m.deps, m.a.id);
    if (!n1) return;
    const v = n1.allowedSemanticValues?.[0] ?? "respuesta";
    const r = await casoUso.submitAcquisitionResponse(m.deps, { assessmentId: m.a.id, organizationId: m.a.organizationId, submittedBy: null, acquisitionId: n1.acquisitionId, knowledgeState: "KNOWN", semanticValue: v });
    expect(r.accepted).toBe(true);
    const n2 = await casoUso.getNextAcquisition(m.deps, m.a.id);
    expect(n2?.acquisitionId).not.toBe(n1.acquisitionId);
  });
});
