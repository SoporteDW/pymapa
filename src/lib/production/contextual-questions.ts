/**
 * CTX-Q-B01 · Capa contextual versionada (G1/G2) — solo presentación.
 *
 * - Reutiliza texto LITERAL del paquete aprobado (pregunta de adquisición o
 *   prompt de `acquisitionStages`). Nunca reescribe ni crea preguntas oficiales.
 * - Relación pregunta → adquisiciones declarada explícitamente aquí (1:N).
 *   La respuesta se registra SOLO en la adquisición principal; las demás la
 *   ven como antecedente, nunca como respondidas ni suficientes.
 * - Alcance cerrado: OP-01, DG-02, PC-04, CM-01, EC-03. El resto devuelve null.
 * - Desactivable sin pérdida de datos: vaciar CTX_Q_ENABLED.
 * Puro: sin IO, sin Engine, sin base de datos.
 */
export const CTX_Q_VERSION = "CTX-Q/1.0.0";

export const CTX_Q_ENABLED: ReadonlySet<string> = new Set(["OP-01", "DG-02", "PC-04", "CM-01", "EC-03"]);

export function isContextualEnabled(capabilityId: string): boolean {
  return CTX_Q_ENABLED.has(capabilityId.toUpperCase());
}

export type ContextualKind = "EXPLORATORY" | "REFERENT_DEPENDENT";

export interface ReferentType {
  /** Qué debe identificar la empresa (sustantivo genérico, sin supuestos sectoriales). */
  label: string;
  /** Pregunta para delimitarlo dentro de la misma tarjeta. */
  ask: string;
}

/** G2 · Tipo de referente por capacidad (genérico; no asume sector ni empresa). */
export const REFERENT_TYPES: Record<string, ReferentType> = {
  "OP-01": { label: "proceso", ask: "¿Sobre qué proceso de tu empresa estás respondiendo?" },
  "DG-02": { label: "iniciativa o necesidad en comparación", ask: "¿Qué iniciativas o necesidades estás comparando?" },
  "PC-04": { label: "conocimiento o tarea crítica", ask: "¿Qué conocimiento o tarea importante estás analizando?" },
  "CM-01": { label: "problema que resuelve tu oferta", ask: "¿Qué problema de tus clientes resuelve la oferta que estás analizando?" },
  "EC-03": { label: "tercero (proveedor, aliado o servicio externo)", ask: "¿Sobre qué proveedor, aliado o servicio externo estás respondiendo?" },
};

export interface ContextualQuestionContract {
  contextualQuestionId: string;
  version: typeof CTX_Q_VERSION;
  capabilityId: string;
  stageRef: string;
  /** Texto literal del paquete mostrado como pregunta. */
  sourceText: string;
  sourceKind: "ACQUISITION_QUESTION" | "STAGE_PROMPT";
  /** Ubicación literal en el paquete (para trazabilidad). */
  sourceLocation: string;
  kind: ContextualKind;
  referentType: ReferentType | null;
  primaryAcquisitionRef: string;
  /** Incluye la principal. Las secundarias solo reciben antecedente. */
  targetAcquisitionRefs: string[];
}

/** C2 · Referencias que exigen contexto (no solo «este proceso»). */
export const PATRON_REFERENTE_AMBIGUO =
  /\b(este|esta|estos|estas|ese|esa|esos|esas)\s+(proceso|problema|tercero|iniciativa|iniciativas|relaci[oó]n|punto|actividad|proveedor|persona|conocimiento|cliente|clientes|grupo|canal|recurso|decisi[oó]n|servicio|alternativa|tarea)\b|\b(el proveedor|su soluci[oó]n|cada alternativa)\b|¿c[oó]mo saben eso\?/i;

export function requiereReferente(texto: string | null | undefined): boolean {
  return Boolean(texto && PATRON_REFERENTE_AMBIGUO.test(texto));
}

interface StagePromptMap {
  stage: string;
  promptIndex: number;
  primary: string;
  secondary: string[];
}

/**
 * G1 · Correspondencia de presentación declarada (CTX-Q/1.0.0) entre prompts
 * literales de etapa y adquisiciones. No es semántica aprobada ni suficiencia.
 */
const STAGE_MAP: Record<string, StagePromptMap[]> = {
  "DG-02": [
    { stage: "P1", promptIndex: 0, primary: "ACQ·NI01", secondary: ["ACQ·NI02"] },
    { stage: "P1", promptIndex: 1, primary: "ACQ·NI08", secondary: ["ACQ·NI03", "ACQ·NI07"] },
    { stage: "P1", promptIndex: 2, primary: "ACQ·NI06", secondary: ["ACQ·NI05"] },
    { stage: "P1", promptIndex: 3, primary: "ACQ·NI09", secondary: [] },
  ],
  "PC-04": [
    { stage: "P1", promptIndex: 0, primary: "ACQ·NI01", secondary: ["ACQ·NI03", "ACQ·NI04"] },
    { stage: "P1", promptIndex: 1, primary: "ACQ·NI12", secondary: ["ACQ·NI02"] },
    { stage: "P1", promptIndex: 2, primary: "ACQ·NI06", secondary: ["ACQ·NI05", "ACQ·NI07"] },
    { stage: "P1", promptIndex: 3, primary: "ACQ·NI10", secondary: ["ACQ·NI08"] },
  ],
};

