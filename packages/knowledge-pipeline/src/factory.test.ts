/**
 * M2-FACTORY-01 · Knowledge Factory por lotes.
 *
 * Dry-run sobre los artefactos existentes (sin re-extraer conocimiento),
 * aislamiento por capacidad, registro raw, frontera de candidatos,
 * registro de extensiones runtime, detección de branching y artefactos
 * escritos en disco sincronizados.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ENGINE_SEMANTIC_HISTORY, ENGINE_SEMVER, ENGINE_VERSION } from "@pymapa/knowledge-engine";
import {
  BATCH_MANIFEST_PATH,
  BENCHMARK_PATH,
  FACTORY_STATES,
  RUNTIME_EXTENSIONS_PATH,
  buildFactoryBenchmarkMarkdown,
  buildRawSourceRegistration,
  computeSelfChecksum,
  detectCapabilitySpecificBranching,
  extractRawSource,
  governanceEvidencePath,
  loadFactoryCapabilityInputs,
  computeChecksum,
  loadGenericCodeCorpus,
  loadMasterIndex,
  promoteCandidateToCanonicalBaseline,
  runFactoryBatch,
  sha256Bytes,
  stripComments,
  validateExtractionCandidate,
  validateMasterIndex,
  validateRuntimeExtensionRegistry,
  verifyRawSourceRegistration,
  type FactoryBatchInput,
  type FactoryCapabilityInput,
} from "./index.ts";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const VERSION = "v1.0";
const master = (() => {
  const m = validateMasterIndex(loadMasterIndex(ROOT, VERSION));
  if (!m.ok) throw new Error("master inválido");
  return m.value;
})();
const readJson = (p: string) =>
  JSON.parse(readFileSync(join(ROOT, p), "utf8")) as Record<string, unknown>;
const registry = readJson(RUNTIME_EXTENSIONS_PATH);
const engine = {
  semver: ENGINE_SEMVER,
  version: ENGINE_VERSION,
  changeIds: ENGINE_SEMANTIC_HISTORY.flatMap((v) => v.changes.map((c) => c.id)),
  baselineSemver: ENGINE_SEMANTIC_HISTORY[0]!.version,
};
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const OP02_PACK_CHECKSUM =
  "sha256:7f8072073a12961bea852c5bee36cce1574836cb0bc59c8c27acbe6ae0ebc6cc";
const OP02_NE = ["NE-OP02-01", "NE-OP02-02", "NE-OP02-03", "NE-OP02-04", "NE-OP02-05", "NE-OP02-06"];
const OP02_GRE = ["GRE-OP02-01:CLOSED", "GRE-OP02-02:CLOSED", "GRE-OP02-03:CLOSED", "GRE-OP02-04:CLOSED"];

/** Entradas reales con OP-02 en su estado pre-publicación (sin aprobación ni pack publicado). */
function sinPublicacionOp02(): FactoryCapabilityInput[] {
  return loadFactoryCapabilityInputs(ROOT, VERSION).map((c) => {
    if (c.capabilityId !== "OP-02" || !c.master?.pipelineInput) return c;
    const { governanceReview: _g, publishedPack: _p, ...resto } = c.master.pipelineInput;
    return { ...c, master: { ...c.master, pipelineInput: resto } };
  });
}

function batchInput(over: Partial<FactoryBatchInput> = {}): FactoryBatchInput {
  return {
    master,
    capabilities: loadFactoryCapabilityInputs(ROOT, VERSION),
    extensionRegistry: registry,
    codeCorpus: loadGenericCodeCorpus(ROOT),
    engine,
    pdfRunner: null,
    ...over,
  };
}
const byId = (r: ReturnType<typeof runFactoryBatch>, id: string) => {
  const e = r.entries.find((x) => x.capabilityId.localeCompare(id) === 0);
  if (!e) throw new Error(`sin entrada ${id}`);
  return e;
};

