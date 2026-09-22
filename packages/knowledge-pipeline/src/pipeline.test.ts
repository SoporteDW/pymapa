/**
 * M2-A · Knowledge Industrialization Pipeline.
 *
 * Verifica el pipeline con una capacidad sintética (FIXTURE-CAP) y la
 * regresión del Golden Pack OP-01. Ningún test introduce conocimiento nuevo.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AUTHORITATIVE_SOURCE_REQUIRED,
  PIPELINE_OPERATIONS,
  assertPublishedPackUnchanged,
  buildCapabilityManifest,
  buildGovernanceReviewReport,
  computeChecksum,
  computeSelfChecksum,
  discoverCapabilityPipelineInputs,
  evaluatePublicationGate,
  generatePackCandidate,
  loadMasterIndex,
  runBatch,
  runCapabilityPipeline,
  runKnowledgeTests,
  runRuntimeAcceptance,
  runValidationPipeline,
  sourceToPackDiff,
  validateCapabilitySource,
  validateMasterIndex,
  validateRuntimeCompatibility,
} from "./index.ts";
import type { CapabilitySource } from "./master.ts";

const ROOT = process.cwd();
const PIPELINE_SRC = join(ROOT, "packages", "knowledge-pipeline", "src");

/* ------------------------------------------------------------------ */
/* Fuente sintética: estructura, nunca conocimiento de negocio          */
/* ------------------------------------------------------------------ */

const PREGUNTA = "Enunciado gobernado de la adquisición sintética.";

function fuenteBase(): Record<string, unknown> {
  const fuente: Record<string, unknown> = {
    master: {
      identity: "PYMAPA-KNOWLEDGE-MASTER",
      version: "1.0",
      baselineStatus: "BASELINE-APPROVED",
    },
    capability: {
      id: "FIXTURE-CAP",
      domainId: "FX",
      name: "Capacidad sintética de prueba",
      definition: "Existe solo para verificar el pipeline; no representa conocimiento aprobado.",
    },
    provenance: {
      sourceReference: "FIXTURE · paquete sintético de prueba",
      extractionStatus: "APPROVED",
      derivation: "MASTER_TRANSCRIPTION",
      approvedBy: "Pruebas de arquitectura",
      approvedAt: "2026-01-01",
    },
    targetPack: { packId: "fixture-cap", packVersion: "1.0.0" },
    sections: {
      capability: {
        id: "FIXTURE-CAP",
        domainId: "FX",
        name: "Capacidad sintética de prueba",
        definition: "Existe solo para verificar el pipeline; no representa conocimiento aprobado.",
      },
      variables: [
        {
          id: "V1",
          name: "Variable sintética",
          criticality: "CRITICAL",
          minimumEvidence: "E1",
          semanticStates: ["Definida"],
        },
        {
          id: "V2",
          name: "Variable sin estados enumerados",
          criticality: "IMPORTANT",
          minimumEvidence: "E1",
          semanticStates: null,
        },
      ],
      informationNeeds: [
        { id: "N1", variableRefs: ["V1"], acquisitionRefs: ["A1"], mappingStatus: "EXPLICIT" },
      ],
      acquisitions: [
        {
          id: "A1",
          level: "P1",
          informationNeedRef: "N1",
          variableRefs: ["V1"],
          question: PREGUNTA,
          responseModel: {
            kind: "semantic_state_or_unknown",
            preservesUnknown: true,
            knowledgeStates: ["KNOWN", "UNKNOWN", "NOT_APPLICABLE", "CONTRADICTORY"],
            semanticValuesFromVariable: "V1",
            optionSet: null,
            optionSetStatus: "NOT_EXPLICIT_IN_KNOWLEDGE_MASTER",
          },
        },
      ],
      knowledgeChangeCandidates: [
        { id: "FX-KCC-01", statement: "El material sintético no declara umbral alguno." },
      ],
      rules: [
        {
          id: "R1",
          statement: "Enunciado de juicio gobernado sin algoritmo aprobado.",
          classification: "GOVERNED_JUDGMENT",
          implemented: false,
        },
      ],
    },
    gaps: [
      {
        id: "FX-KCC-01",
        kind: "KNOWLEDGE_CHANGE_CANDIDATE",
        statement: "El material sintético no declara umbral alguno.",
        publicationBlocking: false,
      },
    ],
  };
  fuente["checksum"] = computeSelfChecksum(fuente);
  return fuente;
}

