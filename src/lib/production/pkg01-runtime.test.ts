/**
 * PILOT-READY-01 · PKG-01 · Desbloqueo genérico de las 31 capacidades.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  OFFICIAL_CAPABILITY_IDS,
  computeRuntimeManifestChecksum,
  getPack,
  getRegisteredPack,
  listPublishedCapabilities,
  runtimeManifestEntries,
  verifyEntry,
} from "./packs-registry";
import {
  KNOWLEDGE_RUNTIME_IDENTIFIER,
  KNOWLEDGE_RUNTIME_VERSION,
  KNOWLEDGE_VERSION_IDENTIFIER,
  KNOWLEDGE_VERSION_NUMBER,
  asegurarKnowledgeVersion,
  cargarEngine,
  cargarEngineOp01,
  checksumPack,
  checksumPackOp01,
  identidadPack,
  versionesQueCubren,
  type KnowledgeVersionStore,
} from "./runtime.server";
import { createInMemoryProductionRepository, type AssessmentRecord } from "./puertos";
import * as casoUso from "./caso-uso";
import { PRODUCTION_CAPABILITY_IDS, resolveExecutionSource } from "@/services/production/execution-source";

const RAIZ = process.cwd();
const leer = (...p: string[]) => readFileSync(join(RAIZ, ...p), "utf8");

/** Store en memoria que registra cualquier intento de mutación. */
function storeMemoria(inicial: { id: string; identifier: string; version: string; checksum: string }[]) {
  const filas = inicial.map((f) => ({ ...f }));
  const inserts: unknown[] = [];
  const store: KnowledgeVersionStore = {
    async find(identifier, version) {
      const f = filas.find((x) => x.identifier === identifier && x.version === version);
      return f ? { id: f.id, checksum: f.checksum } : null;
    },
    async insert(row) {
      if (filas.some((x) => x.identifier === row.identifier && x.version === row.version))
        throw new Error("duplicate key");
      const id = `kv-${filas.length + 1}`;
      filas.push({ id, identifier: row.identifier, version: row.version, checksum: row.checksum });
      inserts.push(row);
      return id;
    },
  };
  return { store, filas, inserts };
}

const HISTORICA = () => ({
  id: "kv-m1",
  identifier: KNOWLEDGE_VERSION_IDENTIFIER,
  version: KNOWLEDGE_VERSION_NUMBER,
  checksum: checksumPackOp01(),
});

describe("PKG-01 · A · registro de packs", () => {
  it("exactamente 31 capacidades oficiales, EC-01 excluida", () => {
    expect(OFFICIAL_CAPABILITY_IDS).toHaveLength(31);
    expect(OFFICIAL_CAPABILITY_IDS).not.toContain("EC-01");
    const dirs = readdirSync(join(RAIZ, "knowledge", "packs")).map((d) => d.toUpperCase()).sort();
    expect([...OFFICIAL_CAPABILITY_IDS].sort()).toEqual(dirs);
    expect([...PRODUCTION_CAPABILITY_IDS].sort()).toEqual([...OFFICIAL_CAPABILITY_IDS].sort());
  });

  it("todos los packs parsean, están PUBLISHED y su checksum coincide con published.json", () => {
    for (const id of OFFICIAL_CAPABILITY_IDS) {
      const r = getRegisteredPack(id);
      const pub = JSON.parse(leer("knowledge", "packs", id.toLowerCase(), "1.0.0", "published.json"));
      expect(r.publicationStatus).toBe("PUBLISHED");
      expect(pub.status).toBe("PUBLISHED");
      expect(r.packChecksum).toBe(pub.checksum);
      expect(r.packVersion).toBe("1.0.0");
      expect(JSON.parse(leer("knowledge", "packs", id.toLowerCase(), "1.0.0", "pack.json"))).toEqual(r.pack);
    }
  });

  it("lookup representativo y fail-closed ante IDs inválidos", () => {
    for (const id of ["OP-01", "DG-03", "PC-05", "DT-06", "CM-02", "EC-05"]) {
      expect((getPack(id) as { capability: { id: string } }).capability.id).toBe(id);
    }
    for (const bad of ["EC-01", "op-01", "XX-01", "", "OP-06", "CAP-01"]) {
      expect(() => getRegisteredPack(bad)).toThrow(/KNOWLEDGE_PACK_NOT_REGISTERED/);
      expect(() => cargarEngine(bad)).toThrow(/KNOWLEDGE_PACK_NOT_REGISTERED/);
    }
  });

  it("un pack no publicado o alterado se rechaza", () => {
    const pack = getPack("OP-02");
    const pub = JSON.parse(leer("knowledge", "packs", "op-02", "1.0.0", "published.json"));
    expect(() => verifyEntry({ capabilityId: "OP-02", pack, published: { ...pub, status: "DRAFT" } })).toThrow(
      /INTEGRITY/,
    );
    const alterado = { ...(pack as object), status: "tampered" };
    expect(() => verifyEntry({ capabilityId: "OP-02", pack: alterado, published: pub })).toThrow(/checksum/);
  });

  it("catálogo con identidad gobernada por la fuente", () => {
    const cat = listPublishedCapabilities();
    expect(cat).toHaveLength(31);
    for (const c of cat) {
      const pack = getPack(c.capabilityId) as { capability: { name: string; domainId: string } };
      expect(c.name).toBe(pack.capability.name);
      expect(c.domainId).toBe(pack.capability.domainId);
      expect(c.publicationStatus).toBe("PUBLISHED");
      expect(c).not.toHaveProperty("pack");
    }
    expect(new Set(cat.map((c) => c.domainId))).toEqual(new Set(["OP", "DG", "PC", "DT", "CM", "EC"]));
  });
});

