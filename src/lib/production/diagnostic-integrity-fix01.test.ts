/**
 * DIAGNOSTIC-INTEGRITY-FIX-01 · matriz B1–B8 (Engine 0.2.0 sin cambios).
 */
import { describe, expect, it } from "vitest";
import { cargarEngine } from "./runtime.server";
import { OFFICIAL_CAPABILITY_IDS, getRegisteredPack } from "./packs-registry";
import { createInMemoryProductionRepository, type AssessmentRecord } from "./puertos";
import { scopeRepositoryToCapability } from "./capability-scope";
import { createActionableProjector } from "./actionable";
import * as casoUso from "./caso-uso";

type Acq = { id: string; acquisitionMode?: string; variableRefs: string[] };
const asmt = (): AssessmentRecord =>
  ({
    id: "a-1",
    organizationId: "00000000-0000-0000-0000-000000000001",
    knowledgeVersionId: "kv",
    status: "OPEN",
    closedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  }) as unknown as AssessmentRecord;

async function montar(cap: string) {
  const a = asmt();
  const base = createInMemoryProductionRepository([a]);
  const engine = cargarEngine(cap);
  const deps = { engine, repository: scopeRepositoryToCapability(base, cap), knowledgeVersionId: "kv" };
  const acqs = (getRegisteredPack(cap).pack as { acquisitions: Acq[] }).acquisitions;
  const resp = (acquisitionId: string, semanticValue: string | null, extra: Record<string, unknown> = {}) =>
    casoUso.submitAcquisitionResponse(deps, {
      assessmentId: a.id,
      organizationId: a.organizationId,
      submittedBy: null,
      acquisitionId,
      knowledgeState: semanticValue === null ? "CONTRADICTORY" : "KNOWN",
      semanticValue,
      ...extra,
    });
  const evaluar = async () => (await casoUso.evaluarCapacidad(deps, a.id))!;
  const ws = async () => {
    const e = await evaluar();
    return createActionableProjector(getRegisteredPack(cap).pack).derive({
      engine,
      evaluation: e.evaluation,
      answeredAcquisitionIds: e.answeredAcquisitionIds,
    });
  };
  return { base, acqs, resp, evaluar, ws, a };
}

const progresivas = (acqs: Acq[]) => acqs.filter((x) => casoUso.esAdquisicionDeCapacidad(x));

describe("B1 · CM-05: preguntas progresivas distintas son complementarias", () => {
  it("no produce contradicción ni aclaración", async () => {
    const m = await montar("CM-05");
    const p = progresivas(m.acqs);
    expect(p.length).toBeGreaterThan(2);
    for (const [i, q] of p.slice(0, 3).entries()) expect((await m.resp(q.id, `respuesta ${i}`)).accepted).toBe(true);
    const e = await m.evaluar();
    expect(e.evaluation.contradictions).toHaveLength(0);
    expect(e.evaluation.variableStates.some((v) => v.state === "CONTRADICTORY")).toBe(false);
    const w = await m.ws();
    expect(JSON.stringify(w)).not.toMatch(/CONTRADICT/);
  });
});

describe("B2 · B3 · conservación y procedencia", () => {
  it("las respuestas y observaciones quedan persistidas con su adquisición", async () => {
    const m = await montar("CM-05");
    const p = progresivas(m.acqs).slice(0, 2);
    await m.resp(p[0]!.id, "texto A");
    await m.resp(p[1]!.id, "texto B");
    const obs = await m.base.listObservations(m.a.id);
    expect(obs.map((o) => o.value.semanticValue)).toEqual(["texto A", "texto B"]);
    expect(obs.map((o) => o.value.acquisitionRef)).toEqual([p[0]!.id, p[1]!.id]);
    const e = await m.evaluar();
    expect(e.answeredAcquisitionIds).toEqual(expect.arrayContaining([p[0]!.id, p[1]!.id]));
  });
  it("no declara satisfecha ninguna VA sin correspondencia gobernada", async () => {
    const m = await montar("CM-05");
    await m.resp(progresivas(m.acqs)[0]!.id, "texto A");
    const e = await m.evaluar();
    expect(e.evaluation.variableStates.some((v) => v.state === "KNOWN")).toBe(false);
  });
});

