/**
 * M1-M · Closure gate tests.
 *
 * No añaden funcionalidad: demuestran las propiedades que habilitan
 * industrializar el patrón productivo construido con OP-01.
 *
 * Cubren: independencia de MVP_ENGINE, ausencia de autoridad diagnóstica en el
 * frontend, engine sin branching semántico por capacidad, validación del schema
 * de todos los packs, pinning de KnowledgeVersion, reproducibilidad histórica,
 * lineage extremo a extremo, aislamiento cross-tenant, onboarding de una
 * capacidad sin copiar el engine y ausencia de secretos privilegiados en el
 * código versionado del frontend.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { createKnowledgeEngine, ENGINE_VERSION } from "@pymapa/knowledge-engine";
import { validateKnowledgePack } from "@pymapa/knowledge-schema";
import {
  createInMemoryProductionRepository,
  type AssessmentRecord,
  type MembershipRole,
} from "./puertos";
import {
  abrirValidacion,
  crearActividad,
  crearIntervencion,
  decidirValidacion,
  listFindings,
  marcarActividadDone,
  registrarCasoValidacion,
  registrarEntregable,
  registrarRequisitoValidacion,
  decidirRecommendationCandidate,
  submitAcquisitionResponse,
  type ProductionDeps,
} from "./caso-uso";

const RAIZ = process.cwd();
const SRC = join(RAIZ, "src");

function archivos(dir: string, extensiones = [".ts", ".tsx"]): string[] {
  const salida: string[] = [];
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) {
      if (entrada === "node_modules") continue;
      salida.push(...archivos(ruta, extensiones));
    } else if (extensiones.some((e) => entrada.endsWith(e))) {
      salida.push(ruta);
    }
  }
  return salida;
}

const rel = (ruta: string) => relative(RAIZ, ruta).replace(/\\/g, "/");
const ARCHIVOS_SRC = archivos(SRC);
const leer = (ruta: string) => readFileSync(ruta, "utf8");

/** Módulos que componen el vertical productivo de OP-01. */
const VERTICAL_PRODUCTIVO = [
  "src/lib/production/caso-uso.ts",
  "src/lib/production/puertos.ts",
  "src/lib/production/runtime.server.ts",
  "src/lib/production/op01.functions.ts",
  "src/services/production/production-client.ts",
  "src/services/production/execution-source.ts",
  "src/services/production/assessment-client.ts",
];

describe("M1-M · 5 · OP-01 productivo es independiente de MVP_ENGINE", () => {
  it("ningún módulo del vertical productivo importa el motor del MVP ni sus reglas", () => {
    const infractores = VERTICAL_PRODUCTIVO.filter((ruta) =>
      /from "(@\/)?(\.\.\/)*(src\/)?lib\/(motor|diagnostico|resultados|suficiencia)/.test(
        leer(join(RAIZ, ruta)),
      ),
    );
    expect(infractores).toEqual([]);
  });

  it("el vertical productivo no usa mocks, demo state ni localStorage", () => {
    const infractores = VERTICAL_PRODUCTIVO.filter((ruta) =>
      /localStorage|data\/mocks|use-local-storage|sesionDemo|modo-demo/.test(leer(join(RAIZ, ruta))),
    );
    expect(infractores).toEqual([]);
  });

  it("MVP_ENGINE sigue existiendo y gobernando lo no migrado", () => {
    expect(statSync(join(SRC, "lib", "motor", "motor.ts")).isFile()).toBe(true);
  });
});

describe("M1-M · 4 · el frontend no tiene autoridad diagnóstica", () => {
  const FRONTEND = ARCHIVOS_SRC.filter((ruta) => {
    const r = rel(ruta);
    return (
      (r.startsWith("src/routes/") || r.startsWith("src/components/") || r.startsWith("src/hooks/")) &&
      !r.endsWith(".test.ts") &&
      !r.endsWith(".test.tsx")
    );
  });

  it("ningún archivo de frontend importa el caso de uso, los puertos ni el runtime productivos", () => {
    const infractores = FRONTEND.filter((ruta) =>
      /production\/(caso-uso|puertos|runtime\.server)/.test(leer(ruta)),
    );
    expect(infractores.map(rel)).toEqual([]);
  });

  it("ningún archivo de frontend importa el cliente con service role", () => {
    const infractores = FRONTEND.filter((ruta) => /client\.server/.test(leer(ruta)));
    expect(infractores.map(rel)).toEqual([]);
  });

  it("la pantalla productiva de OP-01 solo habla con el boundary y el cliente productivo", () => {
    const fuente = leer(join(SRC, "routes", "_authenticated", "capacidad.op-01.tsx"));
    expect(fuente).toMatch(/from "@\/lib\/production\/op01\.functions"/);
    expect(fuente).toMatch(/from "@\/services\/production"/);
    // No produce decisiones: no calcula suficiencia, confianza ni findings.
    expect(fuente).not.toMatch(/function (calcular|derivar|evaluar)(Suficiencia|Confianza|Finding)/);
  });
});

