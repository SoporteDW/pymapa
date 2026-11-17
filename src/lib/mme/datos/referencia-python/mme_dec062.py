"""PYMAPA-MME 1.0 - motor determinista de referencia, sin dependencias externas.
No verifica por si mismo la verdad empresarial: consume atestaciones autorizadas,
firmadas, con evidencias resueltas e integridad comprobada.
"""
from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime
from hashlib import sha256
import hmac, json
from typing import Any

VERSION = "PYMAPA-MME-1.0.0"
PASS, FAIL, UNKNOWN, CONFLICT = "PASS", "FAIL", "UNKNOWN", "CONFLICT"
NOT_APPLICABLE = "NOT_APPLICABLE"
REVIEW_REQUIRED = "REVIEW_REQUIRED"
ROLES_AUTHORIZED = {"METHODOLOGIST", "AUDITOR", "DETERMINISTIC_VALIDATOR"}
CHECKS = ("HECHO", "OPERACION", "CONTEXTO", "EVIDENCIA")
WEIGHT = 0.25
THRESHOLD_L = 0.50  # L: estrictamente mayor de 50%
THRESHOLD_F = 0.85  # F: estrictamente mayor de 85%


class InputError(ValueError):
    pass


def _canonical(obj: dict) -> bytes:
    return json.dumps(obj, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def sign_attestation(attestation: dict, signing_secret: str) -> dict:
    """Solo para el emisor de atestaciones (lado servidor). Nunca exponer secretos al cliente."""
    unsigned = {k: v for k, v in attestation.items() if k != "signature"}
    mac = hmac.new(signing_secret.encode(), _canonical(unsigned), "sha256").hexdigest()
    return {**unsigned, "signature": mac}


def validate_attestation(a: dict, *, check_id: str, evidence_store: dict, signers: dict,
                         assessment_id: str) -> list[str]:
    errs: list[str] = []
    if a.get("check_id") != check_id: errs.append("CHECK_ID_MISMATCH")
    if a.get("assessment_id") != assessment_id: errs.append("ASSESSMENT_ID_MISMATCH")
    if a.get("verdict") not in (PASS, FAIL, CONFLICT): errs.append("INVALID_VERDICT")
    if a.get("version") != VERSION: errs.append("VERSION_MISMATCH")
    signer = signers.get(a.get("reviewer_id"))
    if not signer or signer.get("role") not in ROLES_AUTHORIZED:
        errs.append("REVIEWER_NOT_AUTHORIZED")
    else:
        unsigned = {k: v for k, v in a.items() if k != "signature"}
        expected = hmac.new(signer["secret"].encode(), _canonical(unsigned), "sha256").hexdigest()
        if not hmac.compare_digest(str(a.get("signature", "")), expected):
            errs.append("BAD_SIGNATURE")
    refs = a.get("evidence_refs") or []
    if not isinstance(refs, list) or not refs:
        errs.append("MISSING_EVIDENCE")
    else:
        for ref in refs:
            e = evidence_store.get(ref)
            if not e:
                errs.append("EVIDENCE_NOT_RESOLVED:" + str(ref))
            elif not isinstance(e.get("content"), bytes) or sha256(e["content"]).hexdigest() != e.get("sha256"):
                errs.append("EVIDENCE_HASH_INVALID:" + str(ref))
            elif e.get("revoked_at") or e.get("revocation_state") in ("REVOKED", "INVALIDATED"):
                errs.append("EVIDENCE_REVOKED:" + str(ref))
            elif not e.get("source") or not e.get("observed_at"):
                errs.append("EVIDENCE_PROVENANCE_INCOMPLETE:" + str(ref))
    if a.get("verdict") == CONFLICT:
        resolution = a.get("conflict_resolution")
        if not isinstance(resolution, dict):
            errs.append("CONFLICT_MATERIALITY_UNDETERMINED")
        else:
            if resolution.get("materiality") not in ("MATERIAL", "NON_MATERIAL"):
                errs.append("CONFLICT_MATERIALITY_UNDETERMINED")
            if not resolution.get("rationale") or not resolution.get("evidence_refs") or not resolution.get("authority_id") or not resolution.get("decision_version"):
                errs.append("CONFLICT_DECISION_PROVENANCE_INCOMPLETE")
            if resolution.get("authority_id") != a.get("reviewer_id"):
                errs.append("CONFLICT_DECISION_AUTHORITY_MISMATCH")
            if resolution.get("resolved_verdict") not in (PASS, FAIL, UNKNOWN):
                errs.append("CONFLICT_REQUIRES_EXPLICIT_DISPOSITION")
            for ref in resolution.get("evidence_refs", []):
                e = evidence_store.get(ref)
                if not e or e.get("revoked_at") or e.get("revocation_state") in ("REVOKED", "INVALIDATED"):
                    errs.append("CONFLICT_EVIDENCE_MISSING_OR_REVOKED:" + str(ref))
    return errs


def validate_business_claim(a: dict, defn: dict, indicator: dict | None) -> list[str]:
    """Filtro de esquema; la veracidad semantica sigue requiriendo adjudicacion."""
    verdict = a.get("verdict")
    if verdict == CONFLICT and isinstance(a.get("conflict_resolution"), dict):
        resolution = a["conflict_resolution"]
        verdict = resolution.get("resolved_verdict") if resolution.get("materiality") == "NON_MATERIAL" else UNKNOWN
    if verdict != PASS:
        return []
    errors = []
    p = a.get("payload", {})
    if not isinstance(p, dict):
        return ["PAYLOAD_NOT_OBJECT"]
    level = defn["level"]
    kind = defn["type"]
    if kind == "HECHO":
        if p.get("fact_kind") != defn["fact_kind"]: errors.append("FACT_KIND_MISMATCH")
        facts = p.get("facts") or {}
        for f in defn["required_domain_fields"]:
            v = facts.get(f)
            if v is None or v == "" or v == "SYNTHETIC_ATOM_VALUE":
                errors.append("REQUIRED_FACT_MISSING:" + f)
        if not p.get("semantic_reviewed", False): errors.append("SEMANTIC_REVIEW_REQUIRED")
    elif kind == "OPERACION" and level == "M4":
        obs = p.get("observation") or {}
        if not indicator or obs.get("indicator_id") != indicator.get("id"):
            errors.append("INDICATOR_MISMATCH")
        errors += _validate_observation(obs)
        if not p.get("decision_ref") or p.get("decision_used_metric") is not True:
            errors.append("METRIC_MANAGEMENT_USE_NOT_DEMONSTRATED")
    elif kind == "OPERACION" and level == "M5":
        if not indicator or indicator.get("direction") not in ("HIGHER", "LOWER"):
            errors.append("INDICATOR_DIRECTION_UNSET")
        cmp = p.get("comparison") or {}
        o0, o1, o2 = [cmp.get(x) or {} for x in ("baseline", "followup_1", "followup_2")]
        for label, o in zip(("baseline", "followup_1", "followup_2"), (o0, o1, o2)):
            errors.extend([label + ":" + err for err in _validate_observation(o)])
            if indicator and o.get("indicator_id") != indicator.get("id"):
                errors.append("INDICATOR_MISMATCH:" + label)
        if cmp.get("comparable") is not True or not p.get("change_ref") or not p.get("alternatives_reviewed"):
            errors.append("COMPARABILITY_OR_INTERVENTION_MISSING")
        if not errors and not (str(o0["period"]) < str(o1["period"]) < str(o2["period"])):
            errors.append("PERIODS_NOT_STRICTLY_ORDERED")
        if not errors:
            rates = [float(o["numerator"]) / float(o["denominator"]) for o in (o0, o1, o2)]
            sign = 1 if indicator["direction"] == "HIGHER" else -1
            # Decision operativa V1: cambio positivo observado en DOS seguimientos,
            # sin afirmar significancia estadistica o causalidad.
            if not (sign * (rates[1] - rates[0]) > 0 and sign * (rates[2] - rates[0]) > 0):
                errors.append("NO_PERSISTENT_FAVORABLE_OBSERVATION")
    elif kind == "OPERACION":
        if not p.get("applied_case_ref") or not p.get("observed_result"):
            errors.append("OPERATIONAL_CASE_NOT_EVIDENCED")
    elif kind == "CONTEXTO":
        if not p.get("actor") or not p.get("period") or not p.get("scope"):
            errors.append("CONTEXT_NOT_DEFINED")
    elif kind == "EVIDENCIA":
        if p.get("source_corroborates_claim") is not True or p.get("material_contradiction") is True:
            errors.append("EVIDENCE_NOT_CORROBORATED")
    return errors


def _validate_observation(obs: dict) -> list[str]:
    errors = []
    for f in ("numerator", "denominator", "period", "source", "indicator_id"):
        if obs.get(f) is None or obs.get(f) == "": errors.append("OBSERVATION_FIELD_MISSING:" + f)
    try:
        n, d = float(obs.get("numerator")), float(obs.get("denominator"))
        if n < 0 or d <= 0 or n > d: errors.append("INVALID_RATIO")
        if not n.is_integer() or not d.is_integer(): errors.append("NON_INTEGER_COUNTS")
    except (ValueError, TypeError): errors.append("INVALID_NUMERIC_VALUES")
    return errors


def rate_label(r: float) -> str:
    if r > THRESHOLD_F: return "F"
    if r > THRESHOLD_L: return "L"
    if r > 0.15: return "P"
    return "N"


def _upper_lower_level(levels: list[dict], bound: str) -> int:
    highest = 0
    for k in range(1, 6):
        current = levels[k - 1]
        f_predecessors = all(levels[i][bound] > THRESHOLD_F for i in range(k - 1))
        critical_ok = all(current["checks"][c]["status"] == PASS
                          if bound == "lower" else current["checks"][c]["status"] != FAIL
                          for c in ("HECHO", "OPERACION", "EVIDENCIA"))
        if f_predecessors and current[bound] > THRESHOLD_L and critical_ok:
            highest = k
        else:
            break
    return highest


def _validate_contextual_na(decision: dict, *, company_id: str, assessment_id: str,
                            capability_id: str, catalog_version: str,
                            evidence_store: dict, signers: dict) -> list[str]:
    errors = []
    expected = {"company_id": company_id, "assessment_id": assessment_id,
                "capability_id": capability_id, "catalog_version": catalog_version}
    for key, value in expected.items():
        if not value or decision.get(key) != value: errors.append("NA_SCOPE_MISMATCH:" + key)
    if not all(decision.get(x) for x in ("context", "justification", "decision_version", "issued_at", "authority_id")):
        errors.append("NA_PROVENANCE_INCOMPLETE")
    signer = signers.get(decision.get("authority_id"))
    if not signer or signer.get("role") not in ROLES_AUTHORIZED:
        errors.append("NA_AUTHORITY_NOT_AUTHORIZED")
    else:
        unsigned = {k: v for k, v in decision.items() if k != "signature"}
        expected_sig = hmac.new(signer["secret"].encode(), _canonical(unsigned), "sha256").hexdigest()
        if not hmac.compare_digest(str(decision.get("signature", "")), expected_sig):
            errors.append("NA_SIGNATURE_INVALID")
    refs = decision.get("evidence_refs")
    if not isinstance(refs, list) or not refs: errors.append("NA_EVIDENCE_MISSING")
    else:
        for ref in refs:
            e = evidence_store.get(ref)
            if not e or e.get("revoked_at") or e.get("revocation_state") in ("REVOKED", "INVALIDATED"):
                errors.append("NA_EVIDENCE_MISSING_OR_REVOKED:" + str(ref))
            elif not isinstance(e.get("content"), bytes) or sha256(e["content"]).hexdigest() != e.get("sha256"):
                errors.append("NA_EVIDENCE_HASH_INVALID:" + str(ref))
    if decision.get("target_type") not in ("CAPABILITY", "CONDITION"):
        errors.append("NA_TARGET_INVALID")
    if decision.get("target_type") == "CONDITION" and not decision.get("rubric_id"):
        errors.append("NA_RUBRIC_MISSING")
    return errors


def assess(capability_id: str, *, catalog: dict, attestations: list[dict],
           assessment_id: str, evidence_store: dict, signers: dict,
           policy_registry: dict, scope: str = "INITIAL_DIAGNOSIS",
           company_id: str = "", na_decisions: list[dict] | None = None,
           activation_registry: dict | None = None) -> dict:
    """Policy registry proviene del servidor, NO del cuerpo de solicitud del usuario."""
    base = {"engine": VERSION, "capability_id": capability_id, "assessment_id": assessment_id}
    c = catalog["capabilities"].get(capability_id)
    if not c: return {**base, "status": "UNKNOWN_CAPABILITY", "level": None}
    if scope not in ("INITIAL_DIAGNOSIS", "EXECUTION_OP05"):
        return {**base, "status": "REVIEW_REQUIRED", "errors": ["UNKNOWN_ASSESSMENT_SCOPE"], "level": None}
    if scope == "EXECUTION_OP05" and capability_id != "OP-05":
        return {**base, "status": "REVIEW_REQUIRED", "errors": ["EXECUTION_SCOPE_CAPABILITY_MISMATCH"], "level": None}
    if scope == "INITIAL_DIAGNOSIS" and capability_id == "OP-05":
        return {**base, "status": "EXCLUDED_OP05", "level": None}
    # DEC-062: N/A contextual; la antigua llave capability:NA se ignora.
    na_decisions = na_decisions or []
    matched_na = [d for d in na_decisions if d.get("capability_id") == capability_id]
    for na in matched_na:
        na_errors = _validate_contextual_na(na, company_id=company_id,
            assessment_id=assessment_id, capability_id=capability_id,
            catalog_version=catalog["version"], evidence_store=evidence_store,
            signers=signers)
        if na_errors:
            return {**base, "status": "REVIEW_REQUIRED", "errors": na_errors, "level": None}
        if na.get("target_type") == "CONDITION":
            # Gobierno no definio agregacion de condicion N/A: no aplicar pesos inventados.
            rubric_ids = {lv["rubric_id"] for lv in c["levels"].values()}
            if na.get("rubric_id") not in rubric_ids:
                return {**base, "status": "REVIEW_REQUIRED", "errors": ["NA_RUBRIC_MISMATCH"], "level": None}
            return {**base, "status": "REVIEW_REQUIRED_NA_AGGREGATION_POLICY", "level": None}
        if na.get("target_type") == "CAPABILITY":
            if attestations:
                return {**base, "status": "REVIEW_REQUIRED", "errors": ["NA_CONFLICTS_WITH_ATTESTATIONS"], "level": None}
            return {**base, "status": "NOT_APPLICABLE_CONTEXTUAL", "level": None,
                    "na_decision_version": na["decision_version"]}
    if policy_registry.get(capability_id) != catalog["version"]:
        return {**base, "status": "BLOCKED_NO_AUTHORIZATION", "level": None}
    # Registro per-ID/versionado, siempre exigido por esta variante DEC-062.
    if activation_registry is None:
        return {**base, "status": "BLOCKED_NO_ITEM_AUTHORIZATION", "level": None}
    required = []
    for lvl in c["levels"].values():
        required.append((lvl["original_predicate_id"], catalog["version"]))
        for ck in lvl["checks"]: required.append((ck["id"], catalog["version"]))
    for key, version in required:
        record = activation_registry.get(key)
        if not isinstance(record, dict) or record.get("version") != version or record.get("state") != "ENABLED":
            return {**base, "status": "BLOCKED_NO_ITEM_AUTHORIZATION", "level": None,
                    "blocked_item_id": key}
    # Indicadores M4/M5 requieren autorizacion individual, nunca aprobacion global.
    for a in attestations:
        if a.get("verdict") == PASS and ("-M4-" in str(a.get("check_id")) or "-M5-" in str(a.get("check_id"))):
            indicator = catalog["indicators"].get(capability_id)
            if not indicator:
                return {**base, "status": "BLOCKED_INDICATOR_NOT_AUTHORIZED", "level": None}
            record = activation_registry.get(indicator["id"])
            if not record or record.get("version") != indicator.get("version") or record.get("state") != "ENABLED":
                return {**base, "status": "BLOCKED_INDICATOR_NOT_AUTHORIZED", "level": None}
    # Las relaciones adquisicion-check solo se aceptan con binding explicitamente habilitado.
    for a in attestations:
        binding = a.get("binding_id")
        if binding:
            rec = activation_registry.get(binding)
            if not rec or rec.get("state") != "ENABLED" or rec.get("version") != a.get("binding_version"):
                return {**base, "status": "BLOCKED_BINDING_NOT_AUTHORIZED", "level": None}
    lookup = {}
    for a in attestations:
        if a.get("check_id") in lookup:
            return {**base, "status": "REVIEW_REQUIRED", "errors": ["DUPLICATE_ADJUDICATION"], "level": None}
        lookup[a.get("check_id")] = a
    errors, any_conflict, levels = [], False, []
    indicator = catalog["indicators"].get(capability_id)
    for j in range(1, 6):
        ck = {}
        for defn in c["levels"]["M" + str(j)]["checks"]:
            a = lookup.get(defn["id"])
            status = UNKNOWN
            if a:
                e = validate_attestation(a, check_id=defn["id"], evidence_store=evidence_store,
                                         signers=signers, assessment_id=assessment_id)
                e += validate_business_claim(a, defn, indicator)
                if e:
                    errors += [defn["id"] + ":" + msg for msg in e]
                else:
                    status = a["verdict"]
                    if status == CONFLICT:
                        r = a["conflict_resolution"]
                        if r["materiality"] == "MATERIAL":
                            any_conflict = True
                        else:
                            status = r["resolved_verdict"]
            if status == CONFLICT: any_conflict = True
            ck[defn["type"]] = {"status": status, "weight": WEIGHT}
        passed = sum(WEIGHT for v in ck.values() if v["status"] == PASS)
        unknown = sum(WEIGHT for v in ck.values() if v["status"] in (UNKNOWN, CONFLICT))
        levels.append({"level": "M" + str(j), "lower": round(passed, 6),
                       "upper": round(passed + unknown, 6), "lower_band": rate_label(passed),
                       "upper_band": rate_label(passed + unknown), "checks": ck})
    if errors or any_conflict:
        return {**base, "status": "REVIEW_REQUIRED", "errors": errors if errors else ["MATERIAL_CONFLICT"],
                "level": None, "levels": levels}
    lo = _upper_lower_level(levels, "lower")
    hi = _upper_lower_level(levels, "upper")
    status = "CONFIRMED" if lo == hi and lo > 0 else "BOUNDED_UNCERTAIN"
    if lo == 0 and hi > 0 and all(v["status"] == UNKNOWN for v in levels[0]["checks"].values()):
        status = "NOT_DETERMINED"
    if lo == hi == 0:
        if any(levels[0]["checks"][c]["status"] == FAIL for c in ("HECHO", "OPERACION", "EVIDENCIA")) or all(v["upper"] <= THRESHOLD_L for v in levels[:1]):
            status = "M1_NOT_ACCREDITED"
        else:
            status = "NOT_DETERMINED"
    return {**base, "status": status,
            "level": "M" + str(lo) if status == "CONFIRMED" else None,
            "demonstrated_floor": "M" + str(lo) if lo else None,
            "possible_ceiling": "M" + str(hi) if hi else None,
            "score_interval_0_100": [20 * lo if lo else None, 20 * hi] if hi else None,
            "levels": levels, "scoring_note": "Escala ordinal transformada a puntos solo por capacidad; no agrega dominios."}
