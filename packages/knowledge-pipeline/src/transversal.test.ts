/**
 * M2-SOURCE-MAT · Garantías de la materialización transversal.
 *
 * Estos tests se ejecutan contra el repositorio real: no hay fixtures
 * sintéticos del Master, no hay frontend y no hay dependencia de Lovable.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { computeSelfChecksum, verifySelfChecksum } from "./checksum.ts";
import { validateMasterIndex } from "./master.ts";
import {
  loadMasterIndex,
  loadTransversalIndex,
  loadTransversalRegistries,
  discoverCapabilityPipelineInputs,
} from "./loader.ts";
import { runBatch } from "./pipeline.ts";
import {
  REQUIRED_TRANSVERSAL_REGISTRIES,
  TRANSVERSAL_DERIVATION,
  validateTransversalCore,
  validateTransversalIndex,
  validateTransversalRegistry,
  type TransversalRegistry,
} from "./transversal.ts";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const VERSION = "v1.0";

const indiceBruto = loadTransversalIndex(ROOT, VERSION) as Record<string, unknown>;
const registrosBrutos = loadTransversalRegistries(ROOT, VERSION);
const nucleo = validateTransversalCore({ index: indiceBruto, registries: registrosBrutos });
const registros: TransversalRegistry[] = nucleo.registries;
const porId = new Map(registros.map((r) => [r.registryId, r]));

function registro(id: string): TransversalRegistry {
  const encontrado = porId.get(id);
  if (!encontrado) throw new Error(`registro transversal ausente: ${id}`);
  return encontrado;
}

const todosLosIds = new Set(registros.flatMap((r) => r.recoveredIds));

describe("núcleo transversal · integridad", () => {
  it("el índice y los 17 registros requeridos validan sin incidencias", () => {
    expect(nucleo.issues).toEqual([]);
    expect(nucleo.ok).toBe(true);
    expect(nucleo.summary.registryCount).toBe(REQUIRED_TRANSVERSAL_REGISTRIES.length);
  });

  it("S1–S5 están representados y son trazables a su cierre autoritativo", () => {
    const indice = validateTransversalIndex(indiceBruto);
    expect(indice.ok).toBe(true);
    if (!indice.ok) return;
    for (const etapa of ["S1", "S2", "S3", "S4", "S5"] as const) {
      const declarada = indice.value.stages.find((s) => s.id === etapa);
      expect(declarada, `falta la etapa ${etapa}`).toBeDefined();
      expect(declarada?.artifacts.length).toBeGreaterThan(0);
      expect(registros.some((r) => r.stage === etapa)).toBe(true);
    }
    expect(indice.value.closureChain).toContain("PYMAPA-KNOWLEDGE-MASTER-v1.0 · BASELINE-APPROVED");
    expect(indice.value.phaseClosure).toBe(
      "FASE-2-KNOWLEDGE-ENGINEERING-v1.0 · COMPLETE · BASELINE FROZEN",
    );
  });

  it("toda la procedencia es transcripción del artefacto autoritativo M2-SOURCE", () => {
    for (const r of registros) {
      expect(r.provenance.derivation).toBe(TRANSVERSAL_DERIVATION);
      expect(r.provenance.sourceReference).toContain("M2-SOURCE");
    }
  });

  it("los checksums declarados por el índice coinciden con el contenido real", () => {
    expect(verifySelfChecksum(indiceBruto).ok).toBe(true);
    for (const entrada of registrosBrutos) {
      expect(computeSelfChecksum(entrada.raw as Record<string, unknown>)).toBe(entrada.checksum);
      expect(verifySelfChecksum(entrada.raw as Record<string, unknown>).ok).toBe(true);
    }
  });
});

describe("núcleo transversal · IDs recuperados preservados", () => {
  const esperados = [
    ...Array.from({ length: 18 }, (_, i) => `MOTOR-CONTRACT-${String(i + 1).padStart(2, "0")}`),
    ...Array.from({ length: 9 }, (_, i) => `MOTOR-RULE-CROSS-${String(i + 4).padStart(2, "0")}`),
    ...Array.from({ length: 16 }, (_, i) => `ME-${String(i + 1).padStart(2, "0")}`),
    ...Array.from({ length: 24 }, (_, i) => `GQ-${String(i + 1).padStart(2, "0")}`),
    ...Array.from({ length: 10 }, (_, i) => `KG-P${String(i + 1).padStart(2, "0")}`),
    ...Array.from({ length: 12 }, (_, i) => `TRANS-${String(i + 1).padStart(2, "0")}`),
    ...Array.from({ length: 6 }, (_, i) => `OBJ-RULE-0${i + 1}`),
    ...Array.from({ length: 7 }, (_, i) => `KC-0${i + 1}`),
    ...Array.from({ length: 7 }, (_, i) => `ST-0${i + 1}`),
    "CAND-MOTOR-CROSS-CAP-03",
    "CAND-MOTOR-S2-01",
    "MOTOR-S2-02",
    "PYMAPA-HYBRID-REASONING-PRINCIPLE-01",
    "CH0",
    "CH4",
    "KI-1",
    "KI-4",
    "D1",
    "D4",
    "RC0",
    "RC4",
    "B1",
    "B3",
    "AP0",
    "AP2",
    "C0",
    "C3",
    "M0",
    "M3",
    "U0",
    "U3",
    "CAU0",
    "CAU3",
    "V0",
    "V4",
    "L0",
    "L3",
    "R0",
    "R3",
    "SRC-T1",
    "SRC-T6",
    "OP-01",
  ];

  it.each(esperados)("preserva el ID %s", (id) => {
    expect(todosLosIds.has(id)).toBe(true);
  });

  it("los 18 dominios de contrato y las 8 frentes de reconciliación están completos", () => {
    const contratos = registro("S1-TRANSVERSAL-CONTRACTS");
    const dominios = (contratos.sections["contractDomains"] as { domains: unknown[] }).domains;
    expect(dominios).toHaveLength(18);
    const reconciliacion = registro("S1-TRANSVERSAL-RECONCILIATION");
    expect(reconciliacion.sections["reconciliationFronts"]).toHaveLength(8);
  });

  it("el Object Registry preserva 7 familias y 70 objetos lógicos", () => {
    const objetos = registro("S3-OBJECT-REGISTRY").sections["objectFamilies"] as {
      totalObjects: number;
      families: { count: number; objects: string[] }[];
    };
    expect(objetos.families).toHaveLength(7);
    expect(objetos.totalObjects).toBe(70);
    expect(objetos.families.reduce((n, f) => n + f.count, 0)).toBe(70);
    for (const familia of objetos.families) expect(familia.objects).toHaveLength(familia.count);
  });

  it("los 16 servicios lógicos ME-01–ME-16 están materializados", () => {
    const servicios = registro("S2-LOGICAL-ENGINE-REGISTRY").sections["services"] as {
      id: string;
    }[];
    expect(servicios).toHaveLength(16);
  });

  it("los 24 Global Quality Gates constan como cierre histórico, no como validación del repositorio", () => {
    const gates = registro("S5-GLOBAL-QUALITY-GATES").sections["globalQualityGates"] as {
      gates: { result: string }[];
      result: string;
      note: string;
    };
    expect(gates.gates).toHaveLength(24);
    expect(gates.result).toBe("GLOBAL QUALITY GATE = 24/24 PASS");
    expect(gates.note).toContain("cierre histórico");
  });
});

describe("núcleo transversal · vacíos preservados sin inferencia", () => {
  it("todo SOURCE CONTENT NOT RECOVERED permanece visible y bloquea publicación", () => {
    const noRecuperados = registros.flatMap((r) =>
      r.gaps.filter((g) => g.kind === "SOURCE_CONTENT_NOT_RECOVERED"),
    );
    expect(noRecuperados.length).toBeGreaterThanOrEqual(11);
    for (const gap of noRecuperados) {
      expect(gap.publicationBlocking).toBe(true);
      expect(gap.statement.length).toBeGreaterThan(0);
      expect(gap).not.toHaveProperty("resolution");
    }
  });

  it("los 11 vacíos globales de PART VIII están registrados uno a uno", () => {
    const global = registro("RECOVERY-GAPS");
    expect(global.sections["globalNotRecovered"]).toHaveLength(11);
    expect(global.gaps).toHaveLength(11);
    expect(global.recoveryClass).toBe("SOURCE_CONTENT_NOT_RECOVERED");
  });

  it("los vacíos citados explícitamente por la fuente no se completan", () => {
    const declaraciones = registros.flatMap((r) => r.gaps.map((g) => g.statement)).join(" ");
    expect(declaraciones).toContain("ATTR-0:3");
    expect(declaraciones).toContain("P1–P5");
    expect(declaraciones).toContain("E0–E3");
    expect(declaraciones).toContain("31×31");
    expect(declaraciones).toContain("Value of Information");
  });

  it("registra GENERIC_RUNTIME_EXTENSION_REQUIRED sin implementarlo", () => {
    const extensiones = registros.flatMap((r) =>
      r.gaps.filter((g) => g.kind === "GENERIC_RUNTIME_EXTENSION_REQUIRED"),
    );
    expect(extensiones.length).toBeGreaterThan(0);
    for (const gap of extensiones) expect(gap.publicationBlocking).toBe(false);
  });

  it("un vacío no recuperado declarado como no bloqueante es rechazado", () => {
    const base = registrosBrutos[0]!.raw as Record<string, unknown>;
    const manipulado = {
      ...base,
      gaps: [
        {
          id: "FAKE-01",
          kind: "SOURCE_CONTENT_NOT_RECOVERED",
          statement: "vacío declarado como inofensivo",
          publicationBlocking: false,
        },
      ],
    };
    const resultado = validateTransversalRegistry(manipulado);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.issues.some((i) => i.path.endsWith("publicationBlocking"))).toBe(true);
  });

  it("un registro que no deriva del artefacto autoritativo es rechazado", () => {
    const base = registrosBrutos[0]!.raw as Record<string, unknown>;
    const inventado = {
      ...base,
      provenance: {
        ...(base["provenance"] as Record<string, unknown>),
        sourceReference: "OP-01 pack publicado",
      },
    };
    expect(validateTransversalRegistry(inventado).ok).toBe(false);
    const derivacionInvalida = {
      ...base,
      provenance: { ...(base["provenance"] as Record<string, unknown>), derivation: "INFERRED" },
    };
    expect(validateTransversalRegistry(derivacionInvalida).ok).toBe(false);
  });

  it("un índice sin un registro requerido es rechazado", () => {
    const recortado = {
      ...indiceBruto,
      registries: (indiceBruto["registries"] as unknown[]).slice(1),
    };
    const resultado = validateTransversalIndex(recortado);
    expect(resultado.ok).toBe(false);
  });

  it("un checksum desalineado entre índice y contenido es detectado", () => {
    const alterados = registrosBrutos.map((r, i) =>
      i === 0 ? { ...r, checksum: "sha256:0000" } : r,
    );
    const resultado = validateTransversalCore({ index: indiceBruto, registries: alterados });
    expect(resultado.ok).toBe(false);
    expect(resultado.issues.some((i) => i.message.includes("desalineado"))).toBe(true);
  });
});

describe("núcleo transversal · diferencias cross-stage", () => {
  const diferencias = registro("CROSS-STAGE-DIFFERENCES").sections["differences"] as {
    id: string;
    topic: string;
    autoResolve: boolean;
  }[];

  it("las diferencias documentadas permanecen registradas y sin auto-resolver", () => {
    expect(diferencias.length).toBeGreaterThanOrEqual(3);
    for (const d of diferencias) expect(d.autoResolve).toBe(false);
    const temas = diferencias.map((d) => d.topic).join(" | ");
    expect(temas).toContain("Provenance terminology");
    expect(temas).toContain("Evidence reasoning chain");
    expect(temas).toContain("Specialist objects");
  });

  it("los tres contextos de provenance (S1, S3, S4) se preservan separados", () => {
    const provenance = diferencias.find((d) => d.topic === "Provenance terminology") as unknown as {
      stages: Record<string, string[]>;
    };
    expect(Object.keys(provenance.stages).sort()).toEqual(["S1", "S3", "S4"]);
    expect(provenance.stages["S1"]).not.toEqual(provenance.stages["S4"]);
    expect(registro("S1-COMMON-STATES").sections["provenanceCategoriesS1"]).toBeDefined();
    expect(registro("S3-OBJECT-REGISTRY").sections["identityScopeTimeProvenance"]).toBeDefined();
    expect(registro("S4-SOURCE-GOVERNANCE").sections["claimToSource"]).toBeDefined();
  });

  it("la cadena Evidence → Observation → (Claim) → Inference → Finding no se reescribe", () => {
    const cadena = diferencias.find((d) => d.topic === "Evidence reasoning chain") as unknown as {
      stages: Record<string, string>;
    };
    expect(cadena.stages["S1"]).toBe("Evidence → Observation → Inference → Finding");
    expect(cadena.stages["S3"]).toContain("Claim");
  });
});

describe("taxonomía 6×31 · cierre histórico sin fuente inventada", () => {
  const master = loadMasterIndex(ROOT, VERSION) as Record<string, unknown>;
  const taxonomia = registro("TAXONOMY-REGISTRY-6X31");

  it("el Master valida y declara 31 capacidades con cierre histórico coherente", () => {
    const resultado = validateMasterIndex(master);
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.value.expectedCapabilityCount).toBe(31);
    expect(resultado.value.domains).toHaveLength(6);
    expect(resultado.value.verticalStatus?.k4ValidatedCapabilityCount).toBe(31);
    expect(resultado.value.verticalStatus?.materializedSourceCount).toBe(1);
    expect(resultado.value.verticalStatus?.unrecoveredCapabilityCount).toBe(30);
    expect(resultado.value.verticalStatus?.unrecoveredCapabilityStatus).toBe(
      "APPROVED_HISTORY_CONFIRMED",
    );
    expect(resultado.value.verticalStatus?.unrecoveredRecoveryClass).toBe(
      "SOURCE_CONTENT_NOT_RECOVERED",
    );
  });

  it("K4-VALIDATED no se traduce a SOURCE_READY: solo OP-01 tiene fuente", () => {
    const resultado = validateMasterIndex(master);
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    const listas = resultado.value.capabilities.filter(
      (c) => c.sourceAvailability === "SOURCE_READY",
    );
    expect(listas.map((c) => c.id)).toEqual(["OP-01"]);
  });

  it("no se inventan identificadores de capacidad para los otros dominios", () => {
    const texto = `${JSON.stringify(master)}${JSON.stringify(taxonomia)}`;
    expect(texto).not.toMatch(/"(DG|PC|DT|CM|EC)-\d{2}"/);
    const unmaterialized = (
      taxonomia.sections["capabilityStatusRegistry"] as {
        unmaterialized: { count: number; status: string; capabilityIdentities: string };
      }
    ).unmaterialized;
    expect(unmaterialized.count).toBe(30);
    expect(unmaterialized.status).toBe("APPROVED_HISTORY_CONFIRMED");
    expect(unmaterialized.capabilityIdentities).toBe("NOT_RECOVERED");
  });

  it("los cierres de dominio recuperados suman 31", () => {
    const dominios = (
      taxonomia.sections["domainClosures"] as {
        total: number;
        domains: { domainId: string; declaredCapabilityCount: number }[];
      }
    ).domains;
    expect(dominios).toHaveLength(6);
    expect(dominios.reduce((n, d) => n + d.declaredCapabilityCount, 0)).toBe(31);
  });
});

describe("OP-01 Golden y pipeline M2-A intactos", () => {
  const lote = runBatch(discoverCapabilityPipelineInputs(ROOT, VERSION));

  it("OP-01 sigue publicado, equivalente al Golden Pack y con su diff limpio", () => {
    const op01 = lote.results.find((r) => r.capabilityId === "OP-01");
    expect(op01?.outcome).toBe("PASS");
    expect(op01?.state).toBe("PUBLISHED");
    expect(op01?.goldenRegression).toMatchObject({ compared: true, equivalent: true });
    expect(op01?.diff?.clean).toBe(true);
    expect(op01?.errors).toEqual([]);
  });

  it("la materialización transversal no introduce vacíos en la fuente de OP-01", () => {
    const fuente = JSON.parse(
      readFileSync(join(ROOT, "knowledge", "master", VERSION, "capabilities", "OP-01", "source.json"), "utf8"),
    ) as { gaps: { kind: string }[] };
    expect(verifySelfChecksum(fuente as unknown as Record<string, unknown>).ok).toBe(true);
    expect(fuente.gaps.some((g) => g.kind === "SOURCE_CONTENT_NOT_RECOVERED")).toBe(false);
  });

  it("ningún candidato se promueve automáticamente a conocimiento aprobado", () => {
    for (const r of lote.results) {
      if (r.state === "PUBLISHED") {
        expect(r.publication?.blockers.map((b) => b.code)).not.toContain("GOVERNANCE_REVIEW_PENDING");
      }
    }
    expect(lote.counts.FAIL).toBe(0);
  });
});

describe("independencia de arquitectura", () => {
  it("los registros transversales son datos puros, sin runtime ni dependencia de frontend", () => {
    for (const entrada of registrosBrutos) {
      const texto = JSON.stringify(entrada.raw);
      expect(texto).not.toContain("lovable");
      expect(texto).not.toContain("localStorage");
      expect(texto).not.toContain("supabase");
    }
    const modulo = readFileSync(join(import.meta.dirname, "transversal.ts"), "utf8");
    expect(modulo).not.toContain("react");
    expect(modulo).not.toContain("@/");
  });
});
