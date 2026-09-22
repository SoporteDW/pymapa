/**
 * M2-OP02-03 · Persistencia de `findingsAwaitingResolution`.
 *
 * La proyección del engine sobrevive a la persistencia y a la recarga por
 * EvaluationRun, conserva motivo, observaciones, evidencias, lineage y
 * requisito de adquisición/aclaración, y NUNCA se persiste como Finding.
 * Capability-neutral: el mismo caso de uso corre con OP-01 y con OP-02.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { createKnowledgeEngine, type EngineObservation } from "@pymapa/knowledge-engine";
import { generatePackCandidate } from "@pymapa/knowledge-pipeline";
import { createInMemoryProductionRepository, type AssessmentRecord, type ObservationRecord } from "./puertos";
import {
  getAssessmentState,
  listFindings,
  listFindingsAwaitingResolution,
  registrarEvidencia,
  submitAcquisitionResponse,
  type ProductionDeps,
} from "./caso-uso";

const RAIZ = process.cwd();
const op01Pack = JSON.parse(
  readFileSync(join(RAIZ, "knowledge", "packs", "op-01", "1.0.0", "pack.json"), "utf8"),
) as Record<string, unknown>;
const op02Source = JSON.parse(
  readFileSync(join(RAIZ, "knowledge", "master", "v1.0", "capabilities", "OP-02", "source.json"), "utf8"),
);
const op02Generado = generatePackCandidate(op02Source);
if (!op02Generado.ok) throw new Error("OP-02 no genera candidato");
const op02Pack = op02Generado.candidate.pack as Record<string, unknown>;

const KV = "kv-test";
const assessment = (): AssessmentRecord => ({
  id: "assess-1",
  organizationId: "org-1",
  caseId: "case-1",
  knowledgeVersionId: KV,
  type: "BASELINE",
  startedAt: "2026-01-01T00:00:00.000Z",
  closedAt: null,
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const clonar = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** Proyección persistida → forma del engine, para comparar sin pérdida. */
const aProyeccion = (f: {
  findingRef: string;
  status: string;
  variableStates: unknown;
  unresolvedStates: unknown;
  observationIds: unknown;
  evidenceIds: unknown;
  resolutionRequirement: string;
  resolutionAcquisitionRefs: unknown;
  reason: string;
}) => ({
  findingRef: f.findingRef,
  status: f.status,
  variableStates: f.variableStates,
  unresolvedStates: f.unresolvedStates,
  observationIds: f.observationIds,
  evidenceIds: f.evidenceIds,
  resolution: { requirement: f.resolutionRequirement, acquisitionRefs: f.resolutionAcquisitionRefs },
  reason: f.reason,
});

function aEngine(filas: ObservationRecord[]): EngineObservation[] {
  return filas.map((o) => ({
    id: o.id,
    variableRef: o.variableRef,
    acquisitionRef: o.value.acquisitionRef,
    knowledgeState: o.value.knowledgeState,
    semanticValue: o.value.semanticValue,
    sourceResponseId: o.sourceResponseId,
    respondentId: o.respondentId ?? null,
    evidenceIds: [],
    notApplicableReason: o.value.notApplicableReason ?? null,
    ...(o.value.conflictingObservationIds ? { conflictingObservationIds: o.value.conflictingObservationIds } : {}),
    recordedAt: o.createdAt,
  }));
}

const CAPACIDADES = [
  { nombre: "OP-01 (Golden)", pack: op01Pack },
  { nombre: "OP-02", pack: op02Pack },
] as const;