describe("PKG-01 · B · runtime manifest compuesto inmutable", () => {
  it("checksum determinista e independiente del orden", () => {
    const a = computeRuntimeManifestChecksum();
    expect(computeRuntimeManifestChecksum()).toBe(a);
    const invertido = [...runtimeManifestEntries()].reverse();
    expect(computeRuntimeManifestChecksum(invertido)).toBe(a);
    expect(a).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("el checksum cambia si cualquier pack cambia (aislado en test)", () => {
    const base = runtimeManifestEntries();
    const modificado = base.map((e, i) => (i === 7 ? { ...e, packChecksum: `sha256:${"0".repeat(64)}` } : e));
    expect(computeRuntimeManifestChecksum(modificado)).not.toBe(computeRuntimeManifestChecksum(base));
    const version = base.map((e, i) => (i === 0 ? { ...e, packVersion: "1.0.1" } : e));
    expect(computeRuntimeManifestChecksum(version)).not.toBe(computeRuntimeManifestChecksum(base));
  });

  it("assessments nuevos usan PYMAPA-RUNTIME-MANIFEST 1.0.0; la fila M1 no se toca", async () => {
    const { store, filas, inserts } = storeMemoria([HISTORICA()]);
    const antes = JSON.stringify(filas[0]);
    const id = await asegurarKnowledgeVersion(store);
    expect(id).not.toBe("kv-m1");
    expect(inserts).toEqual([
      expect.objectContaining({
        identifier: KNOWLEDGE_RUNTIME_IDENTIFIER,
        version: KNOWLEDGE_RUNTIME_VERSION,
        status: "PUBLISHED",
        checksum: computeRuntimeManifestChecksum(),
      }),
    ]);
    expect(JSON.stringify(filas[0])).toBe(antes);
    // Idempotente: no hay segundo insert ni backfill.
    expect(await asegurarKnowledgeVersion(store)).toBe(id);
    expect(inserts).toHaveLength(1);
    expect(filas).toHaveLength(2);
  });

  it("checksum del runtime manifest distinto → fail-closed, sin UPDATE", async () => {
    const { store, filas, inserts } = storeMemoria([
      HISTORICA(),
      { id: "kv-rt", identifier: KNOWLEDGE_RUNTIME_IDENTIFIER, version: KNOWLEDGE_RUNTIME_VERSION, checksum: "sha256:x" },
    ]);
    await expect(asegurarKnowledgeVersion(store)).rejects.toThrow(/KNOWLEDGE_VERSION_INTEGRITY_MISMATCH/);
    expect(filas[1]!.checksum).toBe("sha256:x");
    expect(inserts).toHaveLength(0);
  });

  it("la fila histórica cubre solo OP-01 y se verifica por checksum; nunca se crea", async () => {
    const { store } = storeMemoria([HISTORICA()]);
    const op01 = await versionesQueCubren("OP-01", store);
    expect(op01).toContain("kv-m1");
    expect(op01).toHaveLength(2);
    expect(await versionesQueCubren("DG-01", store)).not.toContain("kv-m1");

    const vacia = storeMemoria([]);
    await versionesQueCubren("OP-01", vacia.store);
    expect(vacia.filas.map((f) => f.identifier)).toEqual([KNOWLEDGE_RUNTIME_IDENTIFIER]);

    const corrupta = storeMemoria([{ ...HISTORICA(), checksum: "otro" }]);
    await expect(versionesQueCubren("OP-01", corrupta.store)).rejects.toThrow(/INTEGRITY_MISMATCH/);
  });

  it("el checksum histórico M1 conserva su algoritmo original", () => {
    expect(checksumPackOp01()).toBe(checksumPack("OP-01"));
    expect(checksumPackOp01()).toMatch(/^[0-9a-f]{64}$/);
  });

  it("no se añade migración ni UPDATE de knowledge_versions", () => {
    const src = leer("src", "lib", "production", "runtime.server.ts");
    expect(src).not.toMatch(/from\("knowledge_versions"\)\s*\.(update|upsert|delete)/);
  });
});

const REPRESENTATIVAS = ["OP-02", "DG-01", "PC-01", "DT-04", "CM-01", "EC-02"] as const;
const KV = "kv-runtime";

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

describe("PKG-01 · C/D · runtime y boundary genéricos en 6 dominios", () => {
  for (const id of REPRESENTATIVAS) {
    it(`${id}: pack carga, Engine 0.2.0, estado, adquisición, respuesta y findings`, async () => {
      const engine = cargarEngine(id);
      expect(engine.engineVersion).toBe("pymapa-knowledge-engine/0.2.0");
      expect(engine.pack.capability.id).toBe(id);
      expect(cargarEngine(id)).toBe(engine); // reutilizado
      expect(resolveExecutionSource(id)).toBe("PRODUCTION_ENGINE");

      const repository = createInMemoryProductionRepository([assessment()]);
      const deps = { engine, repository, knowledgeVersionId: KV, packChecksum: identidadPack(id).packChecksum };

      const estado = await casoUso.getAssessmentState(deps, "assess-1");
      expect(estado?.capabilityId).toBe(id);
      expect(estado?.totalAcquisitions).toBe(engine.listAcquisitions().length);

      const siguiente = await casoUso.getNextAcquisition(deps, "assess-1");
      expect(siguiente).not.toBeNull();

      const salida = await casoUso.submitAcquisitionResponse(deps, {
        assessmentId: "assess-1",
        organizationId: "org-1",
        submittedBy: "user-1",
        acquisitionId: siguiente!.acquisitionId,
        knowledgeState: "UNKNOWN",
      });
      expect(salida.accepted, String(salida.rejectionReason)).toBe(true);
      expect(salida.state?.capabilityId).toBe(id);
      expect(salida.state?.answeredAcquisitionIds).toContain(siguiente!.acquisitionId);

      const findings = await casoUso.listFindings(deps, "assess-1");
      expect(Array.isArray(findings)).toBe(true);
      const pendientes = await casoUso.listFindingsAwaitingResolution(deps, "assess-1");
      expect(pendientes).toHaveProperty("items");
      const runs = await repository.listEvaluationRuns("assess-1");
      expect(runs.at(-1)?.engineVersion).toBe("pymapa-knowledge-engine/0.2.0");
    });
  }

  it("un assessment pinneado a otra versión falla cerrado", async () => {
    const deps = {
      engine: cargarEngine("DG-01"),
      repository: createInMemoryProductionRepository([assessment({ knowledgeVersionId: "kv-m1" })]),
      knowledgeVersionId: KV,
    };
    await expect(casoUso.getAssessmentState(deps, "assess-1")).rejects.toThrow(
      casoUso.KNOWLEDGE_VERSION_MISMATCH,
    );
  });

  it("cada función genérica exige sesión y capabilityId publicado", () => {
    const src = leer("src", "lib", "production", "capabilities.functions.ts");
    const fns = src.match(/createServerFn\(/g) ?? [];
    expect(fns.length).toBeGreaterThanOrEqual(8);
    expect((src.match(/\.middleware\(\[requireSupabaseAuth\]\)/g) ?? []).length).toBe(fns.length);
    for (const n of [
      "listAvailableCapabilities",
      "getCapabilityContext",
      "getCapabilityAssessmentState",
      "getCapabilityNextAcquisition",
      "submitCapabilityResponse",
      "registerCapabilityEvidence",
      "getCapabilityFindings",
    ]) {
      expect(src).toMatch(new RegExp(`export const ${n} = createServerFn`));
    }
  });

  it("sin branching por capacidad en el runtime ni en los handlers", () => {
    for (const f of ["runtime.server.ts", "capability-handlers.ts", "capabilities.functions.ts", "packs-registry.ts"]) {
      const src = leer("src", "lib", "production", f);
      expect(src, f).not.toMatch(/capabilityId\s*===\s*["']/);
    }
  });
});

describe("PKG-01 · E/F · compatibilidad OP-01 y reproducibilidad", () => {
  it("cargarEngineOp01 delega en el loader genérico", () => {
    expect(cargarEngineOp01()).toBe(cargarEngine("OP-01"));
  });

  it("op01.functions conserva su superficie y delega con capabilityId OP-01", () => {
    const src = leer("src", "lib", "production", "op01.functions.ts");
    for (const n of ["getOp01Context", "submitOp01Response", "getOp01Findings", "startOp01Reassessment"]) {
      expect(src).toMatch(new RegExp(`export const ${n} = createServerFn`));
    }
    expect(src).toMatch(/const OP01 = "OP-01"/);
    expect(src).not.toMatch(/capabilities\.functions/);
  });

  it("snapshots nuevos registran capabilityId/packVersion/packChecksum; sin checksum, payload histórico intacto", async () => {
    const engine = cargarEngine("OP-02");
    for (const packChecksum of [identidadPack("OP-02").packChecksum, undefined]) {
      const repository = createInMemoryProductionRepository([assessment()]);
      const deps = { engine, repository, knowledgeVersionId: KV, ...(packChecksum ? { packChecksum } : {}) };
      const r = await casoUso.iniciarReassessment(deps, { baselineAssessmentId: "assess-1", actorUserId: "user-1" });
      expect(r.accepted).toBe(true);
      const payload = r.snapshot!.payload as Record<string, unknown>;
      if (packChecksum) {
        expect(payload["capabilityPack"]).toEqual({ capabilityId: "OP-02", packVersion: "1.0.0", packChecksum });
      } else {
        expect(payload).not.toHaveProperty("capabilityPack");
      }
      expect(r.assessment?.knowledgeVersionId).toBe(KV);
    }
  });
});