describe("B4 · contradicción real en la MISMA pregunta se conserva", () => {
  it("dos valores distintos para la misma pregunta progresiva → CONTRADICTORY", async () => {
    const m = await montar("CM-05");
    const q = progresivas(m.acqs)[0]!;
    await m.resp(q.id, "sí, existe");
    await m.resp(q.id, "no existe");
    const e = await m.evaluar();
    expect(e.evaluation.variableStates.some((v) => v.state === "CONTRADICTORY")).toBe(true);
  });
  it("CONTRADICTORY declarada explícitamente llega al Engine", async () => {
    const m = await montar("CM-05");
    const q = progresivas(m.acqs)[0]!;
    const r = await m.resp(q.id, null, { conflictingObservationIds: ["x", "y"] });
    expect(r.accepted).toBe(true);
    const e = await m.evaluar();
    expect(e.evaluation.variableStates.some((v) => v.state === "CONTRADICTORY")).toBe(true);
  });
});

describe("B5 · corrección resuelve la contradicción y preserva historial", () => {
  it("corregir una de las dos respuestas elimina el conflicto sin borrar filas", async () => {
    const m = await montar("CM-05");
    const q = progresivas(m.acqs)[0]!;
    await m.resp(q.id, "sí, existe");
    const r2 = await m.resp(q.id, "no existe");
    await m.resp(q.id, "sí, existe", { correctsObservationId: r2.observationId });
    expect(await m.base.listObservations(m.a.id)).toHaveLength(3);
    const e = await m.evaluar();
    expect(e.evaluation.variableStates.some((v) => v.state === "CONTRADICTORY")).toBe(false);
  });
});

describe("B6 · histórico: filas previas colapsadas en VA01 se reinterpretan sin migración", () => {
  it("lectura no destructiva", async () => {
    const m = await montar("CM-05");
    const p = progresivas(m.acqs).slice(0, 3);
    for (const [i, q] of p.entries()) await m.resp(q.id, `hist ${i}`);
    const obs = await m.base.listObservations(m.a.id);
    expect(new Set(obs.map((o) => o.variableRef)).size).toBe(1); // forma histórica (VA01)
    expect((await m.evaluar()).evaluation.contradictions).toHaveLength(0);
  });
});

describe("B7 · alcance VARIABLE intacto (OP-01)", () => {
  it("valores distintos sobre la misma VA siguen siendo contradicción", async () => {
    const m = await montar("OP-01");
    const q = m.acqs.find((x) => x.acquisitionMode === "QUESTION")!;
    await m.resp(q.id, "A");
    await m.resp(q.id, "B");
    expect((await m.evaluar()).evaluation.variableStates.some((v) => v.state === "CONTRADICTORY")).toBe(true);
  });
});

describe("B8 · las 31 capacidades", () => {
  it.each([...OFFICIAL_CAPABILITY_IDS])("%s: respuestas a preguntas distintas no generan contradicción artificial", async (cap) => {
    const m = await montar(cap);
    const qs = m.acqs.filter((x) => x.acquisitionMode === "QUESTION" || x.acquisitionMode === "CAPABILITY_PROGRESSIVE");
    const distintas = qs.filter((x, i) => !qs.slice(0, i).some((y) => y.variableRefs.some((v) => x.variableRefs.includes(v)) && !casoUso.esAdquisicionDeCapacidad(y)));
    for (const [i, q] of distintas.slice(0, 4).entries()) await m.resp(q.id, `v${i}`);
    expect((await m.evaluar()).evaluation.contradictions).toHaveLength(0);
  });
});