for (const cap of CAPACIDADES) {
  describe(`M2-OP02-03 · findingsAwaitingResolution persistido · ${cap.nombre}`, () => {
    let repository: ReturnType<typeof createInMemoryProductionRepository>;
    let deps: ProductionDeps;
    const engine = createKnowledgeEngine(cap.pack);
    // Primera adquisición cuyas variables alimentan algún finding del pack.
    const findingsPack = (cap.pack["findings"] ?? []) as { id: string; variableRefs?: string[] }[];
    const adquisicion = engine
      .listAcquisitions()
      .find((a) => a.variableRefs.some((v) => findingsPack.some((f) => (f.variableRefs ?? []).includes(v))))!;
    // Primer estado semántico aprobado por el pack para la variable (sin inventar).
    const variablesPack = (cap.pack["variables"] ?? []) as { id: string; semanticStates?: string[] }[];
    const valorAprobado =
      variablesPack.find((v) => v.id === adquisicion.variableRefs[0])?.semanticStates?.[0] ?? "declaración";
    const base = {
      assessmentId: "assess-1",
      organizationId: "org-1",
      submittedBy: "user-1",
      acquisitionId: adquisicion.id,
    } as const;

    beforeEach(() => {
      repository = createInMemoryProductionRepository([assessment()]);
      deps = { engine, repository, knowledgeVersionId: KV, hashToken: (t) => `sha256:${t}` };
    });

    it("UNKNOWN: persiste AWAITING_INFORMATION con requisito de adquisición y lineage", async () => {
      const r = await submitAcquisitionResponse(deps, { ...base, knowledgeState: "UNKNOWN" });
      expect(r.accepted).toBe(true);
      const vivo = r.state!.findingsAwaitingResolution;
      expect(vivo.length).toBeGreaterThan(0);

      const recargado = await listFindingsAwaitingResolution(deps, "assess-1");
      expect(recargado.evaluationRunId).toBe(r.evaluationRunId);
      expect(recargado.items.map(aProyeccion)).toEqual(clonar(vivo));
      for (const f of recargado.items) {
        expect(f.status).toBe("AWAITING_INFORMATION");
        expect(f.unresolvedStates).toEqual(["UNKNOWN"]);
        expect(f.resolutionRequirement).toBe("INFORMATION_REQUIRED");
        expect(f.resolutionAcquisitionRefs).toContain(adquisicion.id);
        expect(f.observationIds).toEqual([r.observationId]);
        expect(f.evaluationRunId).toBe(r.evaluationRunId);
        expect(f.knowledgeVersionId).toBe(KV);
        expect(f.capabilityId).toBe(engine.pack.capability.id);
        expect(f.detail?.["notAFinding"]).toBe(true);
        expect(f.detail?.["traceability"]).toMatchObject({
          knowledgePackId: engine.pack.packId,
          knowledgePackVersion: engine.pack.packVersion,
          engineVersion: engine.engineVersion,
          knowledgeVersionId: KV,
        });
      }
      // Nunca se persiste como Finding ni como conclusión adversa.
      const findings = await listFindings(deps, "assess-1");
      const pendientes = new Set(recargado.items.map((f) => f.findingRef));
      expect(findings.filter((f) => pendientes.has(f.findingRef))).toEqual([]);
    });

    it("NOT_APPLICABLE: persiste EXCLUDED_NOT_APPLICABLE sin requisito de adquisición", async () => {
      await submitAcquisitionResponse(deps, {
        ...base,
        knowledgeState: "NOT_APPLICABLE",
        notApplicableReason: "no aplica al caso",
      });
      const { items } = await listFindingsAwaitingResolution(deps, "assess-1");
      expect(items.length).toBeGreaterThan(0);
      items.forEach((f) => {
        expect(f.status).toBe("EXCLUDED_NOT_APPLICABLE");
        expect(f.unresolvedStates).toEqual(["NOT_APPLICABLE"]);
        expect(f.resolutionRequirement).toBe("NONE_EXCLUDED_BY_APPLICABILITY");
        expect(f.resolutionAcquisitionRefs).toEqual([]);
      });
      expect(await listFindings(deps, "assess-1")).toEqual([]);
    });

    it("CONTRADICTORY: persiste BLOCKED_BY_CONTRADICTION con las aclaraciones declaradas por el pack", async () => {
      const r = await submitAcquisitionResponse(deps, {
        ...base,
        knowledgeState: "CONTRADICTORY",
        conflictingObservationIds: ["externa-a", "externa-b"],
      });
      const vivo = r.state!.findingsAwaitingResolution;
      const { items } = await listFindingsAwaitingResolution(deps, "assess-1");
      expect(items.map(aProyeccion)).toEqual(clonar(vivo));
      const aclaraciones = [...new Set(r.state!.contradictions.flatMap((c) => c.clarificationAcquisitionRefs))];
      items.forEach((f) => {
        expect(f.status).toBe("BLOCKED_BY_CONTRADICTION");
        expect(f.unresolvedStates).toContain("CONTRADICTORY");
        expect(f.resolutionRequirement).toBe("CLARIFICATION_REQUIRED");
        expect(f.resolutionAcquisitionRefs).toEqual(aclaraciones);
      });
      expect(await listFindings(deps, "assess-1")).toEqual([]);
    });

    it("conserva las evidencias vinculadas a las observaciones no resueltas", async () => {
      const r = await submitAcquisitionResponse(deps, { ...base, knowledgeState: "UNKNOWN" });
      const ev = await registrarEvidencia(deps, {
        assessmentId: "assess-1",
        organizationId: "org-1",
        caseId: "case-1",
        submittedBy: "user-1",
        evidenceType: "DOCUMENT",
        source: "DOCUMENT",
        title: "doc",
        observationIds: [r.observationId!],
      } as Parameters<typeof registrarEvidencia>[1]);
      expect(ev.evidence.id).toBeTruthy();
      const { items, evaluationRunId } = await listFindingsAwaitingResolution(deps, "assess-1");
      expect(evaluationRunId).not.toBe(r.evaluationRunId);
      expect(items.length).toBeGreaterThan(0);
      items.forEach((f) => expect(f.evidenceIds).toEqual([ev.evidence.id]));
    });

    it("resolución en un EvaluationRun posterior sin reescribir el histórico", async () => {
      const r1 = await submitAcquisitionResponse(deps, { ...base, knowledgeState: "UNKNOWN" });
      const run1 = await listFindingsAwaitingResolution(deps, "assess-1");
      const run1Congelado = clonar(run1.items);
      const observacionesRun1 = clonar(await repository.listObservations("assess-1"));

      // La persona resuelve UNKNOWN → KNOWN con una nueva respuesta.
      const r2 = await submitAcquisitionResponse(deps, {
        ...base,
        knowledgeState: "KNOWN",
        semanticValue: valorAprobado,
      });
      expect(r2.rejectionReason).toBeUndefined();
      expect(r2.evaluationRunId).not.toBe(r1.evaluationRunId);
      const run2 = await listFindingsAwaitingResolution(deps, "assess-1");
      expect(run2.evaluationRunId).toBe(r2.evaluationRunId);
      expect(run2.items.map(aProyeccion)).toEqual(clonar(r2.state!.findingsAwaitingResolution));
      // Los que se resolvieron ya no quedan pendientes en el run posterior.
      const resueltos = run1.items
        .map((f) => f.findingRef)
        .filter((ref) => !run2.items.some((g) => g.findingRef === ref));
      const variable = r2.state!.variableStates.find((v) => adquisicion.variableRefs.includes(v.variableRef));
      expect(variable?.state).toBe("KNOWN");
      expect(resueltos.length).toBeGreaterThan(0);
      // Lo resuelto se materializa como candidato en el run posterior, nunca confirmado.
      const findingsRun2 = (await listFindings(deps, "assess-1")).filter((f) => resueltos.includes(f.findingRef));
      expect(findingsRun2.length).toBeGreaterThan(0);
      findingsRun2.forEach((f) => {
        expect(f.evaluationRunId).toBe(r2.evaluationRunId);
        expect(f.lifecycleState).not.toBe("CONFIRMED");
      });

      // El run histórico permanece intacto y recargable por su id.
      const historico = await listFindingsAwaitingResolution(deps, "assess-1", {
        evaluationRunId: r1.evaluationRunId!,
      });
      expect(historico.items).toEqual(run1Congelado);

      // Reproducibilidad: re-evaluar las observaciones del run 1 reproduce lo persistido.
      const reevaluado = engine.evaluate({ observations: aEngine(observacionesRun1), knowledgeVersionId: KV });
      expect(historico.items.map(aProyeccion)).toEqual(clonar(reevaluado.findingsAwaitingResolution));
    });

    it("un run no puede reescribir la proyección de otro (append-only)", async () => {
      const r = await submitAcquisitionResponse(deps, { ...base, knowledgeState: "UNKNOWN" });
      const { items } = await listFindingsAwaitingResolution(deps, "assess-1");
      await expect(
        repository.insertFindingResolutionStates([{ ...items[0]!, evaluationRunId: r.evaluationRunId! }]),
      ).rejects.toThrow(/duplicado/);
      expect(() => {
        (items[0] as { status: string }).status = "CONFIRMED";
      }).toThrow();
    });

    it("la recarga del estado de caso refleja la misma proyección que el último run", async () => {
      await submitAcquisitionResponse(deps, { ...base, knowledgeState: "UNKNOWN" });
      const estado = await getAssessmentState(deps, "assess-1");
      const { items } = await listFindingsAwaitingResolution(deps, "assess-1");
      expect(items.map(aProyeccion)).toEqual(clonar(estado!.findingsAwaitingResolution));
    });
  });
}

