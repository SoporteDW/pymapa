/**
 * PYMAPA-MME v1.0 · G2 · Evaluador matemático (server-only).
 * Port literal de `mme_dec062.py` (DEC-062 · Arquitectura 06B). No altera constantes ni fórmula.
 * Consume atestaciones autorizadas y firmadas; no verifica por sí mismo la verdad empresarial.
 * Resultado de laboratorio: no constituye madurez empresarial verificada.
 */
import { createHash, createHmac } from "node:crypto";
import {
  MME_AUTHORIZED_ROLES,
  MME_CHECK_WEIGHT as WEIGHT,
  MME_ENGINE_VERSION as VERSION,
  MME_THRESHOLD_CURRENT as THRESHOLD_L,
  MME_THRESHOLD_PREDECESSORS as THRESHOLD_F,
  type ActivationRegistry,
  type CheckState,
  type EvidenceStore,
  type MmeCatalog,
  type MmeCheckDefinition,
  type MmeIndicator,
  type MmeLevelResult,
  type MmeOutcome,
  type MmeScope,
  type PolicyRegistry,
  type RateBand,
  type SignerRegistry,
} from "./tipos";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- port literal de dict Python
type Obj = any;
const ROLES = new Set<string>(MME_AUTHORIZED_ROLES);
const CRITICAL = ["HECHO", "OPERACION", "EVIDENCIA"] as const;

/** Truthiness de Python. */
function py(v: unknown): boolean {
  if (v === null || v === undefined || v === false || v === 0 || v === "") return false;
  if (Array.isArray(v)) return v.length > 0;
  if (v instanceof Uint8Array) return v.length > 0;
  if (typeof v === "object") return Object.keys(v as object).length > 0;
  return true;
}
const isDict = (v: unknown): v is Obj =>
  typeof v === "object" && v !== null && !Array.isArray(v) && !(v instanceof Uint8Array);

/** Equivalente a json.dumps(sort_keys=True, ensure_ascii=False, separators=(",",":")). */
export function canonical(v: unknown): string {
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  if (isDict(v)) {
    const keys = Object.keys(v).filter((k) => v[k] !== undefined).sort();
    return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonical(v[k])).join(",") + "}";
  }
  return JSON.stringify(v ?? null);
}
const hmacHex = (secret: string, obj: Obj) =>
  createHmac("sha256", secret).update(Buffer.from(canonical(obj), "utf8")).digest("hex");
const sha256Hex = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
function unsignedOf(o: Obj): Obj {
  const { signature: _s, ...rest } = o;
  return rest;
}
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
const isRevoked = (e: Obj | undefined) =>
  !!e && (py(e.revoked_at) || e.revocation_state === "REVOKED" || e.revocation_state === "INVALIDATED");

/** Solo para el emisor de atestaciones (servidor). Nunca exponer secretos al cliente. */
export function signAttestation<T extends Obj>(attestation: T, signingSecret: string): T & { signature: string } {
  const unsigned = unsignedOf(attestation);
  return { ...(unsigned as object), signature: hmacHex(signingSecret, unsigned) } as T & { signature: string };
}

