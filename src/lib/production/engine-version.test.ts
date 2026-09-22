/**
 * M2-FACTORY-01 · A1/A2 — Versión del engine 0.2.0 y reproducibilidad histórica.
 *
 * - Los EvaluationRuns nuevos registran pymapa-knowledge-engine/0.2.0.
 * - Los EvaluationRuns históricos (0.1.0) no se recalculan ni se reetiquetan.
 * - La versión del engine es independiente de la versión del Knowledge Pack.
 * - La base de datos protege engine_version/knowledge_version_id con un trigger.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ENGINE_SEMANTIC_HISTORY,
  ENGINE_SEMVER,
  ENGINE_VERSION,
  createKnowledgeEngine,
} from "@pymapa/knowledge-engine";
import {
  createInMemoryProductionRepository,
  type AssessmentRecord,
  type EvaluationRunRecord,
} from "./puertos";
import { submitAcquisitionResponse, type ProductionDeps } from "./caso-uso";

const RAIZ = process.cwd();
const pack = JSON.parse(
  readFileSync(join(RAIZ, "knowledge", "packs", "op-01", "1.0.0", "pack.json"), "utf8"),
) as Record<string, unknown>;

const assessment = (): AssessmentRecord => ({
  id: "assess-1",
  organizationId: "org-1",
  caseId: "case-1",
  knowledgeVersionId: "kv-1",
  type: "BASELINE",
  startedAt: "2026-01-01T00:00:00.000Z",
  closedAt: null,
  updatedAt: "2026-01-01T00:00:00.000Z",
});

describe("A1 · engine 0.2.0", () => {
  it("versión y semver alineados, package.json coherente", () => {
    expect(ENGINE_SEMVER).toBe("0.2.0");
    expect(ENGINE_VERSION).toBe("pymapa-knowledge-engine/0.2.0");
    const pkg = JSON.parse(
      readFileSync(join(RAIZ, "packages", "knowledge-engine", "package.json"), "utf8"),
    ) as { version: string };
    expect(pkg.version).toBe(ENGINE_SEMVER);
  });

  it("historial semántico: 0.1.0 base + 0.2.0 con cambios genéricos (sin identificadores de capacidad)", () => {
    expect(ENGINE_SEMANTIC_HISTORY.map((v) => v.version)).toEqual(["0.1.0", "0.2.0"]);
    const v2 = ENGINE_SEMANTIC_HISTORY[1]!;
    expect(v2.changes.map((c) => c.id)).toEqual([
      "ENG-0.2-01",
      "ENG-0.2-02",
      "ENG-0.2-03",
      "ENG-0.2-04",
      "ENG-0.2-05",
      "ENG-0.2-06",
      "ENG-0.2-07",
      "ENG-0.2-08",
    ]);
    const texto = JSON.stringify(ENGINE_SEMANTIC_HISTORY);
    expect(texto).not.toMatch(/\b[A-Z]{2}-\d{2}\b/);
  });

  it("la versión del engine es independiente de la versión del pack", () => {
    const engine = createKnowledgeEngine(pack);
    expect(engine.engineVersion).toBe(ENGINE_VERSION);
    expect(engine.pack.packVersion).toBe("1.0.0");
  });
});

describe("A2 · reproducibilidad histórica", () => {
  it("un run nuevo registra 0.2.0; el run histórico 0.1.0 permanece intacto", async () => {
    const repository = createInMemoryProductionRepository([assessment()]);
    const runs = repository.estado["runs"] as EvaluationRunRecord[];
    const historico: EvaluationRunRecord = {
      id: "run-historico",
      organizationId: "org-1",
      assessmentId: "assess-1",
      knowledgeVersionId: "kv-1",
      engineVersion: "pymapa-knowledge-engine/0.1.0",
      trigger: "RESPONSE_ACCEPTED",
      status: "PROCESSED",
      startedAt: "2025-12-01T00:00:00.000Z",
      completedAt: "2025-12-01T00:00:01.000Z",
      createdAt: "2025-12-01T00:00:00.000Z",
    } as EvaluationRunRecord;
    runs.push(historico);
    const copia = JSON.parse(JSON.stringify(historico)) as EvaluationRunRecord;

    const engine = createKnowledgeEngine(pack);
    const deps: ProductionDeps = {
      engine,
      repository,
      knowledgeVersionId: "kv-1",
      hashToken: (t) => `sha256:${t}`,
    };
    const acq = engine.listAcquisitions()[0]!;
    const r = await submitAcquisitionResponse(deps, {
      assessmentId: "assess-1",
      organizationId: "org-1",
      submittedBy: "user-1",
      acquisitionId: acq.id,
      knowledgeState: "UNKNOWN",
    });
    expect(r.accepted).toBe(true);

    expect(runs.find((x) => x.id === "run-historico")).toEqual(copia);
    const nuevos = runs.filter((x) => x.id !== "run-historico");
    expect(nuevos.length).toBeGreaterThan(0);
    nuevos.forEach((x) => expect(x.engineVersion).toBe("pymapa-knowledge-engine/0.2.0"));
  });

  it("el adaptador de producción nunca actualiza engine_version de evaluation_runs", () => {
    const src = readFileSync(join(RAIZ, "src", "lib", "production", "runtime.server.ts"), "utf8");
    const updates = [...src.matchAll(/from\("evaluation_runs"\)\s*\.update\(([^)]*)\)/g)].map(
      (m) => m[1] ?? "",
    );
    updates.forEach((u) => expect(u).not.toMatch(/engine_version|knowledge_version_id/));
  });

  it("migración: trigger de inmutabilidad de lineage en evaluation_runs", () => {
    const dir = join(RAIZ, "supabase", "migrations");
    const sql = readdirSync(dir)
      .map((f) => readFileSync(join(dir, f), "utf8"))
      .find((s) => s.includes("evaluation_runs_lineage_immutable"));
    expect(sql).toBeDefined();
    expect(sql).toMatch(/EVALUATION_RUN_ENGINE_VERSION_IMMUTABLE/);
    expect(sql).toMatch(/EVALUATION_RUN_KNOWLEDGE_VERSION_IMMUTABLE/);
    expect(sql).toMatch(/before update/i);
  });
});