/** Adquisiciones que exploran (descubren el referente) y no deben bloquearse. */
const EXPLORATORIAS: Record<string, ReadonlySet<string>> = {
  "OP-01": new Set(),
  "DG-02": new Set(["ACQ·NI01", "ACQ·NI02", "ACQ·NI06", "ACQ·NI10"]),
  "PC-04": new Set(["ACQ·NI01"]),
  "CM-01": new Set(["ACQ·P1·03", "ACQ·P1·05", "ACQ·P1·06"]),
  "EC-03": new Set(),
};

interface PackLike {
  acquisitions?: { id: string; question?: unknown; variableRefs?: string[]; level?: string; informationNeedRef?: string }[];
  acquisitionStages?: { id: string; prompts?: string[] }[];
}

function limpiar(prompt: string): string {
  return prompt.replace(/^[“"«\s]+|[”"»\s]+$/g, "").trim();
}

/** Construye los contratos de una capacidad a partir del paquete literal. */
export function buildContextualContracts(capabilityId: string, pack: unknown): Map<string, ContextualQuestionContract> {
  const cap = capabilityId.toUpperCase();
  const out = new Map<string, ContextualQuestionContract>();
  if (!isContextualEnabled(cap)) return out;
  const p = pack as PackLike;
  const acqs = p.acquisitions ?? [];
  const ids = new Set(acqs.map((a) => a.id));
  const ref = REFERENT_TYPES[cap] ?? null;
  const exploratorias = EXPLORATORIAS[cap] ?? new Set<string>();

  // 1) Prompts de etapa literales (DG-02, PC-04).
  for (const m of STAGE_MAP[cap] ?? []) {
    const prompt = p.acquisitionStages?.find((s) => s.id === m.stage)?.prompts?.[m.promptIndex];
    if (!prompt || !ids.has(m.primary)) continue;
    const texto = limpiar(prompt);
    const dependiente = !exploratorias.has(m.primary) || requiereReferente(texto);
    out.set(m.primary, {
      contextualQuestionId: `CTXQ·${cap}·${m.stage}·${m.promptIndex + 1}`,
      version: CTX_Q_VERSION,
      capabilityId: cap,
      stageRef: m.stage,
      sourceText: texto,
      sourceKind: "STAGE_PROMPT",
      sourceLocation: `acquisitionStages[${m.stage}].prompts[${m.promptIndex}]`,
      kind: dependiente ? "REFERENT_DEPENDENT" : "EXPLORATORY",
      referentType: dependiente ? ref : null,
      primaryAcquisitionRef: m.primary,
      targetAcquisitionRefs: [m.primary, ...m.secondary.filter((s) => ids.has(s))],
    });
  }

  // 2) Preguntas literales de adquisición (OP-01, CM-01, EC-03) y resto sin prompt.
  for (const a of acqs) {
    if (out.has(a.id)) continue;
    const literal = typeof a.question === "string" ? a.question : null;
    const dependiente = !exploratorias.has(a.id) || requiereReferente(literal);
    // Antecedentes: otras adquisiciones que el paquete vincula a la misma variable
    // (solo preguntas con pocas variables; las progresivas comparten todas).
    const vars = a.variableRefs ?? [];
    const secundarias =
      vars.length > 0 && vars.length <= 2
        ? acqs.filter((b) => b.id !== a.id && (b.variableRefs ?? []).length <= 2 && (b.variableRefs ?? []).some((v) => vars.includes(v))).map((b) => b.id)
        : [];
    out.set(a.id, {
      contextualQuestionId: `CTXQ·${cap}·${a.id}`,
      version: CTX_Q_VERSION,
      capabilityId: cap,
      stageRef: a.level ?? (a.id.match(/P\d/)?.[0] ?? "—"),
      sourceText: literal ?? "",
      sourceKind: "ACQUISITION_QUESTION",
      sourceLocation: literal ? `acquisitions[${a.id}].question` : `acquisitions[${a.id}] · sin pregunta literal (DEC-054)`,
      kind: dependiente ? "REFERENT_DEPENDENT" : "EXPLORATORY",
      referentType: dependiente ? ref : null,
      primaryAcquisitionRef: a.id,
      targetAcquisitionRefs: [a.id, ...secundarias],
    });
  }
  return out;
}

export interface AntecedenteFuente {
  observationId: string;
  acquisitionId: string;
  semanticValue: string | null;
  knowledgeState: string;
  superseded: boolean;
}

/**
 * C3 · Antecedentes de una adquisición: respuestas vigentes a otras preguntas
 * cuyo contrato la incluye como secundaria. Nunca la marca como respondida.
 */
export function antecedentesPara(
  acquisitionId: string,
  contratos: Map<string, ContextualQuestionContract>,
  respuestas: AntecedenteFuente[],
): (AntecedenteFuente & { contextualQuestionId: string; sourceText: string })[] {
  const out: (AntecedenteFuente & { contextualQuestionId: string; sourceText: string })[] = [];
  for (const r of respuestas) {
    if (r.superseded || r.acquisitionId === acquisitionId || r.knowledgeState !== "KNOWN" || !r.semanticValue) continue;
    const c = contratos.get(r.acquisitionId);
    if (!c || !c.targetAcquisitionRefs.includes(acquisitionId)) continue;
    out.push({ ...r, contextualQuestionId: c.contextualQuestionId, sourceText: c.sourceText });
  }
  return out;
}

/** Sanea el referente declarado por la persona (texto libre, ≤160). */
export function sanearReferente(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/\s+/g, " ").trim().slice(0, 160);
  return t.length >= 2 ? t : null;
}
