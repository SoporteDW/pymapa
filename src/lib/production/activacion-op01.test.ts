/**
 * M1-D2 · Acceptance tests de la activación autenticada del vertical OP-01.
 *
 * Cubre: sesión requerida, membership requerido, aislamiento entre
 * organizaciones, pinning de KnowledgeVersion, ruteo de ejecución, P01 servida
 * por el Knowledge Pack, EvaluationRun producido por el envío productivo y
 * ausencia de credenciales privilegiadas en el frontend.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { createKnowledgeEngine } from "@pymapa/knowledge-engine";
import { createInMemoryProductionRepository, type AssessmentRecord } from "./puertos";
import { submitAcquisitionResponse, KNOWLEDGE_VERSION_MISMATCH } from "./caso-uso";
import { resolveExecutionSource, PRODUCTION_CAPABILITY_IDS } from "@/services/production/execution-source";

const RAIZ = process.cwd();
const SRC = join(RAIZ, "src");
const PACK = JSON.parse(
  readFileSync(join(RAIZ, "knowledge", "packs", "op-01", "1.0.0", "pack.json"), "utf8"),
) as Record<string, unknown>;

const KV = "kv-op01-1.0.0";

function assessment(overrides: Partial<AssessmentRecord> = {}): AssessmentRecord {
  return {
    id: "assess-1",
    organizationId: "org-1",
    caseId: "case-1",
    knowledgeVersionId: KV,
    type: "BASELINE",
    startedAt: "2026-01-01T00:00:00.000Z",
    closedAt: null,
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function archivos(dir: string): string[] {
  const salida: string[] = [];
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) {
      if (entrada === "node_modules") continue;
      salida.push(...archivos(ruta));
    } else if (/\.(ts|tsx)$/.test(entrada)) {
      salida.push(ruta);
    }
  }
  return salida;
}

const FUENTE_BOUNDARY = readFileSync(join(SRC, "lib", "production", "op01.functions.ts"), "utf8");
const FUENTE_RUNTIME = readFileSync(join(SRC, "lib", "production", "runtime.server.ts"), "utf8");
const SQL_MIGRACIONES = readdirSync(join(RAIZ, "supabase", "migrations"))
  .map((f) => readFileSync(join(RAIZ, "supabase", "migrations", f), "utf8"))
  .join("\n");

describe("M1-D2 · sesión y membership", () => {
  it("toda operación productiva exige sesión autenticada", () => {
    const funciones = FUENTE_BOUNDARY.match(/createServerFn\(/g) ?? [];
    const protegidas = FUENTE_BOUNDARY.match(/\.middleware\(\[requireSupabaseAuth\]\)/g) ?? [];
    expect(funciones.length).toBeGreaterThan(0);
    expect(protegidas.length).toBe(funciones.length);
  });

  it("el bootstrap exige membership verificada con la identidad del usuario", () => {
    expect(FUENTE_RUNTIME).toMatch(/MEMBERSHIP_REQUIRED/);
    expect(FUENTE_RUNTIME).toMatch(/bootstrap_organization/);
  });

  it("el bootstrap tenant-owned no usa el service role", () => {
    const bloque = FUENTE_RUNTIME.slice(FUENTE_RUNTIME.indexOf("asegurarContextoProductivo"));
    expect(bloque).not.toMatch(/admin\(\)/);
  });

  it("la función de bootstrap solo opera sobre el usuario autenticado", () => {
    expect(SQL_MIGRACIONES).toMatch(/create or replace function public\.bootstrap_organization/i);
    expect(SQL_MIGRACIONES).toMatch(/_user_id uuid := auth\.uid\(\)/i);
    expect(SQL_MIGRACIONES).toMatch(/grant execute on function public\.bootstrap_organization/i);
  });
});

describe("M1-D2 · aislamiento entre organizaciones", () => {
  it("las políticas tenant-owned exigen membresía de organización", () => {
    for (const tabla of ["assessments", "responses", "observations", "cases"]) {
      const regex = new RegExp(`on public\\.${tabla}[\\s\\S]{0,400}?is_organization_member`, "i");
      expect(SQL_MIGRACIONES).toMatch(regex);
    }
    expect(SQL_MIGRACIONES).not.toMatch(/to anon/i);
  });

  it("el caso de uso nunca mezcla datos de otro assessment", async () => {
    const engine = createKnowledgeEngine(PACK);
    const repo = createInMemoryProductionRepository([
      assessment(),
      assessment({ id: "assess-2", organizationId: "org-2", caseId: "case-2" }),
    ]);
    const deps = { engine, repository: repo, knowledgeVersionId: KV };

    await submitAcquisitionResponse(deps, {
      assessmentId: "assess-1",
      organizationId: "org-1",
      submittedBy: "user-1",
      acquisitionId: "OP01-P01",
      knowledgeState: "KNOWN",
      semanticValue: "Definida",
    });

    expect(await repo.listObservations("assess-2")).toHaveLength(0);
    expect(await repo.listResponses("assess-2")).toHaveLength(0);
  });
});

describe("M1-D2 · recorrido productivo", () => {
  it("el Assessment está pinneado: otra KnowledgeVersion se rechaza", async () => {
    const engine = createKnowledgeEngine(PACK);
    const repo = createInMemoryProductionRepository([assessment({ knowledgeVersionId: "kv-otra" })]);
    const resultado = await submitAcquisitionResponse(
      { engine, repository: repo, knowledgeVersionId: KV },
      {
        assessmentId: "assess-1",
        organizationId: "org-1",
        submittedBy: "user-1",
        acquisitionId: "OP01-P01",
        knowledgeState: "UNKNOWN",
      },
    );
    expect(resultado.accepted).toBe(false);
    expect(resultado.rejectionReason).toBe(KNOWLEDGE_VERSION_MISMATCH);
  });

  it("OP-01 se enruta a PRODUCTION_ENGINE y el resto permanece en MVP_ENGINE", () => {
    expect([...PRODUCTION_CAPABILITY_IDS]).toEqual(["OP-01"]);
    expect(resolveExecutionSource("OP-01")).toBe("PRODUCTION_ENGINE");
    expect(resolveExecutionSource("CAP-03")).toBe("MVP_ENGINE");
  });

  it("P01 se sirve desde el Knowledge Pack, no desde React", () => {
    const engine = createKnowledgeEngine(PACK);
    const p01 = engine.getAcquisition("OP01-P01");
    expect(p01?.question).toBe(
      (PACK["acquisitions"] as { id: string; question: string }[])[0]!.question,
    );

    const ruta = join(SRC, "routes", "_authenticated", "capacidad.op-01.tsx");
    expect(existsSync(ruta)).toBe(true);
    const fuente = readFileSync(ruta, "utf8");
    expect(fuente).not.toMatch(/OP01-P01|Formalizada|Implícita|No identificable/);
    expect(fuente).toMatch(/getNextAcquisitionQuestion/);
  });

  it("el envío productivo produce EvaluationRun con lineage completo", async () => {
    const engine = createKnowledgeEngine(PACK);
    const repo = createInMemoryProductionRepository([assessment()]);
    const resultado = await submitAcquisitionResponse(
      { engine, repository: repo, knowledgeVersionId: KV },
      {
        assessmentId: "assess-1",
        organizationId: "org-1",
        submittedBy: "user-1",
        acquisitionId: "OP01-P01",
        knowledgeState: "KNOWN",
        semanticValue: "Definida",
      },
    );

    expect(resultado.accepted).toBe(true);
    expect(resultado.responseId).toBeTruthy();
    expect(resultado.observationId).toBeTruthy();
    expect(resultado.evaluationRunId).toBeTruthy();
    const runs = repo.estado["runs"] as { knowledgeVersionId: string; engineVersion: string }[];
    expect(runs).toHaveLength(1);
    expect(runs[0]!.knowledgeVersionId).toBe(KV);
    expect(runs[0]!.engineVersion).toBe(engine.engineVersion);
    expect((repo.estado["variableEvaluations"] as unknown[]).length).toBeGreaterThan(0);
    expect((repo.estado["needStates"] as unknown[]).length).toBeGreaterThan(0);
  });
});

describe("M1-D2 · seguridad del frontend", () => {
  it("no hay credenciales privilegiadas en el código del frontend", () => {
    const infractores = archivos(SRC).filter((ruta) => {
      const rel = relative(RAIZ, ruta).replace(/\\/g, "/");
      if (rel.endsWith(".test.ts") || rel.includes("client.server")) return false;
      const fuente = readFileSync(ruta, "utf8");
      return /SERVICE_ROLE|sb_secret_|DB_PASSWORD|SUPABASE_DB_URL/.test(fuente);
    });
    expect(infractores.map((f) => relative(RAIZ, f))).toEqual([]);
  });

  it("el archivo de entorno versionado solo contiene claves publicables", () => {
    const env = readFileSync(join(RAIZ, ".env"), "utf8");
    expect(env).not.toMatch(/SERVICE_ROLE|sb_secret_|PASSWORD/);
    expect(env).toMatch(/SUPABASE_PUBLISHABLE_KEY/);
  });
});