describe("M1-M · 3 · engine genérico sin branching semántico por capacidad", () => {
  const ENGINE = join(RAIZ, "packages", "knowledge-engine", "src", "index.ts");
  const SCHEMA = join(RAIZ, "packages", "knowledge-schema", "src", "index.ts");

  it("el engine no compara ningún identificador de capacidad concreto", () => {
    const fuente = leer(ENGINE).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
    expect(fuente).not.toMatch(/capabilityId\s*===/);
    expect(fuente).not.toMatch(/"OP-0\d"/);
  });

  it("el schema tampoco conoce capacidades concretas", () => {
    const fuente = leer(SCHEMA).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
    expect(fuente).not.toMatch(/"OP-0\d"/);
  });

  it("el engine expone las primitivas genéricas requeridas", () => {
    const pack = JSON.parse(
      leer(join(RAIZ, "knowledge", "packs", "op-01", "1.0.0", "pack.json")),
    ) as unknown;
    const engine = createKnowledgeEngine(pack);
    for (const primitiva of [
      "listAcquisitions",
      "evaluate",
      "getNextAcquisition",
      "getRecommendationCandidates",
      "listActivityIdentities",
      "listValidationRequirements",
      "evaluateValidationRequirement",
      "compareVariableStates",
    ] as const) {
      expect(typeof engine[primitiva]).toBe("function");
    }
  });
});

describe("M1-M · 10/11 · onboarding de una capacidad no requiere copiar el engine", () => {
  const packOp01 = JSON.parse(
    leer(join(RAIZ, "knowledge", "packs", "op-01", "1.0.0", "pack.json")),
  ) as Record<string, unknown>;

  /**
   * Fixture ESTRUCTURAL: se reutiliza el pack gobernado cambiando únicamente el
   * identificador de capacidad. No introduce conocimiento nuevo ni se publica
   * como KnowledgeVersion; solo demuestra que el engine es agnóstico del id.
   */
  const packFixture = {
    ...packOp01,
    packId: "fixture-cap",
    capability: {
      ...(packOp01["capability"] as Record<string, unknown>),
      id: "FIXTURE-CAP",
    },
  };

  it("el mismo engine interpreta otro pack sin cambios de código", () => {
    const engine = createKnowledgeEngine(packFixture);
    expect(engine.pack.capability.id).toBe("FIXTURE-CAP");
    expect(engine.engineVersion).toBe(ENGINE_VERSION);
    expect(engine.listAcquisitions().length).toBeGreaterThan(0);
    const evaluacion = engine.evaluate({ observations: [], knowledgeVersionId: "kv-fixture" });
    expect(engine.getNextAcquisition(evaluacion)).not.toBeNull();
  });

  it("todos los packs del repositorio validan contra el schema gobernado", () => {
    const dir = join(RAIZ, "knowledge", "packs");
    const packs = archivos(dir, [".json"]).filter((r) => r.endsWith("pack.json"));
    expect(packs.length).toBeGreaterThan(0);
    for (const ruta of packs) {
      const resultado = validateKnowledgePack(JSON.parse(leer(ruta)));
      const detalle = resultado.ok ? "" : JSON.stringify(resultado.issues);
      expect(resultado.ok, `${rel(ruta)}: ${detalle}`).toBe(true);
    }
  });


  it("el runtime resuelve los packs por registro, no por capacidad hardcodeada", () => {
    const fuente = leer(join(SRC, "lib", "production", "runtime.server.ts"));
    expect(fuente).toMatch(/PACKS_REGISTRADOS/);
    expect(fuente).toMatch(/KNOWLEDGE_PACK_NOT_REGISTERED/);
  });
});