function fuenteValidada(mutar?: (f: Record<string, unknown>) => void): CapabilitySource {
  const bruto = fuenteBase();
  mutar?.(bruto);
  bruto["checksum"] = computeSelfChecksum(bruto);
  const validada = validateCapabilitySource(bruto);
  if (!validada.ok) throw new Error(JSON.stringify(validada.issues));
  return validada.value;
}

function candidatoDe(source: CapabilitySource) {
  const generado = generatePackCandidate(source);
  if (!generado.ok) throw new Error(JSON.stringify(generado.issues));
  return generado.candidate;
}

/* ------------------------------------------------------------------ */
/* Fuente gobernada                                                    */
/* ------------------------------------------------------------------ */

describe("M2-A · fuente gobernada", () => {
  it("el Master exige identidad y versión autorizadas", () => {
    const master = loadMasterIndex(ROOT, "v1.0") as Record<string, unknown>;
    expect(validateMasterIndex(master).ok).toBe(true);

    const sinIdentidad = { ...master, identity: "OTRO-MASTER" };
    const r1 = validateMasterIndex(sinIdentidad);
    expect(r1.ok).toBe(false);

    const sinVersion = { ...master };
    delete sinVersion["version"];
    expect(validateMasterIndex(sinVersion).ok).toBe(false);

    const sinBaseline = { ...master, baselineStatus: "DRAFT" };
    expect(validateMasterIndex(sinBaseline).ok).toBe(false);
  });

  it("la fuente de una capacidad exige procedencia", () => {
    const sinProcedencia = fuenteBase();
    delete (sinProcedencia as Record<string, unknown>)["provenance"];
    expect(validateCapabilitySource(sinProcedencia).ok).toBe(false);

    const sinReferencia = fuenteBase();
    (sinReferencia["provenance"] as Record<string, unknown>)["sourceReference"] = "";
    expect(validateCapabilitySource(sinReferencia).ok).toBe(false);
  });

  it("el manifest no marca SOURCE_READY una capacidad sin fuente real", () => {
    const master = validateMasterIndex(loadMasterIndex(ROOT, "v1.0"));
    if (!master.ok) throw new Error("master inválido");
    const manifest = buildCapabilityManifest({ master: master.value, results: [] });
    expect(manifest.expectedCapabilityCount).toBe(31);
    expect(manifest.sourceReadyCount).toBeLessThan(manifest.expectedCapabilityCount);
    expect(manifest.missingSourceCount).toBe(29);
    expect(manifest.signal).toBe(AUTHORITATIVE_SOURCE_REQUIRED);
    expect(
      manifest.entries.every((e) =>
        e.sourceAvailability === "SOURCE_READY" ? Boolean(e.sourceVersion) : true,
      ),
    ).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* Generador                                                           */
/* ------------------------------------------------------------------ */

describe("M2-A · generador determinístico", () => {
  it("preserva IDs de variables, necesidades, adquisiciones y reglas", () => {
    const source = fuenteValidada();
    const { pack } = candidatoDe(source);
    const ids = (clave: string) => ((pack[clave] ?? []) as { id: string }[]).map((x) => x.id);
    expect(ids("variables")).toEqual(["V1", "V2"]);
    expect(ids("informationNeeds")).toEqual(["N1"]);
    expect(ids("acquisitions")).toEqual(["A1"]);
    expect(ids("rules")).toEqual(["R1"]);
  });

  it("preserva el wording gobernado sin reformular", () => {
    const source = fuenteValidada();
    const { pack } = candidatoDe(source);
    const adquisiciones = pack["acquisitions"] as { question: string }[];
    expect(adquisiciones[0]?.question).toBe(PREGUNTA);
  });

  it("preserva los gaps declarados por la fuente", () => {
    const candidate = candidatoDe(fuenteValidada());
    expect(candidate.gaps.map((g) => g.id)).toEqual(["FX-KCC-01"]);
    expect(candidate.gaps[0]?.kind).toBe("KNOWLEDGE_CHANGE_CANDIDATE");
  });

  it("no inventa un campo semántico ausente", () => {
    const candidate = candidatoDe(fuenteValidada());
    const variables = candidate.pack["variables"] as { id: string; semanticStates: unknown }[];
    expect(variables[1]?.semanticStates).toBeNull();
    const adquisicion = (
      candidate.pack["acquisitions"] as { responseModel: Record<string, unknown> }[]
    )[0];
    expect(adquisicion?.responseModel["optionSet"]).toBeNull();
    expect(adquisicion?.responseModel["optionSetStatus"]).toBe("NOT_EXPLICIT_IN_KNOWLEDGE_MASTER");
    // Tampoco aparecen secciones que la fuente no declara.
    expect(candidate.pack["findings"]).toBeUndefined();
    expect(candidate.pack["evidence"]).toBeUndefined();
    expect(candidate.pack["validationRequirements"]).toBeUndefined();
  });

  it("no promueve un juicio gobernado a determinístico", () => {
    const source = fuenteValidada();
    const candidate = candidatoDe(source);
    const reglas = candidate.pack["rules"] as { classification: string }[];
    expect(reglas[0]?.classification).toBe("GOVERNED_JUDGMENT");

    // Si el candidato declarara DETERMINISTIC sin base, gobierno lo rechaza.
    const alterado = structuredClone(candidate);
    (alterado.pack["rules"] as { classification: string }[])[0]!.classification = "DETERMINISTIC";
    const validacion = runValidationPipeline({ source, candidate: alterado });
    expect(validacion.ok).toBe(false);
    expect(validacion.issues.map((i) => i.code)).toContain(
      "DETERMINISTIC_RULE_WITHOUT_EXPLICIT_BASIS",
    );
  });

  it("es determinístico: misma fuente, mismo checksum", () => {
    const a = candidatoDe(fuenteValidada());
    const b = candidatoDe(fuenteValidada());
    expect(a.checksum).toBe(b.checksum);
  });
});

/* ------------------------------------------------------------------ */
/* Publication gate                                                    */
/* ------------------------------------------------------------------ */

function puerta(
  source: CapabilitySource,
  candidate = candidatoDe(source),
  fixtures: unknown[] = [],
) {
  const validation = runValidationPipeline({ source, candidate });
  const knowledgeTests = runKnowledgeTests({ candidate, source });
  const runtimeResults = fixtures.map((fixture) =>
    runRuntimeAcceptance({ pack: candidate.pack, fixture }),
  );
  return evaluatePublicationGate({
    validation,
    knowledgeTests,
    runtimeResults,
    gaps: source.gaps,
    governanceReview: { decision: "APPROVED", reviewer: "pruebas", reviewedAt: "2026-01-01" },
  });
}

describe("M2-A · publication gate", () => {
  it("una falla de schema bloquea la publicación", () => {
    const source = fuenteValidada();
    const candidate = candidatoDe(source);
    delete (candidate.pack as Record<string, unknown>)["variables"];
    const resultado = puerta(source, candidate);
    expect(resultado.state).not.toBe("PUBLISHED");
    expect(resultado.blockers.map((b) => b.code)).toContain("SCHEMA_VALIDATION_FAILED");
  });

  it("una falla referencial bloquea la publicación", () => {
    const source = fuenteValidada((f) => {
      const secciones = f["sections"] as Record<string, unknown>;
      (secciones["informationNeeds"] as { acquisitionRefs: string[] }[])[0]!.acquisitionRefs = [
        "INEXISTENTE",
      ];
    });
    const resultado = puerta(source);
    expect(resultado.state).not.toBe("PUBLISHED");
    expect(resultado.blockers.map((b) => b.code)).toContain("REFERENTIAL_VALIDATION_FAILED");
  });

  it("una inferencia no autorizada bloquea la publicación", () => {
    const source = fuenteValidada();
    const candidate = candidatoDe(source);
    (candidate.pack["variables"] as { id: string; semanticStates: unknown }[])[1]!.semanticStates =
      ["Estado inventado"];
    const resultado = puerta(source, candidate);
    expect(resultado.state).not.toBe("PUBLISHED");
    expect(resultado.blockers.map((b) => b.code)).toContain("UNAUTHORIZED_INFERENCE");
  });

  it("una construcción no soportada produce GENERIC_RUNTIME_EXTENSION_REQUIRED y bloquea", () => {
    const source = fuenteValidada((f) => {
      const secciones = f["sections"] as Record<string, unknown>;
      (secciones["rules"] as { classification: string }[])[0]!.classification =
        "PROBABILISTIC_INFERENCE";
    });
    const candidate = candidatoDe(source);
    const compat = validateRuntimeCompatibility(candidate.pack);
    expect(compat.ok).toBe(false);
    expect(compat.issues.map((i) => i.code)).toContain("GENERIC_RUNTIME_EXTENSION_REQUIRED");
    const resultado = puerta(source, candidate);
    expect(resultado.blockers.map((b) => b.code)).toContain("GENERIC_RUNTIME_EXTENSION_REQUIRED");
    expect(resultado.state).not.toBe("PUBLISHED");
  });

  it("un gap publication-blocking bloquea la publicación, y un KCC no bloqueante no", () => {
    const bloqueante = fuenteValidada((f) => {
      (f["gaps"] as { publicationBlocking: boolean }[])[0]!.publicationBlocking = true;
    });
    expect(puerta(bloqueante).blockers.map((b) => b.code)).toContain("PUBLICATION_BLOCKING_GAP");
    expect(puerta(fuenteValidada()).state).toBe("PUBLISHED");
  });

  it("sin aprobación de gobierno el pack queda VALIDATED, nunca PUBLISHED", () => {
    const source = fuenteValidada();
    const candidate = candidatoDe(source);
    const resultado = evaluatePublicationGate({
      validation: runValidationPipeline({ source, candidate }),
      knowledgeTests: runKnowledgeTests({ candidate, source }),
      runtimeResults: [],
      gaps: source.gaps,
    });
    expect(resultado.state).toBe("VALIDATED");
    expect(resultado.blockers.map((b) => b.code)).toContain("GOVERNANCE_REVIEW_PENDING");
  });

  it("un pack publicado no puede modificarse silenciosamente", () => {
    const pack = JSON.parse(
      readFileSync(join(ROOT, "knowledge", "packs", "op-01", "1.0.0", "pack.json"), "utf8"),
    ) as Record<string, unknown>;
    const registro = JSON.parse(
      readFileSync(join(ROOT, "knowledge", "packs", "op-01", "1.0.0", "published.json"), "utf8"),
    ) as { packId: string; packVersion: string; checksum: string; status: "PUBLISHED" };
    expect(assertPublishedPackUnchanged(registro, pack).ok).toBe(true);

    const alterado = structuredClone(pack);
    (alterado["capability"] as Record<string, unknown>)["definition"] = "definición alterada";
    const violacion = assertPublishedPackUnchanged(registro, alterado);
    expect(violacion.ok).toBe(false);
    expect(violacion.message).toContain("inmutable");
    expect(computeChecksum(alterado)).not.toBe(registro.checksum);
  });
});

/* ------------------------------------------------------------------ */
/* Fixtures y harness de runtime                                       */
/* ------------------------------------------------------------------ */

describe("M2-A · harness de fixtures", () => {
  const pack = JSON.parse(
    readFileSync(join(ROOT, "knowledge", "packs", "op-01", "1.0.0", "pack.json"), "utf8"),
  ) as unknown;

  function fixtureOp01(nombre: string): unknown {
    return JSON.parse(
      readFileSync(join(ROOT, "knowledge", "fixtures", "op-01", nombre), "utf8"),
    ) as unknown;
  }

  it("acepta UNKNOWN como resultado esperado legítimo", () => {
    const resultado = runRuntimeAcceptance({
      pack,
      fixture: fixtureOp01("op01-p01-unknown-preserved.fixture.json"),
    });
    expect(resultado.outcome).toBe("PASS");
    expect(resultado.observed.variableStates).toContainEqual({
      variableRef: "VA01",
      state: "UNKNOWN",
      semanticValue: null,
    });
    expect(resultado.observed.confirmedFindings).toBe(0);
  });

  it("acepta CONTRADICTORY y NOT_APPLICABLE como resultados esperados legítimos", () => {
    const contradictorio = runRuntimeAcceptance({
      pack,
      fixture: fixtureOp01("op01-p01-contradictory.fixture.json"),
    });
    expect(contradictorio.outcome).toBe("PASS");
    expect(contradictorio.observed.contradictionVariableRefs).toEqual(["VA01"]);

    const noAplica = runRuntimeAcceptance({
      pack,
      fixture: fixtureOp01("op01-p01-not-applicable.fixture.json"),
    });
    expect(noAplica.outcome).toBe("PASS");
  });

  it("un fixture mal formado falla en lugar de pasar en silencio", () => {
    const invalido = JSON.parse(
      JSON.stringify(fixtureOp01("op01-p01-not-applicable.fixture.json")),
    ) as { observations: { notApplicableReason?: string | null }[] };
    invalido.observations[0]!.notApplicableReason = null;
    const resultado = runRuntimeAcceptance({ pack, fixture: invalido });
    expect(resultado.outcome).toBe("FAIL");
  });

  it("el harness ejecuta cualquier pack sin branching por capacidad", () => {
    const source = fuenteValidada();
    const candidate = candidatoDe(source);
    const resultado = runRuntimeAcceptance({
      pack: candidate.pack,
      fixture: {
        fixtureId: "FX-UNKNOWN",
        capabilityId: "FIXTURE-CAP",
        packId: "fixture-cap",
        packVersion: "1.0.0",
        kind: "ARCHITECTURE_RUNTIME",
        description: "UNKNOWN sobre una capacidad sintética",
        knowledgeVersionId: "kv-fixture",
        observations: [
          {
            id: "o1",
            variableRef: "V1",
            acquisitionRef: "A1",
            knowledgeState: "UNKNOWN",
            semanticValue: null,
            sourceResponseId: null,
            recordedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        expected: {
          outcome: "PASS",
          variableStates: [{ variableRef: "V1", state: "UNKNOWN" }],
          noConfirmedFindings: true,
        },
      },
    });
    expect(resultado.outcome).toBe("PASS");
  });
});

/* ------------------------------------------------------------------ */
/* Batch y diff                                                        */
/* ------------------------------------------------------------------ */

describe("M2-A · lote y diff", () => {
  it("un fallo se aísla por capacidad", () => {
    const buena = fuenteValidada();
    const mala = fuenteBase();
    (mala["capability"] as Record<string, unknown>)["id"] = "FIXTURE-BAD";
    delete (mala as Record<string, unknown>)["provenance"];
    const lote = runBatch([
      { source: buena, governanceReview: { decision: "APPROVED" } },
      { source: mala },
    ]);
    expect(lote.counts.FAIL).toBe(1);
    expect(lote.counts.PASS).toBe(1);
    expect(lote.results.find((r) => r.capabilityId === "FIXTURE-CAP")?.outcome).toBe("PASS");
    expect(lote.results.find((r) => r.capabilityId === "FIXTURE-BAD")?.candidate).toBeNull();
  });

  it("el diff detecta contenido añadido", () => {
    const source = fuenteValidada();
    const candidate = candidatoDe(source);
    (candidate.pack["variables"] as Record<string, unknown>[]).push({
      id: "V3",
      name: "Variable añadida sin fuente",
      criticality: "CRITICAL",
      minimumEvidence: "E1",
      semanticStates: null,
    });
    const diff = sourceToPackDiff(source, candidate.pack);
    expect(diff.clean).toBe(false);
    expect(diff.addedContent.length).toBeGreaterThan(0);
  });

  it("el diff detecta omisiones y pérdida de procedencia", () => {
    const source = fuenteValidada();
    const candidate = candidatoDe(source);
    delete (candidate.pack as Record<string, unknown>)["rules"];
    (candidate.pack["knowledgeMaster"] as Record<string, unknown>)["sourceReference"] = undefined;
    const diff = sourceToPackDiff(source, candidate.pack);
    expect(diff.missingSourceContent.some((e) => e.path.startsWith("rules"))).toBe(true);
    expect(diff.provenanceLoss.length).toBeGreaterThan(0);
  });

  it("el diff preserva, sin resolver, los mappings marcados como no explícitos", () => {
    const source = fuenteValidada();
    const candidate = candidatoDe(source);
    const diff = sourceToPackDiff(source, candidate.pack);
    expect(diff.clean).toBe(true);
    expect(diff.unresolvedMappings.length).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ */
/* Golden Pack OP-01                                                   */
/* ------------------------------------------------------------------ */

describe("M2-A · Golden Pack OP-01", () => {
  const entradas = discoverCapabilityPipelineInputs(ROOT, "v1.0");
  const lote = runBatch(entradas);
  const op01 = lote.results.find((r) => r.capabilityId === "OP-01");

  it("el pipeline real del repositorio procesa OP-01 sin fallos", () => {
    expect(op01).toBeDefined();
    expect(op01?.errors).toEqual([]);
    expect(op01?.outcome).toBe("PASS");
    expect(op01?.state).toBe("PUBLISHED");
  });

  it("el candidato regenerado es equivalente al Golden Pack publicado", () => {
    expect(op01?.goldenRegression).toMatchObject({ compared: true, equivalent: true });
    expect(op01?.diff?.clean).toBe(true);
    if (op01?.goldenRegression?.compared) {
      expect(op01.goldenRegression.immutability.ok).toBe(true);
    }
  });

  it("conserva procedencia, gaps y KCC de OP-01", () => {
    expect(op01?.candidate?.provenance.sourceReference).toContain("AT-04");
    expect(op01?.candidate?.provenance.masterVersion).toBe("1.0");
    const kcc = (op01?.candidate?.pack["knowledgeChangeCandidates"] ?? []) as { id: string }[];
    expect(kcc.map((k) => k.id)).toContain("KCC-AT04-01");
    expect(kcc.map((k) => k.id)).toContain("KCC-AT04-13");
    expect(op01?.candidate?.gaps.length).toBeGreaterThanOrEqual(kcc.length);
    expect(op01?.candidate?.gaps.every((g) => g.publicationBlocking === false)).toBe(true);
  });

  it("supera sus knowledge tests y sus fixtures de aceptación", () => {
    expect(op01?.knowledgeTests?.ok).toBe(true);
    expect(op01?.runtimeResults.length).toBeGreaterThan(0);
    expect(op01?.runtimeResults.every((r) => r.outcome !== "FAIL")).toBe(true);
  });

  it("el reporte de gobierno permite revisar sin leer código del engine", () => {
    const reporte = buildGovernanceReviewReport(op01!);
    expect(reporte).toContain("Identidad y procedencia");
    expect(reporte).toContain("Gaps declarados");
    expect(reporte).toContain("Juicios gobernados");
    expect(reporte).toContain("Puerta de publicación");
    expect(reporte).not.toContain("createKnowledgeEngine");
  });

  it("el manifest del repositorio declara AUTHORITATIVE_SOURCE_REQUIRED", () => {
    const master = validateMasterIndex(loadMasterIndex(ROOT, "v1.0"));
    if (!master.ok) throw new Error("master inválido");
    const manifest = buildCapabilityManifest({ master: master.value, results: lote.results });
    expect(manifest.signal).toBe(AUTHORITATIVE_SOURCE_REQUIRED);
    expect(manifest.publishedCount).toBe(1);
    const enDisco = JSON.parse(readFileSync(join(ROOT, "knowledge", "manifest.json"), "utf8")) as {
      checksum: string;
    };
    expect(enDisco.checksum).toBe(manifest.checksum);
  });
});

/* ------------------------------------------------------------------ */
/* Independencia arquitectónica                                        */
/* ------------------------------------------------------------------ */

describe("M2-A · independencia del pipeline", () => {
  const fuentes = readdirSync(PIPELINE_SRC)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => ({ archivo: f, contenido: readFileSync(join(PIPELINE_SRC, f), "utf8") }));

  it("no depende del frontend, de Supabase ni de Lovable", () => {
    const prohibidos = /(from\s+"@\/|react|@tanstack|supabase|lovable)/i;
    const infractores = fuentes
      .filter((f) => !f.archivo.endsWith(".test.ts"))
      .filter((f) => prohibidos.test(f.contenido))
      .map((f) => f.archivo);
    expect(infractores).toEqual([]);
  });

  it("no contiene branching por capacidad", () => {
    const infractores = fuentes
      .filter((f) => !f.archivo.endsWith(".test.ts"))
      .filter((f) => /capabilityId\s*===|"OP-01"|'OP-01'/.test(f.contenido))
      .map((f) => f.archivo);
    expect(infractores).toEqual([]);
  });

  it("el CLI se ejecuta desde el repositorio, sin estado externo", () => {
    const cli = readFileSync(join(ROOT, "scripts", "knowledge-pipeline.ts"), "utf8");
    expect(cli).toContain("process.cwd()");
    expect(cli).not.toMatch(/supabase|fetch\(|https?:\/\//);
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts["knowledge:validate"]).toBeDefined();
    expect(pkg.scripts["knowledge:pipeline"]).toBeDefined();
  });

  it("clasifica la frontera de automatización y no automatiza decisiones semánticas", () => {
    const porId = new Map(PIPELINE_OPERATIONS.map((o) => [o.id, o]));
    expect(porId.get("PACK_CANDIDATE_GENERATION")?.classification).toBe("AUTOMATABLE");
    expect(porId.get("SCHEMA_VALIDATION")?.classification).toBe("AUTOMATABLE");
    expect(porId.get("GOVERNANCE_REVIEW")?.classification).toBe("HUMAN_GOVERNANCE_REQUIRED");
    expect(porId.get("PUBLICATION")?.classification).toBe("HUMAN_GOVERNANCE_REQUIRED");
    expect(porId.get("GAP_RESOLUTION")?.classification).toBe("HUMAN_GOVERNANCE_REQUIRED");
    expect(porId.get("FIXTURE_AUTHORING")?.classification).toBe("HUMAN_GOVERNANCE_REQUIRED");
  });

  it("la integración de CI cubre master, packs y schemas", () => {
    const flujo = readFileSync(
      join(ROOT, ".github", "workflows", "knowledge-pipeline.yml"),
      "utf8",
    );
    expect(flujo).toContain("knowledge/master/**");
    expect(flujo).toContain("knowledge/packs/**");
    expect(flujo).toContain("knowledge/schemas/**");
    expect(flujo).toContain("knowledge:validate");
  });
});

/* ------------------------------------------------------------------ */
/* Pipeline completo sobre una capacidad sintética                     */
/* ------------------------------------------------------------------ */

describe("M2-A · recorrido completo", () => {
  it("genera candidato, valida, prueba y queda a la espera de gobierno", () => {
    const resultado = runCapabilityPipeline({ source: fuenteBase() });
    expect(resultado.candidate).not.toBeNull();
    expect(resultado.validation?.ok).toBe(true);
    expect(resultado.knowledgeTests?.ok).toBe(true);
    expect(resultado.publication?.state).toBe("VALIDATED");
    expect(resultado.outcome).toBe("REVIEW_REQUIRED");
    expect(resultado.state).toBe("VALIDATED");
  });

  it("una fuente no aprobada no produce Pack Candidate", () => {
    const enRevision = fuenteBase();
    (enRevision["provenance"] as Record<string, unknown>)["extractionStatus"] = "IN_REVIEW";
    const resultado = runCapabilityPipeline({ source: enRevision });
    expect(resultado.publication?.state).not.toBe("PUBLISHED");
    expect(resultado.publication?.blockers.map((b) => b.code)).toContain("PROVENANCE_MISSING");
  });
});