export function validateAttestation(
  a: Obj,
  o: { checkId: string; evidenceStore: EvidenceStore; signers: SignerRegistry; assessmentId: string },
): string[] {
  const errs: string[] = [];
  if (a.check_id !== o.checkId) errs.push("CHECK_ID_MISMATCH");
  if (a.assessment_id !== o.assessmentId) errs.push("ASSESSMENT_ID_MISMATCH");
  if (!["PASS", "FAIL", "CONFLICT"].includes(a.verdict)) errs.push("INVALID_VERDICT");
  if (a.version !== VERSION) errs.push("VERSION_MISMATCH");
  const signer = o.signers[a.reviewer_id];
  if (!signer || !ROLES.has(signer.role)) errs.push("REVIEWER_NOT_AUTHORIZED");
  else if (!safeEqual(String(a.signature ?? ""), hmacHex(signer.secret, unsignedOf(a))))
    errs.push("BAD_SIGNATURE");
  const refs = a.evidence_refs;
  if (!Array.isArray(refs) || refs.length === 0) errs.push("MISSING_EVIDENCE");
  else
    for (const ref of refs) {
      const e = o.evidenceStore[ref] as Obj | undefined;
      if (!e) errs.push("EVIDENCE_NOT_RESOLVED:" + ref);
      else if (!(e.content instanceof Uint8Array) || sha256Hex(e.content) !== e.sha256)
        errs.push("EVIDENCE_HASH_INVALID:" + ref);
      else if (isRevoked(e)) errs.push("EVIDENCE_REVOKED:" + ref);
      else if (!py(e.source) || !py(e.observed_at)) errs.push("EVIDENCE_PROVENANCE_INCOMPLETE:" + ref);
    }
  if (a.verdict === "CONFLICT") {
    const r = a.conflict_resolution;
    if (!isDict(r)) errs.push("CONFLICT_MATERIALITY_UNDETERMINED");
    else {
      if (!["MATERIAL", "NON_MATERIAL"].includes(r.materiality)) errs.push("CONFLICT_MATERIALITY_UNDETERMINED");
      if (!py(r.rationale) || !py(r.evidence_refs) || !py(r.authority_id) || !py(r.decision_version))
        errs.push("CONFLICT_DECISION_PROVENANCE_INCOMPLETE");
      if (r.authority_id !== a.reviewer_id) errs.push("CONFLICT_DECISION_AUTHORITY_MISMATCH");
      if (!["PASS", "FAIL", "UNKNOWN"].includes(r.resolved_verdict))
        errs.push("CONFLICT_REQUIRES_EXPLICIT_DISPOSITION");
      for (const ref of Array.isArray(r.evidence_refs) ? r.evidence_refs : []) {
        const e = o.evidenceStore[ref] as Obj | undefined;
        if (!e || isRevoked(e)) errs.push("CONFLICT_EVIDENCE_MISSING_OR_REVOKED:" + ref);
      }
    }
  }
  return errs;
}

/** float() de Python: lanza en valores no numéricos. */
function pyFloat(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase().replace(/_/g, "");
    if (/^[+-]?(inf|infinity)$/.test(s)) return s.startsWith("-") ? -Infinity : Infinity;
    if (/^[+-]?nan$/.test(s)) return NaN;
    if (/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/.test(s)) return Number(s);
  }
  throw new TypeError("INVALID_NUMERIC");
}

function validateObservation(obs: Obj): string[] {
  const errors: string[] = [];
  for (const f of ["numerator", "denominator", "period", "source", "indicator_id"])
    if (obs[f] === null || obs[f] === undefined || obs[f] === "") errors.push("OBSERVATION_FIELD_MISSING:" + f);
  try {
    const n = pyFloat(obs.numerator);
    const d = pyFloat(obs.denominator);
    if (n < 0 || d <= 0 || n > d) errors.push("INVALID_RATIO");
    if (!Number.isInteger(n) || !Number.isInteger(d)) errors.push("NON_INTEGER_COUNTS");
  } catch {
    errors.push("INVALID_NUMERIC_VALUES");
  }
  return errors;
}