describe("M2-OP02-03 · run inexistente o sin runs", () => {
  it("no inventa proyecciones", async () => {
    const repository = createInMemoryProductionRepository([assessment()]);
    const deps: ProductionDeps = { engine: createKnowledgeEngine(op01Pack), repository, knowledgeVersionId: KV };
    expect(await listFindingsAwaitingResolution(deps, "assess-1")).toEqual({ evaluationRunId: null, items: [] });
    expect(
      await listFindingsAwaitingResolution(deps, "assess-1", { evaluationRunId: "run-ajeno" }),
    ).toEqual({ evaluationRunId: null, items: [] });
  });
});

describe("M2-OP02-03 · base de datos y RLS", () => {
  const sql = readdirSync(join(RAIZ, "supabase", "migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => readFileSync(join(RAIZ, "supabase", "migrations", f), "utf8"))
    .join("\n")
    .toLowerCase();

  it("tabla propia, separada de findings, con RLS y solo lectura para miembros", () => {
    expect(sql).toContain("create table public.finding_resolution_states");
    expect(sql).toContain("alter table public.finding_resolution_states enable row level security");
    expect(sql).toContain("grant select on public.finding_resolution_states to authenticated");
    expect(sql).toContain("grant all on public.finding_resolution_states to service_role");
    expect(sql).not.toMatch(/grant[^;]*on public\.finding_resolution_states to anon/);
    // Los privilegios por defecto del esquema se retiran explícitamente.
    expect(sql).toContain("revoke all on public.finding_resolution_states from anon");
    expect(sql).toContain(
      "revoke insert, update, delete, truncate, references, trigger on public.finding_resolution_states from authenticated",
    );
    expect(sql).toMatch(
      /create policy "finding_resolution_states_select_members" on public\.finding_resolution_states\s+for select to authenticated using \(private\.is_organization_member\(organization_id\)\)/,
    );
    expect(sql).not.toMatch(/on public\.finding_resolution_states\s+for (insert|update|delete|all)/);
    expect(sql).not.toMatch(/on public\.finding_resolution_states[^;]*using \(true\)/);
  });

  it("estados y requisitos acotados; sin ciclo de vida de Finding; histórico inmutable", () => {
    const tabla = sql.slice(sql.indexOf("create table public.finding_resolution_states"));
    const definicion = tabla.slice(0, tabla.indexOf(");\ncreate index"));
    expect(definicion).toContain("'awaiting_information', 'excluded_not_applicable', 'blocked_by_contradiction'");
    expect(definicion).toContain("resolution_requirement = 'clarification_required'");
    expect(definicion).not.toMatch(/lifecycle_state|severity|polarity|confirmed/);
    expect(definicion).toContain("unique (evaluation_run_id, finding_ref)");
    expect(sql).toContain("before update on public.finding_resolution_states");
    expect(sql).toContain("finding_resolution_state_immutable");
  });
});
