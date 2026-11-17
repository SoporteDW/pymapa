/**
 * PYMAPA-MME v1.0 · G1 · Contratos versionados (DEC-062 · Arquitectura 06B).
 * Contratos puros: sin base de datos, sin UI, sin Engine 0.2.0.
 * Nada de lo definido aquí activa calificaciones productivas.
 */

export const MME_ENGINE_VERSION = "PYMAPA-MME-1.0.0" as const;
export type MmeEngineVersion = typeof MME_ENGINE_VERSION;

/** Constantes ratificadas por DEC-062 (no modificar sin nueva decisión). */
export const MME_CHECK_TYPES = ["HECHO", "OPERACION", "CONTEXTO", "EVIDENCIA"] as const;
export type MmeCheckType = (typeof MME_CHECK_TYPES)[number];
export const MME_CRITICAL_CHECKS = ["HECHO", "OPERACION", "EVIDENCIA"] as const;
export const MME_CHECK_WEIGHT = 0.25;
/** Nivel corriente: estrictamente mayor que 50 %. */
export const MME_THRESHOLD_CURRENT = 0.5;
/** Predecesores: estrictamente mayor que 85 %. */
export const MME_THRESHOLD_PREDECESSORS = 0.85;
/** Lectura ordinal por capacidad: 20 × nivel acreditado. Nunca promedio global. */
export const MME_ORDINAL_FACTOR = 20;

export const MME_LEVELS = ["M1", "M2", "M3", "M4", "M5"] as const;
export type MmeLevel = (typeof MME_LEVELS)[number];

export type MmeScope = "INITIAL_DIAGNOSIS" | "EXECUTION_OP05";

/** Estados de un check (incertidumbre, contradicción, N/A, revisión). */
export type CheckState = "PASS" | "FAIL" | "UNKNOWN" | "CONFLICT" | "NOT_APPLICABLE" | "REVIEW_REQUIRED";
export type AttestationVerdict = "PASS" | "FAIL" | "CONFLICT";

export const MME_AUTHORIZED_ROLES = ["METHODOLOGIST", "AUDITOR", "DETERMINISTIC_VALIDATOR"] as const;
export type MmeAuthorizedRole = (typeof MME_AUTHORIZED_ROLES)[number];

/** Ciclo de vida de cualquier ítem registrable (predicado, check, binding, indicador). */
export type MmeRecordState =
  | "CANDIDATE"
  | "SEMANTICALLY_VALIDATED"
  | "TECHNICALLY_VERIFIED"
  | "AUTHORIZED"
  | "ENABLED"
  | "SUSPENDED"
  | "RETIRED";
export type MmeItemType = "binding" | "rubricPredicate" | "check" | "indicator";

// ───────────── Catálogo (31 capacidades · 155 rúbricas · 620 checks) ─────────────

export interface MmeCheckDefinition {
  id: string;
  type: MmeCheckType;
  weight: number;
  critical: boolean;
  level: MmeLevel;
  instruction: string;
  fact_kind: string;
  required_domain_fields: string[];
  requirement: string;
  evidence_candidate: string;
  sources: Record<string, string | null>;
}
export interface MmeRubric {
  rubric_id: string;
  text: string;
  original_predicate_id: string;
  state: string;
  checks: MmeCheckDefinition[];
}
export interface MmeCapability {
  name: string;
  stage: MmeScope;
  applicability: unknown;
  levels: Record<MmeLevel, MmeRubric>;
}
export interface MmeIndicator {
  id: string;
  title: string;
  numerator_label: string;
  denominator_label: string;
  formula: string;
  direction: "HIGHER" | "LOWER" | string;
  direction_status: string;
  version: string;
  status: string;
  sample_limit: string;
}
export interface MmeCatalog {
  version: string;
  scope: string;
  policy: Record<string, string>;
  capabilities: Record<string, MmeCapability>;
  indicators: Record<string, MmeIndicator>;
}
/** Vínculo diagnóstico candidato adquisición → rúbrica (445). Nunca autorizado por defecto. */
export interface MmeCandidateBinding {
  criterion_id: string;
  capacity_id: string;
  level: MmeLevel;
  acquisition_key: string;
  authority: string;
  binding_authorized: boolean;
  [k: string]: unknown;
}

// ───────────── Activación, atestación, autoridad, revocación ─────────────

/** Registro de activación por ID + versión. Vacío = todo inactivo. */
export interface ActivationRecord {
  version: string;
  state: MmeRecordState;
  authorization?: string;
  revokedAt?: string;
}
export type ActivationRegistry = Record<string, ActivationRecord>;