describe("M1-M · 13 · ausencia de secretos privilegiados en código versionado", () => {
  it("ningún archivo del frontend lee la clave de servicio", () => {
    const infractores = ARCHIVOS_SRC.filter((ruta) => {
      const r = rel(ruta);
      if (r.includes("integrations/supabase")) return false; // cliente server-only generado
      if (r.endsWith(".test.ts")) return false;
      return /SUPABASE_SERVICE_ROLE_KEY|SUPABASE_DB_URL/.test(leer(ruta));
    });
    expect(infractores.map(rel)).toEqual([]);
  });

  it("no hay claves secretas literales en el repositorio versionado", () => {
    const sospechosos = [...ARCHIVOS_SRC, join(RAIZ, "vite.config.ts")].filter((ruta) =>
      /sb_secret_[A-Za-z0-9]/.test(leer(ruta)),
    );
    expect(sospechosos.map(rel)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Auditorías 7 y 8: pinning, reproducibilidad y lineage sobre el caso de uso.
// ---------------------------------------------------------------------------

const KV_A = "kv-op01-1.0.0";
const packRaw = JSON.parse(
  leer(join(RAIZ, "knowledge", "packs", "op-01", "1.0.0", "pack.json")),
) as Record<string, unknown>;

const MEMBRESIAS: { organizationId: string; userId: string; role: MembershipRole }[] = [
  { organizationId: "org-1", userId: "user-1", role: "OWNER" },
];

function assessment(): AssessmentRecord {
  return {
    id: "assess-1",
    organizationId: "org-1",
    caseId: "case-1",
    knowledgeVersionId: KV_A,
    type: "BASELINE",
    startedAt: "2026-01-01T00:00:00.000Z",
    closedAt: null,
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("M1-M · 7/8 · pinning, reproducibilidad y lineage extremo a extremo", () => {
  let repository: ReturnType<typeof createInMemoryProductionRepository>;
  let deps: ProductionDeps;

  beforeEach(() => {
    repository = createInMemoryProductionRepository([assessment()], MEMBRESIAS);
    deps = {
      engine: createKnowledgeEngine(packRaw),
      repository,
      knowledgeVersionId: KV_A,
    } as ProductionDeps;
  });

  it("cada EvaluationRun registra KnowledgeVersion y EngineVersion", async () => {
    await submitAcquisitionResponse(deps, {
      assessmentId: "assess-1",
      organizationId: "org-1",
      submittedBy: "user-1",
      acquisitionId: "OP01-P01",
      knowledgeState: "KNOWN",
      semanticValue: "Implícita",
    });
    const runs = await repository.listEvaluationRuns("assess-1");
    expect(runs.length).toBeGreaterThan(0);
    for (const run of runs) {
      expect(run.knowledgeVersionId).toBe(KV_A);
      expect(run.engineVersion).toBe(ENGINE_VERSION);
    }
  });

  it("una KnowledgeVersion distinta a la fijada no puede evaluar el Assessment", async () => {
    const otros = { ...deps, knowledgeVersionId: "kv-op01-1.1.0" } as ProductionDeps;
    const salida = await submitAcquisitionResponse(otros, {
      assessmentId: "assess-1",
      organizationId: "org-1",
      submittedBy: "user-1",
      acquisitionId: "OP01-P01",
      knowledgeState: "KNOWN",
      semanticValue: "Implícita",
    });
    expect(salida.accepted).toBe(false);
    expect(salida.rejectionReason).toBe("KNOWLEDGE_VERSION_MISMATCH");
  });

  it("el recorrido completo conserva lineage desde Response hasta Validation", async () => {
    await submitAcquisitionResponse(deps, {
      assessmentId: "assess-1",
      organizationId: "org-1",
      submittedBy: "user-1",
      acquisitionId: "OP01-P01",
      knowledgeState: "KNOWN",
      semanticValue: "Implícita",
    });

    const finding = (await listFindings(deps, "assess-1"))[0]!;
    expect(finding.knowledgeVersionId).toBe(KV_A);
    expect(finding.engineVersion).toBe(ENGINE_VERSION);
    expect(finding.evaluationRunId).toBeTruthy();
    const obsLinks = await repository.listFindingObservationLinks(finding.id);
    expect(obsLinks.length).toBeGreaterThan(0);

    await revisarFinding(deps, {
      findingId: finding.id,
      decision: "CONFIRMED",
      reviewedBy: "user-1",
    });
    const registrada = await registrarRecommendationCandidate(deps, {
      assessmentId: "assess-1",
      organizationId: "org-1",
      recommendationRef: "R01",
      findingId: finding.id,
      createdBy: "user-1",
    });
    const recomendacion = registrada.candidate!;
    expect(recomendacion.findingId).toBe(finding.id);
    const decidida = await decidirRecommendationCandidate(deps, {
      recommendationCandidateId: recomendacion.id,
      decision: "SELECTED",
      decidedBy: "user-1",
      note: "Decisión humana registrada",
    });
    expect(decidida.candidate!.status).toBe("SELECTED");


    const intervencionOut = await crearIntervencion(deps, {
      assessmentId: "assess-1",
      organizationId: "org-1",
      title: "Formalizar la forma de trabajo",
      findingId: finding.id,
      recommendationCandidateId: recomendacion.id,
      selectionNote: "Selección humana registrada",
      createdBy: "user-1",
    });
    const intervencion = intervencionOut.intervention!;
    expect(intervencion.findingId).toBe(finding.id);
    expect(intervencion.recommendationCandidateId).toBe(recomendacion.id);

    const actividadOut = await crearActividad(deps, {
      organizationId: "org-1",
      interventionId: intervencion.id,
      title: "Entrenar al segundo ejecutor",
      activityRef: "A04",
      createdBy: "user-1",
    });
    const actividad = actividadOut.activity!;

    const entregable = await registrarEntregable(deps, {
      activityId: actividad.id,
      organizationId: "org-1",
      title: "Guía de la tarea",
      registeredBy: "user-1",
    });
    expect(entregable.deliverable!.activityId).toBe(actividad.id);

    const done = await marcarActividadDone(deps, {
      activityId: actividad.id,
      actorUserId: "user-1",
    });
    expect(done.activity!.doneAt).not.toBeNull();

    const requisitoOut = await registrarRequisitoValidacion(deps, {
      activityId: actividad.id,
      primaryExecutorRespondentId: "resp-1",
      createdBy: "user-1",
    });
    const requisito = requisitoOut.requirement!;
    expect(requisito.requirementRef).toBe("CRV-A04-01");
    expect(requisito.knowledgeVersionId).toBe(KV_A);
    expect(requisito.engineVersion).toBe(ENGINE_VERSION);

    for (const i of [1, 2, 3]) {
      await registrarCasoValidacion(deps, {
        validationRequirementId: requisito.id,
        executorRespondentId: "resp-2",
        outcome: "CORRECT",
        criticalAssistance: false,
        registeredBy: "user-1",
        occurredAt: `2026-02-0${i}T00:00:00.000Z`,
      });
    }

    const abierta = await abrirValidacion(deps, {
      activityId: actividad.id,
      actorUserId: "user-1",
    });
    const validada = await decidirValidacion(deps, {
      validationId: abierta.validation!.id,
      decision: "VALIDATED",
      reason: "CRV satisfecho con tres casos consecutivos",
      reviewedBy: "user-1",
    });

    const validation = validada.validation!;
    expect(validation.status).toBe("VALIDATED");
    expect(validation.activityId).toBe(actividad.id);
    expect(validation.interventionId).toBe(intervencion.id);
    expect(validation.validationRequirementId).toBe(requisito.id);
    expect(validation.knowledgeVersionId).toBe(KV_A);
    expect(validation.engineVersion).toBe(ENGINE_VERSION);
    expect(validation.reviewedBy).toBe("user-1");
  });

  it("aislamiento cross-tenant: cada tabla productiva restringe por membresía", () => {
    const dir = join(RAIZ, "supabase", "migrations");
    const sql = archivos(dir, [".sql"])
      .map((ruta) => leer(ruta))
      .join("\n")
      .toLowerCase();
    for (const tabla of [
      "findings",
      "interventions",
      "activities",
      "deliverables",
      "validation_requirements",
      "validations",
      "follow_ups",
      "learning_candidates",
      "assessment_snapshots",
    ]) {
      expect(sql, tabla).toContain(`alter table public.${tabla} enable row level security`);
    }
    expect(sql).toContain("private.is_organization_member");
    // Ninguna política abierta a cualquier usuario autenticado.
    expect(sql).not.toMatch(/to authenticated\s+using \(true\)/);
  });
});

