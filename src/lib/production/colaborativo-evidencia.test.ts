/**
 * M1-EFG · Acceptance tests de adquisición adaptativa, diagnóstico
 * colaborativo (respondents / assignments / invitations), semántica UNKNOWN,
 * contradicción entre fuentes y Evidence Store.
 *
 * No verifica findings, recommendations, severidad, priority, sufficiency ni
 * confidence: esas capacidades no se implementan en esta etapa.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { createKnowledgeEngine } from "@pymapa/knowledge-engine";
import { createInMemoryProductionRepository, type AssessmentRecord } from "./puertos";
import {
  asegurarRespondentDeUsuario,
  assignmentCubreAdquisicion,
  getAssessmentState,
  getClarificationCandidates,
  getNextAcquisition,
  invitarRespondent,
  OUT_OF_ASSIGNMENT_SCOPE,
  registrarEvidencia,
  RESPONDENT_WITHOUT_ASSIGNMENT,
  submitAcquisitionResponse,
  type ProductionDeps,
} from "./caso-uso";

const PACK_PATH = join(process.cwd(), "knowledge", "packs", "op-01", "1.0.0", "pack.json");
const packRaw = JSON.parse(readFileSync(PACK_PATH, "utf8")) as Record<string, unknown>;

const KV = "kv-op01-1.0.0";

function assessment(): AssessmentRecord {
  return {
    id: "assess-1",
    organizationId: "org-1",
    caseId: "case-1",
    knowledgeVersionId: KV,
    type: "BASELINE",
    startedAt: "2026-01-01T00:00:00.000Z",
    closedAt: null,
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("M1-EFG · adquisición adaptativa", () => {
  let repository: ReturnType<typeof createInMemoryProductionRepository>;
  let deps: ProductionDeps;

  beforeEach(() => {
    repository = createInMemoryProductionRepository([assessment()]);
    deps = {
      engine: createKnowledgeEngine(packRaw),
      repository,
      knowledgeVersionId: KV,
      hashToken: (t) => `sha256:${t}`,
    };
  });

  const base = {
    assessmentId: "assess-1",
    organizationId: "org-1",
    submittedBy: "user-1",
    acquisitionId: "OP01-P01",
  } as const;

  it("P01 puede activar una adquisición posterior declarada por el pack", async () => {
    // Definición implícita → el pack habilita P05 (partes claras vs. juicio individual).
    await submitAcquisitionResponse(deps, {
      ...base,
      knowledgeState: "KNOWN",
      semanticValue: "Implícita",
    });
    const siguiente = await getNextAcquisition(deps, "assess-1");
    expect(siguiente?.acquisitionId).toBe("OP01-P05");
    expect(siguiente?.triggerStatement).toBeTruthy();
  });

  it("el trigger lo declara el pack: sin condición satisfecha no se sirve", async () => {
    // "Formalizada" no satisface el trigger de P05; el runtime no improvisa.
    await submitAcquisitionResponse(deps, {
      ...base,
      knowledgeState: "KNOWN",
      semanticValue: "Formalizada",
    });
    const siguiente = await getNextAcquisition(deps, "assess-1");
    expect(siguiente?.acquisitionId).not.toBe("OP01-P05");
  });

  it("las adquisiciones no determinísticas nunca se sirven por inferencia", async () => {
    const evaluacion = deps.engine.evaluate({ observations: [], knowledgeVersionId: KV });
    const elegibles = deps.engine.getEligibleAcquisitions(evaluacion).map((a) => a.acquisitionId);
    for (const ref of ["OP01-P08", "OP01-P09", "OP01-P10", "OP01-P11", "OP01-P12", "OP01-P13", "OP01-P14"]) {
      expect(elegibles).not.toContain(ref);
    }
  });

  it("UNKNOWN permanece UNKNOWN y no produce conclusión adversa ni cierra la necesidad", async () => {
    const salida = await submitAcquisitionResponse(deps, { ...base, knowledgeState: "UNKNOWN" });
    expect(salida.accepted).toBe(true);

    const va01 = salida.state?.variableStates.find((v) => v.variableRef === "VA01");
    expect(va01?.state).toBe("UNKNOWN");
    // UNKNOWN ≠ NO: no existe ningún estado negativo derivado.
    expect(salida.state?.variableStates.map((v) => v.state)).not.toContain("NOT_APPLICABLE");

    // La necesidad queda parcial: abierta a delegación, otra fuente o evidencia.
    const ni01 = salida.state?.informationNeedStates.find((n) => n.needRef === "NI01");
    expect(ni01?.state).toBe("PARTIAL");

    // Sin findings, sin sufficiency, sin confidence.
    expect(salida.state?.sufficiency).toBeNull();
    expect(salida.state?.confidence).toBeNull();
  });
});

describe("M1-EFG · diagnóstico colaborativo y delegación", () => {
  let repository: ReturnType<typeof createInMemoryProductionRepository>;
  let deps: ProductionDeps;

  beforeEach(() => {
    repository = createInMemoryProductionRepository([assessment()]);
    deps = {
      engine: createKnowledgeEngine(packRaw),
      repository,
      knowledgeVersionId: KV,
      hashToken: (t) => `sha256:${t}`,
    };
  });

  it("User ≠ Membership ≠ Respondent: un respondent puede existir sin cuenta", async () => {
    const { respondent, assignment: asignacion, invitation } = await invitarRespondent(deps, {
      organizationId: "org-1",
      assessmentId: "assess-1",
      email: "responsable@empresa.com",
      displayName: "Responsable del proceso",
      scopeType: "CAPABILITY",
      scopeRef: "OP-01",
      createdBy: "user-1",
      token: "token-secreto",
    });
    expect(respondent.userId).toBeNull();
    expect(respondent.status).toBe("INVITED");
    expect(asignacion.scopeType).toBe("CAPABILITY");
    // Solo el hash del token se persiste.
    expect(invitation.tokenHash).toBe("sha256:token-secreto");
    expect(JSON.stringify(invitation)).not.toContain("token-secreto\"");
  });

  it("Journey A · UNKNOWN → necesidad abierta → delegación → la necesidad avanza", async () => {
    const owner = await asegurarRespondentDeUsuario(deps, {
      organizationId: "org-1",
      userId: "user-1",
      email: "gerente@empresa.com",
    });
    const asignacionOwner = await repository.insertAssignment({
      organizationId: "org-1",
      assessmentId: "assess-1",
      respondentId: owner.id,
      scopeType: "CAPABILITY",
      scopeRef: "OP-01",
      status: "IN_PROGRESS",
      delegatedFromAssignmentId: null,
      delegationReason: null,
    });

    // 1. El gerente no conoce el dato: UNKNOWN, no NO.
    const parcial = await submitAcquisitionResponse(deps, {
      assessmentId: "assess-1",
      organizationId: "org-1",
      submittedBy: "user-1",
      respondentId: owner.id,
      acquisitionId: "OP01-P01",
      knowledgeState: "UNKNOWN",
    });
    expect(parcial.accepted).toBe(true);
    expect(parcial.state?.informationNeedStates.find((n) => n.needRef === "NI01")?.state).toBe(
      "PARTIAL",
    );

    // 2. Delegación al responsable del proceso; la necesidad sigue abierta.
    const delegado = await invitarRespondent(deps, {
      organizationId: "org-1",
      assessmentId: "assess-1",
      email: "proceso@empresa.com",
      scopeType: "CAPABILITY",
      scopeRef: "OP-01",
      createdBy: "user-1",
      token: "token-2",
      delegatedFromAssignmentId: asignacionOwner.id,
      delegationReason: "El responsable del proceso conoce la ejecución real.",
    });
    expect((await repository.getAssignment(asignacionOwner.id))?.status).toBe("DELEGATED");
    expect(delegado.assignment.delegatedFromAssignmentId).toBe(asignacionOwner.id);

    // 3. El segundo respondent aporta al MISMO assessment y la necesidad avanza.
    const avance = await submitAcquisitionResponse(deps, {
      assessmentId: "assess-1",
      organizationId: "org-1",
      submittedBy: null,
      respondentId: delegado.respondent.id,
      acquisitionId: "OP01-P01",
      knowledgeState: "KNOWN",
      semanticValue: "Definida",
    });
    expect(avance.accepted).toBe(true);
    expect(avance.state?.informationNeedStates.find((n) => n.needRef === "NI01")?.state).toBe(
      "COLLECTED",
    );
    // Ambas fuentes quedan registradas: la delegación no borra el UNKNOWN previo.
    expect((await repository.listObservations("assess-1")).length).toBe(2);
  });

  it("un respondent queda restringido a su Assignment Scope", async () => {
    const respondent = await repository.insertRespondent({
      organizationId: "org-1",
      userId: "user-9",
      email: "externo@otra.com",
      displayName: "Externo",
      roleLabel: null,
      status: "ACTIVE",
    });

    // Sin assignment: no puede aportar nada.
    const sinAsignacion = await submitAcquisitionResponse(deps, {
      assessmentId: "assess-1",
      organizationId: "org-1",
      submittedBy: "user-9",
      respondentId: respondent.id,
      acquisitionId: "OP01-P01",
      knowledgeState: "KNOWN",
      semanticValue: "Definida",
    });
    expect(sinAsignacion.accepted).toBe(false);
    expect(sinAsignacion.rejectionReason).toBe(RESPONDENT_WITHOUT_ASSIGNMENT);

    // Con un alcance que no cubre la adquisición: fuera de alcance.
    await repository.insertAssignment({
      organizationId: "org-1",
      assessmentId: "assess-1",
      respondentId: respondent.id,
      scopeType: "SECTION",
      scopeRef: "VA06",
      status: "PENDING",
      delegatedFromAssignmentId: null,
      delegationReason: null,
    });
    const fuera = await submitAcquisitionResponse(deps, {
      assessmentId: "assess-1",
      organizationId: "org-1",
      submittedBy: "user-9",
      respondentId: respondent.id,
      acquisitionId: "OP01-P01",
      knowledgeState: "KNOWN",
      semanticValue: "Definida",
    });
    expect(fuera.accepted).toBe(false);
    expect(fuera.rejectionReason).toBe(OUT_OF_ASSIGNMENT_SCOPE);
  });

  it("el alcance admite DOMAIN, CAPABILITY, INFORMATION_NEED y SECTION", () => {
    const capability = { id: "OP-01", domainId: "OP" };
    const adquisicion = { id: "OP01-P01", informationNeedRef: "NI01", variableRefs: ["VA01"] };
    expect(assignmentCubreAdquisicion({ scopeType: "DOMAIN", scopeRef: "OP" }, adquisicion, capability)).toBe(true);
    expect(assignmentCubreAdquisicion({ scopeType: "CAPABILITY", scopeRef: "OP-01" }, adquisicion, capability)).toBe(true);
    expect(assignmentCubreAdquisicion({ scopeType: "INFORMATION_NEED", scopeRef: "NI01" }, adquisicion, capability)).toBe(true);
    expect(assignmentCubreAdquisicion({ scopeType: "SECTION", scopeRef: "VA01" }, adquisicion, capability)).toBe(true);
    expect(assignmentCubreAdquisicion({ scopeType: "DOMAIN", scopeRef: "CM" }, adquisicion, capability)).toBe(false);
  });
});

describe("M1-EFG · contradicción entre fuentes", () => {
  let repository: ReturnType<typeof createInMemoryProductionRepository>;
  let deps: ProductionDeps;

  beforeEach(() => {
    repository = createInMemoryProductionRepository([assessment()]);
    deps = {
      engine: createKnowledgeEngine(packRaw),
      repository,
      knowledgeVersionId: KV,
      hashToken: (t) => `sha256:${t}`,
    };
  });

  async function journeyB() {
    const lider = await repository.insertRespondent({
      organizationId: "org-1",
      userId: "user-lider",
      email: "lider@empresa.com",
      displayName: "Líder",
      roleLabel: "Líder",
      status: "ACTIVE",
    });
    const ejecutor = await repository.insertRespondent({
      organizationId: "org-1",
      userId: "user-ejecutor",
      email: "ejecutor@empresa.com",
      displayName: "Ejecutor",
      roleLabel: "Ejecutor",
      status: "ACTIVE",
    });
    for (const r of [lider, ejecutor]) {
      await repository.insertAssignment({
        organizationId: "org-1",
        assessmentId: "assess-1",
        respondentId: r.id,
        scopeType: "CAPABILITY",
        scopeRef: "OP-01",
        status: "PENDING",
        delegatedFromAssignmentId: null,
        delegationReason: null,
      });
    }
    await submitAcquisitionResponse(deps, {
      assessmentId: "assess-1",
      organizationId: "org-1",
      submittedBy: "user-lider",
      respondentId: lider.id,
      acquisitionId: "OP01-P10",
      knowledgeState: "KNOWN",
      semanticValue: "Todos realizan el proceso de la misma forma.",
    });
    const salida = await submitAcquisitionResponse(deps, {
      assessmentId: "assess-1",
      organizationId: "org-1",
      submittedBy: "user-ejecutor",
      respondentId: ejecutor.id,
      acquisitionId: "OP01-P10",
      knowledgeState: "KNOWN",
      semanticValue: "Cada persona decide cómo hacerlo.",
    });
    return { lider, ejecutor, salida };
  }

  it("Journey B · dos fuentes incompatibles producen VA06 = CONTRADICTORY", async () => {
    const { salida } = await journeyB();
    const va06 = salida.state?.variableStates.find((v) => v.variableRef === "VA06");
    expect(va06?.state).toBe("CONTRADICTORY");
    expect(va06?.semanticValue).toBeNull();
  });

  it("no promedia ni escoge por jerarquía: conserva ambas fuentes", async () => {
    const { lider, ejecutor, salida } = await journeyB();
    const contradiccion = salida.state?.contradictions.find((c) => c.variableRef === "VA06");
    expect(contradiccion?.conflictingObservationIds).toHaveLength(2);
    expect(contradiccion?.conflictingSemanticValues).toEqual([
      "Todos realizan el proceso de la misma forma.",
      "Cada persona decide cómo hacerlo.",
    ]);
    expect(contradiccion?.sourceRespondentIds).toEqual([lider.id, ejecutor.id]);
    // La respuesta del rol mayor NO gana automáticamente.
    const va06 = salida.state?.variableStates.find((v) => v.variableRef === "VA06");
    expect(va06?.semanticValue).not.toBe("Todos realizan el proceso de la misma forma.");
  });

  it("P15 aparece como candidato de aclaración y se declaran candidatos de evidencia", async () => {
    const { salida } = await journeyB();
    const candidatos = await getClarificationCandidates(deps, "assess-1");
    expect(candidatos.map((c) => c.acquisitionId)).toContain("OP01-P15");
    const contradiccion = salida.state?.contradictions.find((c) => c.variableRef === "VA06");
    expect(contradiccion?.evidenceCandidateRefs).toEqual(["OP01-EV05", "OP01-EV07", "OP01-EV09"]);
    expect(salida.state?.needsReview).toBe(true);
  });
});

describe("M1-EFG · Evidence Store", () => {
  let repository: ReturnType<typeof createInMemoryProductionRepository>;
  let deps: ProductionDeps;

  beforeEach(() => {
    repository = createInMemoryProductionRepository([assessment()]);
    deps = {
      engine: createKnowledgeEngine(packRaw),
      repository,
      knowledgeVersionId: KV,
      hashToken: (t) => `sha256:${t}`,
    };
  });

  async function observacionInicial() {
    const salida = await submitAcquisitionResponse(deps, {
      assessmentId: "assess-1",
      organizationId: "org-1",
      submittedBy: "user-1",
      acquisitionId: "OP01-P01",
      knowledgeState: "KNOWN",
      semanticValue: "Definida",
    });
    return salida.observationId!;
  }

  it("Journey C · la evidencia se vincula a la observación y conserva lineage", async () => {
    const observationId = await observacionInicial();
    const { evidence, links, state } = await registrarEvidencia(deps, {
      organizationId: "org-1",
      caseId: "case-1",
      assessmentId: "assess-1",
      candidateRef: "OP01-EV01",
      evidenceType: "PROCESS_MAP",
      source: "DOCUMENT",
      storageBucket: "evidence",
      storagePath: "org-1/assess-1/mapa.pdf",
      title: "Mapa del proceso",
      submittedBy: "user-1",
      observationIds: [observationId],
    });

    expect(links).toHaveLength(1);
    // Response ≠ Evidence ≠ Observation ≠ Evaluation.
    const observaciones = await repository.listObservations("assess-1");
    expect(observaciones[0]!.sourceResponseId).toBeTruthy();
    expect(observaciones[0]!.id).not.toBe(evidence.id);

    const va01 = state?.variableStates.find((v) => v.variableRef === "VA01");
    expect(va01?.state).toBe("KNOWN");
    const runs = repository.estado["runs"] as { trigger: string }[];
    expect(runs.map((r) => r.trigger)).toContain("EVIDENCE_ADDED");
  });

  it("la evidencia se guarda por referencia a storage, nunca como binario", async () => {
    const observationId = await observacionInicial();
    const { evidence } = await registrarEvidencia(deps, {
      organizationId: "org-1",
      caseId: "case-1",
      assessmentId: "assess-1",
      evidenceType: "PROCEDURE",
      source: "DOCUMENT",
      storageBucket: "evidence",
      storagePath: "org-1/assess-1/guia.pdf",
      submittedBy: "user-1",
      observationIds: [observationId],
    });
    expect(evidence.storageBucket).toBe("evidence");
    expect(Object.keys(evidence)).not.toContain("content");
    expect(Object.keys(evidence)).not.toContain("binary");
  });

  it("una misma evidencia puede soportar más de una observación/variable", async () => {
    const obs1 = await observacionInicial();
    const obs2 = (
      await submitAcquisitionResponse(deps, {
        assessmentId: "assess-1",
        organizationId: "org-1",
        submittedBy: "user-1",
        acquisitionId: "OP01-P06",
        knowledgeState: "KNOWN",
        semanticValue: "Actividades descritas de forma consistente.",
      })
    ).observationId!;

    const { links } = await registrarEvidencia(deps, {
      organizationId: "org-1",
      caseId: "case-1",
      assessmentId: "assess-1",
      candidateRef: "OP01-EV01",
      evidenceType: "PROCESS_MAP",
      source: "DOCUMENT",
      storageBucket: "evidence",
      storagePath: "org-1/assess-1/mapa.pdf",
      submittedBy: "user-1",
      observationIds: [obs1, obs2],
    });
    expect(links).toHaveLength(2);
    expect(new Set(links.map((l) => l.evidenceId)).size).toBe(1);

    const estado = await getAssessmentState(deps, "assess-1");
    const variablesConEvidencia = estado?.variableStates.map((v) => v.variableRef) ?? [];
    expect(variablesConEvidencia).toContain("VA01");
    expect(variablesConEvidencia).toContain("VA02");
  });

  it("E0–E3 son estados de requisito, no puntajes de madurez", async () => {
    const estado = await getAssessmentState(deps, "assess-1");
    for (const req of estado?.evidenceRequirements ?? []) {
      expect(req.requiredLevel).toMatch(/^E[0-3]$/);
      expect(typeof req.requiredLevel).toBe("string");
      expect(Number.isFinite(Number(req.requiredLevel))).toBe(false);
    }
  });

  it("un requisito de evidencia condicional sin fórmula queda para revisión", async () => {
    const estado = await getAssessmentState(deps, "assess-1");
    const condicionales = (estado?.evidenceRequirements ?? []).filter(
      (r) => r.resolution === "EVIDENCE_REQUIREMENT_REVIEW_REQUIRED",
    );
    expect(condicionales.length).toBeGreaterThan(0);
    for (const req of condicionales) {
      expect(req.options?.length).toBeGreaterThan(1);
      expect(req.provenance.escalationFormula).toContain("NOT_EXPLICIT_IN_KNOWLEDGE_MASTER");
      expect(req.provenance.knowledgePackId).toBeTruthy();
    }
    expect(estado?.needsReview).toBe(true);
  });
});

describe("M1-EFG · seguridad y aislamiento", () => {
  const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");
  const sql = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf8"))
    .join("\n")
    .toLowerCase();

  it("elimina la alta genérica de organizaciones dejando solo el camino gobernado", () => {
    expect(sql).toContain('drop policy if exists "organizations_insert_authenticated"');
    expect(sql).toContain("create or replace function public.bootstrap_organization");
  });

  it("no crea políticas permisivas para las tablas nuevas", () => {
    for (const tabla of ["respondents", "assignments", "invitations", "evidence", "observation_evidence"]) {
      expect(sql).not.toMatch(new RegExp(`on public\\.${tabla}[^;]*using \\(true\\)`));
      expect(sql).not.toMatch(new RegExp(`grant[^;]*on public\\.${tabla} to anon`));
    }
  });

  it("acota el acceso de un respondent a su assessment y su alcance", () => {
    expect(sql).toContain("create or replace function private.is_assessment_respondent");
    expect(sql).toContain("create or replace function private.is_case_respondent");
    expect(sql).toContain("create or replace function private.is_own_respondent");
    // Un respondent nunca obtiene lectura de toda la organización.
    expect(sql).toContain('create policy "assessments_select_respondents"');
    expect(sql).not.toMatch(/create policy "memberships_select_respondents"/);
  });

  it("el frontend no importa el Knowledge Engine ni credenciales privilegiadas", () => {
    const ui = readFileSync(
      join(process.cwd(), "src", "routes", "_authenticated", "capacidad.op-01.tsx"),
      "utf8",
    );
    expect(ui).not.toContain("@pymapa/knowledge-engine");
    expect(ui).not.toContain("SERVICE_ROLE");
    expect(ui).not.toContain("client.server");
  });
});