/* ------------------------- DOCX sintético ------------------------- */
function crc32(b: Uint8Array) {
  let c = ~0;
  for (const x of b) {
    c ^= x;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function zip(files: Record<string, string>): Uint8Array {
  const enc = new TextEncoder();
  const local: number[] = [];
  const central: number[] = [];
  const u16 = (a: number[], v: number) => a.push(v & 255, (v >>> 8) & 255);
  const u32 = (a: number[], v: number) =>
    a.push(v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255);
  let n = 0;
  for (const [name, content] of Object.entries(files)) {
    const data = enc.encode(content);
    const nb = enc.encode(name);
    const off = local.length;
    const crc = crc32(data);
    u32(local, 0x04034b50);
    u16(local, 20);
    u16(local, 0);
    u16(local, 0);
    u16(local, 0);
    u16(local, 0);
    u32(local, crc);
    u32(local, data.length);
    u32(local, data.length);
    u16(local, nb.length);
    u16(local, 0);
    local.push(...nb, ...data);
    u32(central, 0x02014b50);
    u16(central, 20);
    u16(central, 20);
    u16(central, 0);
    u16(central, 0);
    u16(central, 0);
    u16(central, 0);
    u32(central, crc);
    u32(central, data.length);
    u32(central, data.length);
    u16(central, nb.length);
    u16(central, 0);
    u16(central, 0);
    u16(central, 0);
    u16(central, 0);
    u32(central, 0);
    u32(central, off);
    central.push(...nb);
    n++;
  }
  const out = [...local, ...central];
  u32(out, 0x06054b50);
  u16(out, 0);
  u16(out, 0);
  u16(out, n);
  u16(out, n);
  u32(out, central.length);
  u32(out, local.length);
  u16(out, 0);
  return new Uint8Array(out);
}
const para = (t: string, style?: string) =>
  `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ""}<w:r><w:t xml:space="preserve">${t}</w:t></w:r></w:p>`;
/** Documento de prueba FICTICIO (no es conocimiento del Master). */
const PARRAFOS: [string, string?][] = [
  ["Capacidad sintética de prueba", "Heading1"],
  ["Vocabulario: [RV] RECOVERED VERBATIM"],
  ["Condiciones de existencia: 2"],
  ["CE1 · Existe un registro sintético."],
  ["CE2 · Existe una revisión sintética."],
  ["Borrador: CE2 · Existe una revisión preliminar."],
  ["FIXTURE-K4 · CERRADO"],
];
const docXml = `<?xml version="1.0"?><w:document xmlns:w="x"><w:body>${PARRAFOS.map(([t, s]) => para(t, s)).join("")}</w:body></w:document>`;
const stylesXml = `<?xml version="1.0"?><w:styles xmlns:w="x"><w:style w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:outlineLvl w:val="0"/></w:pPr></w:style></w:styles>`;
const DOCX = zip({
  "[Content_Types].xml": "<Types/>",
  "word/document.xml": docXml,
  "word/styles.xml": stylesXml,
});
const SYN_ID = "PC-90";

function syntheticIntake() {
  const extraction = extractRawSource({ filename: "sintetica.docx", bytes: DOCX });
  const registration = buildRawSourceRegistration({
    capabilityId: SYN_ID,
    domainId: "PC",
    masterVersion: master.version,
    filename: "sintetica.docx",
    originalRef: "original/sintetica.docx",
    textRef: "text/sintetica.txt",
    bytes: DOCX,
    extraction,
    historicalMarker: "FIXTURE-K4 · CERRADO",
    registeredAt: "2026-01-01",
  });
  const textBytes = new TextEncoder().encode(extraction.text as string);
  return { extraction, registration, textBytes, text: extraction.text as string };
}

function syntheticCandidate(
  reg: ReturnType<typeof syntheticIntake>["registration"],
  over: (c: Record<string, unknown>) => void = () => {},
) {
  const body: Record<string, unknown> = {
    candidateId: `CAND-${SYN_ID}-1`,
    capabilityId: SYN_ID,
    status: "CANDIDATE",
    registration: { registrationId: reg.registrationId, textSha256: reg.text!.sha256 },
    producedBy: { method: "AI_ASSISTED", agent: "test" },
    baselineId: `${SYN_ID}-BASELINE-TEST`,
    historicalStatus: { marker: "FIXTURE-K4 · CERRADO", sourceLines: [7, 7] },
    provenanceVocabulary: [
      { code: "RV", label: "RECOVERED VERBATIM", meaning: "texto literal", sourceLines: [2, 2] },
    ],
    controlCounts: [
      {
        label: "Condiciones de existencia",
        declared: 2,
        objectType: "CONDITION_OF_EXISTENCE",
        sourceLines: [3, 3],
      },
    ],
    verbatimKeys: ["text"],
    items: [
      {
        key: "CE1",
        classification: "FINAL_APPROVED",
        objectType: "CONDITION_OF_EXISTENCE",
        sourceId: "CE1",
        fields: { text: "Existe un registro sintético." },
        sourceLines: [4, 4],
        approvalEvidence: { text: "FIXTURE-K4 · CERRADO", sourceLines: [7, 7] },
      },
      {
        key: "CE2",
        classification: "FINAL_APPROVED",
        objectType: "CONDITION_OF_EXISTENCE",
        sourceId: "CE2",
        fields: { text: "Existe una revisión sintética." },
        sourceLines: [5, 5],
        approvalEvidence: { text: "FIXTURE-K4 · CERRADO", sourceLines: [7, 7] },
      },
      {
        key: "CE2-DRAFT",
        classification: "SUPERSEDED",
        objectType: "CONDITION_OF_EXISTENCE",
        sourceId: null,
        fields: { text: "Existe una revisión preliminar." },
        sourceLines: [6, 6],
        supersededBy: "CE2",
      },
      {
        key: "NE-1",
        classification: "NOT_EXPLICIT",
        objectType: "GAP",
        sourceId: null,
        fields: {},
        sourceLines: null,
        statement: "La fuente no declara umbral de suficiencia.",
      },
    ],
  };
  over(body);
  delete body["checksum"];
  return { ...body, checksum: computeSelfChecksum(body) };
}

/* ============================ Dry-run ============================ */
describe("Factory dry-run sobre artefactos existentes", () => {
  const r = runFactoryBatch(batchInput());

  it("OP-01 (Golden) = PUBLISHED / PASS sin razones de revisión", () => {
    const e = byId(r, "OP-01");
    expect(e.state).toBe("PUBLISHED");
    expect(e.outcome).toBe("PASS");
    expect(e.reasons.filter((x) => x.severity !== "INFO")).toEqual([]);
    expect(e.publication.status).toBe("PUBLISHED");
    expect(e.checks.find((c) => c.check === "GOLDEN_REGRESSION")?.status).toBe("PASS");
  });

  it("OP-02 = PUBLISHED / PASS tras autorización humana registrada (M2-BATCH-01)", () => {
    const e = byId(r, "OP-02");
    expect(e.state).toBe("PUBLISHED");
    expect(e.outcome).toBe("PASS");
    expect(e.reasons.filter((x) => x.severity !== "INFO")).toEqual([]);
    expect(e.publication.status).toBe("PUBLISHED");
    expect(e.publication.packChecksum).toBe(OP02_PACK_CHECKSUM);
    expect(e.governance.reviewStatus).toBe("APPROVED");
    expect(e.gaps.notExplicit).toEqual(OP02_NE);
    expect(e.transcriptionCorrections).toEqual(["TC-OP02-01"]);
    expect(e.runtimeCompatibility.extensions.map((x) => `${x.gapId}:${x.status}`)).toEqual(
      OP02_GRE,
    );
  });

  it("revisión de gobierno OP-02: rol, sin identidad personal fabricada, cita evidencia vigente", () => {
    const g = readJson(join("knowledge", "master", VERSION, "capabilities", "OP-02", "governance-review.json")) as Record<string, any>;
    expect(g["decision"]).toBe("APPROVED");
    expect(g["reviewer"]).toBe("PROJECT_OWNER / KNOWLEDGE_GOVERNANCE_AUTHORITY");
    expect(String(g["reviewerIdentity"])).toMatch(/no personal identity recorded or fabricated/);
    expect(g["reviewedAt"]).toBe("2026-09-22");
    expect(g["engineVersion"]).toBe("0.2.0");
    const dossier = readJson(governanceEvidencePath("OP-02")) as { checksum: string };
    expect(g["reviewedEvidence"]["dossierChecksum"]).toBe(dossier.checksum);
    expect(g["reviewedEvidence"]["packCandidateChecksum"]).toBe(OP02_PACK_CHECKSUM);
    const pub = readJson(join("knowledge", "packs", "op-02", "1.0.0", "published.json")) as Record<string, string>;
    expect(pub["status"]).toBe("PUBLISHED");
    expect(pub["checksum"]).toBe(OP02_PACK_CHECKSUM);
    expect(pub["requiredEngineVersion"]).toBe("0.2.0");
    expect(computeChecksum(readJson(join("knowledge", "packs", "op-02", "1.0.0", "pack.json")))).toBe(
      OP02_PACK_CHECKSUM,
    );
  });

  /*
   * La evidencia que se autorizó es reproducible: retirando la aprobación y el
   * pack publicado, la Factory vuelve a READY_FOR_PUBLICATION y recalcula
   * byte a byte el dossier revisado.
   */
  const prePublicacion = runFactoryBatch(batchInput({ capabilities: sinPublicacionOp02() }));

  it("pre-publicación reconstruida: OP-02 = READY_FOR_PUBLICATION con único motivo: autorización humana", () => {
    const e = byId(prePublicacion, "OP-02");
    expect(e.state).toBe("READY_FOR_PUBLICATION");
    expect(e.outcome).toBe("REVIEW_REQUIRED");
    expect(e.publication.status).toBe("UNPUBLISHED");
    const motivos = e.reasons.filter((x) => x.severity !== "INFO").map((x) => x.code);
    expect(motivos).toEqual(["HUMAN_PUBLICATION_AUTHORIZATION_REQUIRED"]);
    expect(e.governance.evidence).toBe("CURRENT");
  });

  it("dossier OP-02 revisado: READY_FOR_HUMAN_PUBLICATION_AUTHORIZATION sin aprobación fabricada", () => {
    const d = prePublicacion.dossiers.get("OP-02")!;
    expect(d.readiness).toBe("READY_FOR_HUMAN_PUBLICATION_AUTHORIZATION");
    expect(d.blockers).toEqual([]);
    expect(d.humanAuthorization.present).toBe(false);
    const serial = JSON.stringify(d);
    expect(serial).not.toMatch(/"reviewer"|"reviewedAt"|"signature"|"approvedBy"/);
    expect(d.historicalClosure.marker).toBe("OP02-K4-v1.0 · K4-VALIDATED · CLOSED");
    expect(d.identity.rawOriginal.sha256).toBe(
      "646fc9d1e7fc7df4825bf16a82687387437ed333204ffaff4c620a3b6ebb3da5",
    );
    expect(d.identity.rawText.sha256).toBe(
      "db27a2976db128e87cbcfa9f2df1a40f461ff91cb0eb8b07110181b5c3b34800",
    );
    expect(d.transcriptionCorrections.map((t) => t.id)).toEqual(["TC-OP02-01"]);
    expect(d.runtimeExtensions.map((x) => `${x.gapId}:${x.status}`)).toEqual(OP02_GRE);
    expect(d.notExplicit).toEqual(OP02_NE);
    expect(d.governedBacklog).toEqual(["A-OP02-01", "A-OP02-02", "A-OP02-03"]);
    expect(d.engine.current).toBe("0.2.0");
    expect(d.engine.required).toBe("0.2.0");
    expect(d.checks.every((c) => c.status !== "FAIL")).toBe(true);
  });

  it("dossier en disco = dossier revisado recalculado (la aprobación cita exactamente esta evidencia)", () => {
    const d = prePublicacion.dossiers.get("OP-02")!;
    expect(readJson(governanceEvidencePath("OP-02"))).toEqual(JSON.parse(JSON.stringify(d)));
  });

  it("batch manifest en disco = manifest recalculado; benchmark sincronizado", () => {
    expect(readJson(BATCH_MANIFEST_PATH)).toEqual(JSON.parse(JSON.stringify(r.manifest)));
    expect(readFileSync(join(ROOT, BENCHMARK_PATH), "utf8")).toBe(buildFactoryBenchmarkMarkdown(r));
  });

  it("manifest: 31 slots, 26 sin fuente, señal AUTHORITATIVE_SOURCE_REQUIRED, sin issues de lote", () => {
    expect(r.manifest.expectedCapabilityCount).toBe(31);
    expect(r.manifest.unregisteredSlotCount).toBe(26);
    expect(r.manifest.signal).toBe("AUTHORITATIVE_SOURCE_REQUIRED");
    expect(r.batchIssues).toEqual([]);
    for (const e of r.manifest.entries) {
      for (const k of [
        "capabilityId",
        "domainId",
        "rawSource",
        "extraction",
        "canonical",
        "provenance",
        "gaps",
        "transcriptionCorrections",
        "runtimeCompatibility",
        "fixtures",
        "governance",
        "publication",
        "state",
        "outcome",
      ])
        expect(e).toHaveProperty(k);
      expect(FACTORY_STATES).toContain(e.state);
    }
    const op = r.manifest.domains.find((d) => d.domainId === "OP")!;
    expect(op.registered).toEqual(["OP-01", "OP-02", "OP-03", "OP-04", "OP-05"]);
    expect(op.unregisteredSlots).toBe(0);
  });

  it("versión de engine requerida por capacidad es independiente de la versión del pack", () => {
    expect(byId(r, "OP-01").runtimeCompatibility.requiredEngineVersion).toBe("0.1.0");
    expect(byId(r, "OP-02").runtimeCompatibility.requiredEngineVersion).toBe("0.2.0");
    expect(byId(r, "OP-01").publication.packVersion).toBe("1.0.0");
    expect(byId(r, "OP-02").publication.packVersion).toBe("1.0.0");
    r.entries.forEach((e) => expect(e.runtimeCompatibility.compatible).toBe(true));
  });

  it("determinismo: dos ejecuciones producen el mismo manifest y dossiers", () => {
    const b = runFactoryBatch(batchInput());
    expect(b.manifest).toEqual(r.manifest);
    expect([...b.dossiers.entries()]).toEqual([...r.dossiers.entries()]);
  });
});

/* =========================== Aislamiento =========================== */
describe("Aislamiento por capacidad", () => {
  const base = runFactoryBatch(batchInput());
  const golden = byId(base, "OP-01");

  it("corromper la baseline de OP-02 → OP-02 FAIL; OP-01 idéntico", () => {
    const caps = loadFactoryCapabilityInputs(ROOT, VERSION).map((c) => {
      if (c.capabilityId !== golden.capabilityId && c.master?.canonical) {
        const b = clone(c.master.canonical.baseline) as {
          objects: { fields: Record<string, unknown> }[];
        };
        b.objects[0]!.fields = { ...b.objects[0]!.fields, text: "texto inventado" };
        return { ...c, master: { ...c.master, canonical: { ...c.master.canonical, baseline: b } } };
      }
      return c;
    });
    const r = runFactoryBatch(batchInput({ capabilities: caps }));
    expect(byId(r, "OP-02").outcome).toBe("FAIL");
    expect(byId(r, "OP-02").state).not.toBe("READY_FOR_PUBLICATION");
    expect(byId(r, "OP-01")).toEqual(golden);
  });

  it("fuente ejecutable inválida (excepción) queda aislada", () => {
    const caps = loadFactoryCapabilityInputs(ROOT, VERSION).map((c) =>
      c.master?.pipelineInput && c.capabilityId !== golden.capabilityId
        ? {
            ...c,
            master: {
              ...c.master,
              pipelineInput: {
                ...c.master.pipelineInput,
                source: { capability: { id: c.capabilityId } },
              },
            },
          }
        : c,
    );
    const r = runFactoryBatch(batchInput({ capabilities: caps }));
    expect(byId(r, "OP-02").outcome).toBe("FAIL");
    expect(byId(r, "OP-01")).toEqual(golden);
  });

  it("alterar el Golden Pack publicado → OP-01 FAIL (regresión); OP-02 intacto", () => {
    const op02 = byId(base, "OP-02");
    const caps = loadFactoryCapabilityInputs(ROOT, VERSION).map((c) => {
      const pp = c.master?.pipelineInput?.publishedPack;
      if (!pp || c.capabilityId !== "OP-01") return c;
      const pack = clone(pp.pack) as Record<string, unknown>;
      pack["governanceNote"] = "alterado";
      return {
        ...c,
        master: {
          ...c.master!,
          pipelineInput: { ...c.master!.pipelineInput!, publishedPack: { ...pp, pack } },
        },
      };
    });
    const r = runFactoryBatch(batchInput({ capabilities: caps }));
    expect(byId(r, "OP-01").outcome).toBe("FAIL");
    expect(byId(r, "OP-01").checks.find((c) => c.check === "GOLDEN_REGRESSION")?.status).toBe(
      "FAIL",
    );
    expect(byId(r, "OP-02").outcome).toBe(op02.outcome);
  });

  it("dossier en disco desactualizado → REVIEW, no FAIL, y no READY_FOR_PUBLICATION", () => {
    const caps = sinPublicacionOp02().map((c) =>
      c.governanceEvidenceOnDisk
        ? {
            ...c,
            governanceEvidenceOnDisk: {
              ...(c.governanceEvidenceOnDisk as object),
              checksum: `sha256:${"0".repeat(64)}`,
            },
          }
        : c,
    );
    const r = runFactoryBatch(batchInput({ capabilities: caps }));
    const e = byId(r, "OP-02");
    expect(e.governance.evidence).toBe("OUTDATED");
    expect(e.outcome).toBe("REVIEW_REQUIRED");
    expect(e.state).toBe("VALIDATED");
  });
});

/* ===================== Registro de extensiones ===================== */
describe("Registro genérico de extensiones runtime", () => {
  it("registro vigente válido y cerrado por cambios reales del engine 0.2.0", () => {
    const v = validateRuntimeExtensionRegistry({
      registry,
      engineSemver: ENGINE_SEMVER,
      engineChangeIds: engine.changeIds,
    });
    expect(v.issues).toEqual([]);
    expect(
      v.registry?.entries.every(
        (e) => e.status === "CLOSED" && e.closedInEngineVersion === "0.2.0",
      ),
    ).toBe(true);
  });

  it("cierre en una versión de engine futura → inválido", () => {
    const r = clone(registry) as { entries: { closedInEngineVersion: string }[] };
    r.entries[0]!.closedInEngineVersion = "9.0.0";
    delete (r as Record<string, unknown>)["checksum"];
    const v = validateRuntimeExtensionRegistry({
      registry: { ...r, checksum: computeSelfChecksum(r) },
      engineSemver: ENGINE_SEMVER,
      engineChangeIds: engine.changeIds,
    });
    expect(v.ok).toBe(false);
  });

  it("extensión reabierta y bloqueante → OP-02 no READY; OP-01 no afectado", () => {
    const r = clone(registry) as { entries: Record<string, unknown>[] };
    r.entries[0]!["status"] = "OPEN";
    delete r.entries[0]!["closedInEngineVersion"];
    r.entries[0]!["publicationBlockingWhileOpen"] = true;
    delete (r as Record<string, unknown>)["checksum"];
    const res = runFactoryBatch(
      batchInput({ extensionRegistry: { ...r, checksum: computeSelfChecksum(r) } }),
    );
    const e = byId(res, "OP-02");
    expect(e.outcome).not.toBe("PASS");
    expect(e.state).not.toBe("READY_FOR_PUBLICATION");
    expect(e.reasons.some((x) => x.check === "RUNTIME_COMPATIBILITY")).toBe(true);
    expect(byId(res, "OP-01").outcome).toBe("PASS");
  });

  it("ocurrencia no registrada → REVIEW con acción concreta", () => {
    const r = clone(registry) as { entries: { occurrences: unknown[] }[] };
    r.entries[1]!.occurrences = [];
    delete (r as Record<string, unknown>)["checksum"];
    const res = runFactoryBatch(
      batchInput({ extensionRegistry: { ...r, checksum: computeSelfChecksum(r) } }),
    );
    const x = byId(res, "OP-02").reasons.find((z) => z.code === "RUNTIME_EXTENSION_UNREGISTERED");
    expect(x?.severity).toBe("REVIEW");
    expect(x?.objectKey).toBe("GRE-OP02-02");
  });
});

/* ========================= Anti-branching ========================= */
describe("Detección de branching específico de capacidad", () => {
  it("el código genérico real está limpio", () => {
    expect(
      detectCapabilitySpecificBranching(loadGenericCodeCorpus(ROOT), ["OP-01", "OP-02"]),
    ).toEqual([]);
  });

  it("detecta comparaciones y literales por identificador; ignora comentarios", () => {
    const hits = detectCapabilitySpecificBranching(
      [
        { path: "a.ts", content: 'if (pack.capabilityId === "XX-01") run();' },
        { path: "b.ts", content: 'const t = { "XX-01": handler };' },
        { path: "c.ts", content: '/** p. ej. "XX-01" */\n// "XX-01"\nconst ok = 1;' },
      ],
      ["XX-01"],
    );
    expect(hits.some((h) => h.path === "a.ts")).toBe(true);
    expect(hits.some((h) => h.path === "b.ts" && h.identifier === "XX-01")).toBe(true);
    expect(hits.some((h) => h.path === "c.ts")).toBe(false);
    expect(stripComments('a // "x"\n/* "y" */b').includes('"x"')).toBe(false);
  });

  it("branching inyectado en el corpus → CAPABILITY_BRANCHING FAIL para la capacidad afectada", () => {
    const corpus = [
      ...loadGenericCodeCorpus(ROOT),
      { path: "inyectado.ts", content: 'if (id === "OP-02") hack();' },
    ];
    const r = runFactoryBatch(batchInput({ codeCorpus: corpus }));
    expect(byId(r, "OP-02").checks.find((c) => c.check === "CAPABILITY_BRANCHING")?.status).toBe(
      "FAIL",
    );
    expect(byId(r, "OP-02").outcome).toBe("FAIL");
  });
});

/* ========================== Registro raw ========================== */
describe("Registro de fuente raw", () => {
  const s = syntheticIntake();

  it("DOCX: texto determinista, outline y SHA-256 del original", () => {
    expect(s.text.split("\n")[0]).toBe("# Capacidad sintética de prueba");
    expect(s.registration.original.sha256).toBe(sha256Bytes(DOCX));
    expect(s.registration.outline[0]).toMatchObject({ line: 1, level: 1 });
    expect(extractRawSource({ filename: "sintetica.docx", bytes: DOCX }).text).toBe(s.text);
    expect(s.registration.declaredHistoricalMarker?.lines).toEqual([7]);
  });

  it("verificación: re-extracción byte a byte; original o texto alterados → FAIL", () => {
    const ok = verifyRawSourceRegistration({
      registration: s.registration,
      expectedCapabilityId: SYN_ID,
      originalBytes: DOCX,
      textBytes: s.textBytes,
    });
    expect(ok.ok).toBe(true);
    expect(ok.reextractionVerified).toBe(true);
    const otroOriginal = zip({ "word/document.xml": docXml.replace("sintético.", "alterado.") });
    expect(
      verifyRawSourceRegistration({
        registration: s.registration,
        originalBytes: otroOriginal,
        textBytes: s.textBytes,
      }).ok,
    ).toBe(false);
    const otroTexto = new TextEncoder().encode(s.text.replace("sintético", "editado"));
    expect(
      verifyRawSourceRegistration({
        registration: s.registration,
        originalBytes: DOCX,
        textBytes: otroTexto,
      }).ok,
    ).toBe(false);
  });

  it("PDF sin herramienta de extracción → EXTRACTOR_UNAVAILABLE explícito (nunca texto inventado)", () => {
    const pdf = new TextEncoder().encode("%PDF-1.4\n%fake");
    const r = extractRawSource({ filename: "x.pdf", bytes: pdf, pdfRunner: null });
    expect(r.text).toBeNull();
    expect(r.warnings.join(" ")).toMatch(/EXTRACTOR_UNAVAILABLE/);
  });
});

/* ======================= Frontera de candidatos ======================= */
describe("Frontera de extracción de candidatos", () => {
  const s = syntheticIntake();

  it("candidato literal válido; IA → REVIEW (dato candidato hasta aceptación)", () => {
    const v = validateExtractionCandidate({
      candidate: syntheticCandidate(s.registration),
      registration: s.registration,
      rawText: s.text,
      extensionRegistry: null,
    });
    expect(v.ok).toBe(true);
    expect(v.issues.map((i) => i.code)).toEqual(["AI_ASSISTED_EXTRACTION"]);
    expect(v.summary?.notExplicitCount).toBe(1);
  });

  it("texto no literal → NOT_VERBATIM FAIL", () => {
    const c = syntheticCandidate(s.registration, (b) => {
      (b["items"] as { fields: Record<string, string> }[])[0]!.fields = {
        text: "Existe un registro mejorado.",
      };
    });
    const v = validateExtractionCandidate({
      candidate: c,
      registration: s.registration,
      rawText: s.text,
      extensionRegistry: null,
    });
    expect(v.issues.some((i) => i.code === "NOT_VERBATIM" && i.severity === "FAIL")).toBe(true);
  });

  it("rellenar silencio NOT_EXPLICIT → SILENCE_FILLED FAIL", () => {
    const c = syntheticCandidate(s.registration, (b) => {
      (b["items"] as { fields: Record<string, string> }[])[3]!.fields = {
        text: "Existe un registro sintético.",
      };
    });
    const v = validateExtractionCandidate({
      candidate: c,
      registration: s.registration,
      rawText: s.text,
      extensionRegistry: null,
    });
    expect(v.issues.some((i) => i.code === "SILENCE_FILLED")).toBe(true);
  });

  it("borrador promovido por cronología (sin evidencia de aprobación) → REVIEW; conteo de control no cuadra → REVIEW", () => {
    const c = syntheticCandidate(s.registration, (b) => {
      const items = b["items"] as Record<string, unknown>[];
      delete items[1]!["approvalEvidence"];
      items.splice(2, 1);
      items.push({
        key: "CE3",
        classification: "FINAL_APPROVED",
        objectType: "CONDITION_OF_EXISTENCE",
        sourceId: null,
        fields: { text: "Existe una revisión preliminar." },
        sourceLines: [6, 6],
      });
    });
    const v = validateExtractionCandidate({
      candidate: c,
      registration: s.registration,
      rawText: s.text,
      extensionRegistry: null,
    });
    const codes = v.issues.map((i) => i.code);
    expect(codes).toContain("APPROVAL_EVIDENCE_MISSING");
    expect(codes).toContain("CONTROL_COUNT_MISMATCH");
  });

  it("GENERIC_RUNTIME_EXTENSION_REQUIRED no registrada → REVIEW accionable", () => {
    const c = syntheticCandidate(s.registration, (b) => {
      (b["items"] as unknown[]).push({
        key: "GRE-1",
        classification: "GENERIC_RUNTIME_EXTENSION_REQUIRED",
        objectType: "GAP",
        sourceId: null,
        fields: {},
        sourceLines: [5, 5],
        statement: "constructo no soportado",
        semanticCapability: "SYNTHETIC_CONSTRUCT",
        affectedObjectKeys: ["CE2"],
        publicationBlocking: true,
      });
    });
    const v = validateExtractionCandidate({
      candidate: c,
      registration: s.registration,
      rawText: s.text,
      extensionRegistry: null,
    });
    expect(v.issues.find((i) => i.code === "RUNTIME_EXTENSION_UNREGISTERED")?.message).toMatch(
      /runtime-extensions\.json/,
    );
  });

  it("promoción: sin aceptación / aceptación sobre otro checksum → bloqueada; ACCEPTED vigente → baseline", () => {
    const cand = syntheticCandidate(s.registration);
    const v = validateExtractionCandidate({
      candidate: cand,
      registration: s.registration,
      rawText: s.text,
      extensionRegistry: null,
    });
    const base = {
      validation: v,
      registration: s.registration,
      rawRef: "raw/sintetica.txt",
      sourceRef: "source.json",
    };
    expect(promoteCandidateToCanonicalBaseline({ ...base, acceptance: undefined }).ok).toBe(false);
    const acc = {
      capabilityId: SYN_ID,
      candidateChecksum: `sha256:${"1".repeat(64)}`,
      decision: "ACCEPTED",
      reviewer: "test",
      reviewedAt: "2026-01-01",
    };
    expect(promoteCandidateToCanonicalBaseline({ ...base, acceptance: acc }).ok).toBe(false);
    const p = promoteCandidateToCanonicalBaseline({
      ...base,
      acceptance: { ...acc, candidateChecksum: cand.checksum },
    });
    expect(p.ok).toBe(true);
    if (p.ok) {
      expect(p.baseline.objects.map((o) => o.key)).toEqual(["CE1", "CE2"]);
      expect(p.baseline.supersessions).toHaveLength(1);
      expect(p.baseline.gaps.map((g) => g.id)).toEqual(["NE-1"]);
    }
  });
});

/* ===================== Intake en el lote (sintético) ===================== */
describe("Estados independientes de intake en el mismo lote", () => {
  const s = syntheticIntake();
  const intake = (
    extra: Partial<FactoryCapabilityInput["intake"]> = {},
  ): FactoryCapabilityInput => ({
    capabilityId: SYN_ID,
    intake: { registration: s.registration, originalBytes: DOCX, textBytes: s.textBytes, ...extra },
  });
  const run = (c: FactoryCapabilityInput) =>
    runFactoryBatch(
      batchInput({ capabilities: [...loadFactoryCapabilityInputs(ROOT, VERSION), c] }),
    );
  const base = runFactoryBatch(batchInput());

  it("registrado sin candidato → REGISTERED / REVIEW; OP-01 y OP-02 sin cambios", () => {
    const r = run(intake());
    expect(byId(r, SYN_ID).state).toBe("REGISTERED");
    expect(byId(r, SYN_ID).outcome).toBe("REVIEW_REQUIRED");
    expect(byId(r, "OP-01")).toEqual(byId(base, "OP-01"));
    expect(byId(r, "OP-02")).toEqual(byId(base, "OP-02"));
    expect(r.manifest.unregisteredSlotCount).toBe(25);
  });

  it("candidato válido → CANONICAL_REVIEW_REQUIRED; candidato no literal → FAIL aislado", () => {
    expect(byId(run(intake({ candidate: syntheticCandidate(s.registration) })), SYN_ID).state).toBe(
      "CANONICAL_REVIEW_REQUIRED",
    );
    const malo = syntheticCandidate(s.registration, (b) => {
      (b["items"] as { fields: Record<string, string> }[])[0]!.fields = { text: "inventado" };
    });
    const r = run(intake({ candidate: malo }));
    expect(byId(r, SYN_ID).outcome).toBe("FAIL");
    expect(byId(r, "OP-02")).toEqual(byId(base, "OP-02"));
  });

  it("original alterado → RAW_REGISTRATION FAIL", () => {
    const r = run(
      intake({ originalBytes: zip({ "word/document.xml": docXml.replace("CERRADO", "ABIERTO") }) }),
    );
    expect(byId(r, SYN_ID).checks.find((c) => c.check === "RAW_REGISTRATION")?.status).toBe("FAIL");
  });

  it("dominio inexistente → FAIL", () => {
    const reg = { ...s.registration, domainId: "ZZ" } as Record<string, unknown>;
    delete reg["checksum"];
    const r = run(intake({ registration: { ...reg, checksum: computeSelfChecksum(reg) } }));
    expect(byId(r, SYN_ID).reasons.some((x) => x.code === "UNKNOWN_DOMAIN")).toBe(true);
  });
});