/** Filtro de esquema; la veracidad semántica sigue requiriendo adjudicación. */
export function validateBusinessClaim(a: Obj, defn: MmeCheckDefinition, indicator: MmeIndicator | undefined): string[] {
  let verdict = a.verdict;
  if (verdict === "CONFLICT" && isDict(a.conflict_resolution)) {
    const r = a.conflict_resolution;
    verdict = r.materiality === "NON_MATERIAL" ? r.resolved_verdict : "UNKNOWN";
  }
  if (verdict !== "PASS") return [];
  const errors: string[] = [];
  const p = "payload" in a ? a.payload : {};
  if (!isDict(p)) return ["PAYLOAD_NOT_OBJECT"];
  const { level, type: kind } = defn;
  if (kind === "HECHO") {
    if (p.fact_kind !== defn.fact_kind) errors.push("FACT_KIND_MISMATCH");
    const facts = py(p.facts) ? p.facts : {};
    for (const f of defn.required_domain_fields) {
      const v = facts[f];
      if (v === null || v === undefined || v === "" || v === "SYNTHETIC_ATOM_VALUE") errors.push("REQUIRED_FACT_MISSING:" + f);
    }
    if (!py(p.semantic_reviewed ?? false)) errors.push("SEMANTIC_REVIEW_REQUIRED");
  } else if (kind === "OPERACION" && level === "M4") {
    const obs = py(p.observation) ? p.observation : {};
    if (!indicator || obs.indicator_id !== indicator.id) errors.push("INDICATOR_MISMATCH");
    errors.push(...validateObservation(obs));
    if (!py(p.decision_ref) || p.decision_used_metric !== true) errors.push("METRIC_MANAGEMENT_USE_NOT_DEMONSTRATED");
  } else if (kind === "OPERACION" && level === "M5") {
    if (!indicator || !["HIGHER", "LOWER"].includes(indicator.direction)) errors.push("INDICATOR_DIRECTION_UNSET");
    const cmp = py(p.comparison) ? p.comparison : {};
    const labels = ["baseline", "followup_1", "followup_2"];
    const os: Obj[] = labels.map((x) => (py(cmp[x]) ? cmp[x] : {}));
    labels.forEach((label, i) => {
      errors.push(...validateObservation(os[i]).map((e) => label + ":" + e));
      if (indicator && os[i].indicator_id !== indicator.id) errors.push("INDICATOR_MISMATCH:" + label);
    });
    if (cmp.comparable !== true || !py(p.change_ref) || !py(p.alternatives_reviewed))
      errors.push("COMPARABILITY_OR_INTERVENTION_MISSING");
    if (errors.length === 0) {
      const [p0, p1, p2] = os.map((o) => String(o.period)) as [string, string, string];
      if (!(p0 < p1 && p1 < p2)) errors.push("PERIODS_NOT_STRICTLY_ORDERED");
    }
    if (errors.length === 0) {
      const rates = os.map((o) => pyFloat(o.numerator) / pyFloat(o.denominator)) as [number, number, number];
      const sign = indicator!.direction === "HIGHER" ? 1 : -1;
      // Decisión operativa V1: cambio favorable en DOS seguimientos, sin afirmar causalidad.
      if (!(sign * (rates[1] - rates[0]) > 0 && sign * (rates[2] - rates[0]) > 0))
        errors.push("NO_PERSISTENT_FAVORABLE_OBSERVATION");
    }
  } else if (kind === "OPERACION") {
    if (!py(p.applied_case_ref) || !py(p.observed_result)) errors.push("OPERATIONAL_CASE_NOT_EVIDENCED");
  } else if (kind === "CONTEXTO") {
    if (!py(p.actor) || !py(p.period) || !py(p.scope)) errors.push("CONTEXT_NOT_DEFINED");
  } else if (kind === "EVIDENCIA") {
    if (p.source_corroborates_claim !== true || p.material_contradiction === true) errors.push("EVIDENCE_NOT_CORROBORATED");
  }
  return errors;
}

export function rateLabel(r: number): RateBand {
  if (r > THRESHOLD_F) return "F";
  if (r > THRESHOLD_L) return "L";
  if (r > 0.15) return "P";
  return "N";
}

function upperLowerLevel(levels: MmeLevelResult[], bound: "lower" | "upper"): number {
  let highest = 0;
  for (let k = 1; k <= 5; k++) {
    const current = levels[k - 1]!;
    let fPred = true;
    for (let i = 0; i < k - 1; i++) if (!(levels[i]![bound] > THRESHOLD_F)) fPred = false;
    const criticalOk = CRITICAL.every((c) =>
      bound === "lower" ? current.checks[c]?.status === "PASS" : current.checks[c]?.status !== "FAIL",
    );
    if (fPred && current[bound] > THRESHOLD_L && criticalOk) highest = k;
    else break;
  }
  return highest;
}

function validateContextualNa(
  d: Obj,
  o: { companyId: string; assessmentId: string; capabilityId: string; catalogVersion: string; evidenceStore: EvidenceStore; signers: SignerRegistry },
): string[] {
  const errors: string[] = [];
  const expected: [string, string][] = [
    ["company_id", o.companyId],
    ["assessment_id", o.assessmentId],
    ["capability_id", o.capabilityId],
    ["catalog_version", o.catalogVersion],
  ];
  for (const [k, v] of expected) if (!py(v) || d[k] !== v) errors.push("NA_SCOPE_MISMATCH:" + k);
  if (!["context", "justification", "decision_version", "issued_at", "authority_id"].every((x) => py(d[x])))
    errors.push("NA_PROVENANCE_INCOMPLETE");
  const signer = o.signers[d.authority_id];
  if (!signer || !ROLES.has(signer.role)) errors.push("NA_AUTHORITY_NOT_AUTHORIZED");
  else if (!safeEqual(String(d.signature ?? ""), hmacHex(signer.secret, unsignedOf(d)))) errors.push("NA_SIGNATURE_INVALID");
  const refs = d.evidence_refs;
  if (!Array.isArray(refs) || refs.length === 0) errors.push("NA_EVIDENCE_MISSING");
  else
    for (const ref of refs) {
      const e = o.evidenceStore[ref] as Obj | undefined;
      if (!e || isRevoked(e)) errors.push("NA_EVIDENCE_MISSING_OR_REVOKED:" + ref);
      else if (!(e.content instanceof Uint8Array) || sha256Hex(e.content) !== e.sha256)
        errors.push("NA_EVIDENCE_HASH_INVALID:" + ref);
    }
  if (!["CAPABILITY", "CONDITION"].includes(d.target_type)) errors.push("NA_TARGET_INVALID");
  if (d.target_type === "CONDITION" && !py(d.rubric_id)) errors.push("NA_RUBRIC_MISSING");
  return errors;
}