export interface ActivationEntry {
  id: string;
  itemType: MmeItemType;
  version: string;
  state: MmeRecordState;
  source: string;
  semanticAuthority: string;
  validationEvidenceRefs: string[];
  scope: "LAB" | "PRODUCTION";
  dependencies: string[];
  authorizationId?: string;
  revokedAt?: string;
}

export interface MmeSigner {
  role: string;
  /** SERVER-ONLY. Nunca exponer al cliente. */
  secret: string;
}
export type SignerRegistry = Record<string, MmeSigner>;

export interface EvidenceRecord {
  content: Uint8Array;
  sha256: string;
  source?: string;
  observed_at?: string;
  revoked_at?: string | null;
  revocation_state?: "ACTIVE" | "REVOKED" | "INVALIDATED" | string;
}
export type EvidenceStore = Record<string, EvidenceRecord>;

export interface ConflictResolution {
  materiality: "MATERIAL" | "NON_MATERIAL";
  resolved_verdict: "PASS" | "FAIL" | "UNKNOWN";
  rationale: string;
  evidence_refs: string[];
  authority_id: string;
  decision_version: string;
}

export interface Attestation {
  check_id: string;
  assessment_id: string;
  verdict: AttestationVerdict;
  reviewer_id: string;
  issued_at: string;
  version: string;
  evidence_refs: string[];
  payload: Record<string, unknown>;
  conflict_resolution?: ConflictResolution;
  binding_id?: string;
  binding_version?: string;
  signature?: string;
}

export interface ApplicabilityDecision {
  company_id: string;
  assessment_id: string;
  capability_id: string;
  catalog_version: string;
  target_type: "CAPABILITY" | "CONDITION";
  rubric_id?: string;
  context: string;
  justification: string;
  evidence_refs: string[];
  authority_id: string;
  decision_version: string;
  issued_at: string;
  signature?: string;
}

/** Política por capacidad (capabilityId → versión de catálogo). Proviene del servidor. */
export type PolicyRegistry = Record<string, string>;

// ───────────── Resultado MME ─────────────

export type MmeOutcomeStatus =
  | "UNKNOWN_CAPABILITY"
  | "EXCLUDED_OP05"
  | "BLOCKED_NO_AUTHORIZATION"
  | "BLOCKED_NO_ITEM_AUTHORIZATION"
  | "BLOCKED_BINDING_NOT_AUTHORIZED"
  | "BLOCKED_INDICATOR_NOT_AUTHORIZED"
  | "NOT_APPLICABLE_CONTEXTUAL"
  | "REVIEW_REQUIRED_NA_AGGREGATION_POLICY"
  | "REVIEW_REQUIRED"
  | "NOT_DETERMINED"
  | "BOUNDED_UNCERTAIN"
  | "M1_NOT_ACCREDITED"
  | "CONFIRMED";

export type RateBand = "N" | "P" | "L" | "F";
export interface MmeLevelResult {
  level: MmeLevel;
  lower: number;
  upper: number;
  lower_band: RateBand;
  upper_band: RateBand;
  checks: Partial<Record<MmeCheckType, { status: CheckState; weight: number }>>;
}

/** Salida del evaluador (claves idénticas a la referencia Python para equivalencia). */
export interface MmeOutcome {
  engine: MmeEngineVersion;
  capability_id: string;
  assessment_id: string;
  status: MmeOutcomeStatus;
  /** Solo M1–M5 cuando CONFIRMED; en cualquier otro caso null (nunca 0 ni M1 implícito). */
  level: MmeLevel | null;
  errors?: string[];
  blocked_item_id?: string;
  na_decision_version?: string;
  demonstrated_floor?: MmeLevel | null;
  possible_ceiling?: MmeLevel | null;
  score_interval_0_100?: [number | null, number] | null;
  levels?: MmeLevelResult[];
  scoring_note?: string;
}

/** Envoltura laboratorio: nunca se presenta como madurez empresarial verificada. */
export interface MmeLabResult {
  source: "MME_LAB_RESULT";
  verified: false;
  outcome: MmeOutcome;
}

/** Puntuación histórica del MVP: formalmente separada de los resultados MME. */
export interface LegacyDemoOutcome {
  source: "LEGACY_DEMO_SCORE";
  value: number;
  verified: false;
}

export function etiquetarLegacyDemoScore(value: number): LegacyDemoOutcome {
  return { source: "LEGACY_DEMO_SCORE", value, verified: false };
}

/** Representación ordinal de un nivel acreditado; null si no hay acreditación. */
export function ordinalNivelAcreditado(level: MmeLevel | null): number | null {
  if (level === null) return null;
  return MME_ORDINAL_FACTOR * (MME_LEVELS.indexOf(level) + 1);
}