export interface AssessInput {
  catalog: MmeCatalog;
  attestations: Obj[];
  assessmentId: string;
  evidenceStore: EvidenceStore;
  signers: SignerRegistry;
  /** Proviene del servidor, NUNCA del cuerpo de la solicitud. */
  policyRegistry: PolicyRegistry;
  scope?: MmeScope | string;
  companyId?: string;
  naDecisions?: Obj[];
  activationRegistry?: ActivationRegistry | null;
}

export function assess(capabilityId: string, input: AssessInput): MmeOutcome {
  const { catalog, attestations, assessmentId, evidenceStore, signers, policyRegistry } = input;
  const scope = input.scope ?? "INITIAL_DIAGNOSIS";
  const companyId = input.companyId ?? "";
  const activation = input.activationRegistry ?? null;
  const base = { engine: VERSION, capability_id: capabilityId, assessment_id: assessmentId };
  const c = catalog.capabilities[capabilityId];
  if (!c) return { ...base, status: "UNKNOWN_CAPABILITY", level: null };
  if (scope !== "INITIAL_DIAGNOSIS" && scope !== "EXECUTION_OP05")
    return { ...base, status: "REVIEW_REQUIRED", errors: ["UNKNOWN_ASSESSMENT_SCOPE"], level: null };
  if (scope === "EXECUTION_OP05" && capabilityId !== "OP-05")
    return { ...base, status: "REVIEW_REQUIRED", errors: ["EXECUTION_SCOPE_CAPABILITY_MISMATCH"], level: null };
  if (scope === "INITIAL_DIAGNOSIS" && capabilityId === "OP-05") return { ...base, status: "EXCLUDED_OP05", level: null };

  // DEC-062: N/A contextual; la antigua llave capability:NA se ignora.
  for (const na of (input.naDecisions ?? []).filter((d) => d.capability_id === capabilityId)) {
    const naErrors = validateContextualNa(na, {
      companyId, assessmentId, capabilityId, catalogVersion: catalog.version, evidenceStore, signers,
    });
    if (naErrors.length) return { ...base, status: "REVIEW_REQUIRED", errors: naErrors, level: null };
    if (na.target_type === "CONDITION") {
      const rubricIds = new Set(Object.values(c.levels).map((l) => l.rubric_id));
      if (!rubricIds.has(na.rubric_id)) return { ...base, status: "REVIEW_REQUIRED", errors: ["NA_RUBRIC_MISMATCH"], level: null };
      // Gobierno no definió la agregación de condición N/A: no se inventan pesos.
      return { ...base, status: "REVIEW_REQUIRED_NA_AGGREGATION_POLICY", level: null };
    }
    if (na.target_type === "CAPABILITY") {
      if (attestations.length)
        return { ...base, status: "REVIEW_REQUIRED", errors: ["NA_CONFLICTS_WITH_ATTESTATIONS"], level: null };
      return { ...base, status: "NOT_APPLICABLE_CONTEXTUAL", level: null, na_decision_version: na.decision_version };
    }
  }
  if (policyRegistry[capabilityId] !== catalog.version) return { ...base, status: "BLOCKED_NO_AUTHORIZATION", level: null };
  if (activation === null) return { ...base, status: "BLOCKED_NO_ITEM_AUTHORIZATION", level: null };

  const required: string[] = [];
  for (const lvl of Object.values(c.levels)) {
    required.push(lvl.original_predicate_id);
    for (const ck of lvl.checks) required.push(ck.id);
  }
  for (const key of required) {
    const rec = activation[key];
    if (!isDict(rec) || rec!.version !== catalog.version || rec!.state !== "ENABLED")
      return { ...base, status: "BLOCKED_NO_ITEM_AUTHORIZATION", level: null, blocked_item_id: key };
  }
  // Indicadores M4/M5: autorización individual, nunca global.
  for (const a of attestations) {
    const cid = String(a.check_id);
    if (a.verdict === "PASS" && (cid.includes("-M4-") || cid.includes("-M5-"))) {
      const ind = catalog.indicators[capabilityId];
      if (!ind) return { ...base, status: "BLOCKED_INDICATOR_NOT_AUTHORIZED", level: null };
      const rec = activation[ind.id];
      if (!rec || rec.version !== ind.version || rec.state !== "ENABLED")
        return { ...base, status: "BLOCKED_INDICATOR_NOT_AUTHORIZED", level: null };
    }
  }
  // Vínculos adquisición→check solo con binding explícitamente habilitado.
  for (const a of attestations) {
    if (py(a.binding_id)) {
      const rec = activation[a.binding_id];
      if (!rec || rec.state !== "ENABLED" || rec.version !== a.binding_version)
        return { ...base, status: "BLOCKED_BINDING_NOT_AUTHORIZED", level: null };
    }
  }
  const lookup = new Map<unknown, Obj>();
  for (const a of attestations) {
    if (lookup.has(a.check_id)) return { ...base, status: "REVIEW_REQUIRED", errors: ["DUPLICATE_ADJUDICATION"], level: null };
    lookup.set(a.check_id, a);
  }
  const errors: string[] = [];
  let anyConflict = false;
  const levels: MmeLevelResult[] = [];
  const indicator = catalog.indicators[capabilityId];
  const r6 = (x: number) => Math.round(x * 1e6) / 1e6;
  for (let j = 1; j <= 5; j++) {
    const ck: MmeLevelResult["checks"] = {};
    for (const defn of c.levels[`M${j}` as "M1"].checks) {
      const a = lookup.get(defn.id);
      let status: CheckState = "UNKNOWN";
      if (a) {
        const e = [
          ...validateAttestation(a, { checkId: defn.id, evidenceStore, signers, assessmentId }),
          ...validateBusinessClaim(a, defn, indicator),
        ];
        if (e.length) errors.push(...e.map((m) => defn.id + ":" + m));
        else {
          status = a.verdict;
          if (status === "CONFLICT") {
            const r = a.conflict_resolution;
            if (r.materiality === "MATERIAL") anyConflict = true;
            else status = r.resolved_verdict;
          }
        }
      }
      if (status === "CONFLICT") anyConflict = true;
      ck[defn.type] = { status, weight: WEIGHT };
    }
    const vals = Object.values(ck);
    const passed = vals.reduce((s, v) => s + (v!.status === "PASS" ? WEIGHT : 0), 0);
    const unknown = vals.reduce((s, v) => s + (v!.status === "UNKNOWN" || v!.status === "CONFLICT" ? WEIGHT : 0), 0);
    levels.push({
      level: `M${j}` as "M1",
      lower: r6(passed),
      upper: r6(passed + unknown),
      lower_band: rateLabel(passed),
      upper_band: rateLabel(passed + unknown),
      checks: ck,
    });
  }
  if (errors.length || anyConflict)
    return { ...base, status: "REVIEW_REQUIRED", errors: errors.length ? errors : ["MATERIAL_CONFLICT"], level: null, levels };
  const lo = upperLowerLevel(levels, "lower");
  const hi = upperLowerLevel(levels, "upper");
  let status: MmeOutcome["status"] = lo === hi && lo > 0 ? "CONFIRMED" : "BOUNDED_UNCERTAIN";
  if (lo === 0 && hi > 0 && Object.values(levels[0]!.checks).every((v) => v!.status === "UNKNOWN")) status = "NOT_DETERMINED";
  if (lo === 0 && hi === 0) {
    status =
      CRITICAL.some((k) => levels[0]!.checks[k]?.status === "FAIL") || levels.slice(0, 1).every((v) => v.upper <= THRESHOLD_L)
        ? "M1_NOT_ACCREDITED"
        : "NOT_DETERMINED";
  }
  const lv = (n: number) => (`M${n}` as "M1");
  return {
    ...base,
    status,
    level: status === "CONFIRMED" ? lv(lo) : null,
    demonstrated_floor: lo ? lv(lo) : null,
    possible_ceiling: hi ? lv(hi) : null,
    score_interval_0_100: hi ? [lo ? 20 * lo : null, 20 * hi] : null,
    levels,
    scoring_note: "Escala ordinal transformada a puntos solo por capacidad; no agrega dominios.",
  };
}
