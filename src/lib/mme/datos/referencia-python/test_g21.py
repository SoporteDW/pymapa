"""Synthetic G2.1 boundaries; emits fixtures only from the Python reference."""
import copy
import json
from pathlib import Path
import unittest
from hashlib import sha256
import mme_dec062 as mme

SECRET = "SYNTHETIC-G21-ONLY"
CAT = json.loads((Path(__file__).parents[1] / "catalogo_mme_31_155_620.json").read_text())
BLOB = b"SYNTHETIC G21 EVIDENCE"
EVID = {"e1": {"content": BLOB, "sha256": sha256(BLOB).hexdigest(),
               "source": "SYNTHETIC", "observed_at": "2026-11-17"}}
SIGNERS = {"reviewer": {"role": "METHODOLOGIST", "secret": SECRET}}
CHECK = CAT["capabilities"]["CM-03"]["levels"]["M1"]["checks"][0]
BASE = {"check_id": CHECK["id"], "assessment_id": "A1", "verdict": "CONFLICT",
        "reviewer_id": "reviewer", "version": mme.VERSION, "evidence_refs": ["e1"],
        "payload": {}, "conflict_resolution": {
            "materiality": "NON_MATERIAL", "resolved_verdict": "UNKNOWN",
            "rationale": "Synthetic decision", "authority_id": "reviewer",
            "decision_version": "G21-LAB", "evidence_refs": ["e1"]}}


def validate(a):
    return mme.validate_attestation(a, check_id=CHECK["id"], assessment_id="A1",
                                    evidence_store=EVID, signers=SIGNERS)


def run(a):
    reg = {i: {"version": CAT["version"], "state": "ENABLED"}
           for level in CAT["capabilities"]["CM-03"]["levels"].values()
           for i in [level["original_predicate_id"]] + [c["id"] for c in level["checks"]]}
    return mme.assess("CM-03", catalog=CAT, attestations=[a], assessment_id="A1",
                      evidence_store=EVID, signers=SIGNERS,
                      policy_registry={"CM-03": CAT["version"]}, activation_registry=reg)


def fixture():
    cases = []
    for label, refs in [("null", None), ("empty", []), ("string", "e1"),
                        ("object", {}), ("invalid_member", [None]), ("valid", ["e1"])]:
        a = copy.deepcopy(BASE)
        a["conflict_resolution"]["evidence_refs"] = refs
        a = mme.sign_attestation(a, SECRET)
        cases.append({"label": label, "attestation": a, "errors": validate(a), "outcome": run(a)})
    numeric = {"signature_version": mme.SIGNATURE_NUMERIC_VERSION,
               "payload": {"integer": 1.0, "negative_zero": -0.0,
                           "nested": [2.0, "1.25"], "max": 9007199254740991}}
    return {"numeric": {"input": numeric, "signature": mme.sign_attestation(numeric, SECRET)["signature"]},
            "conflicts": cases}


class TestG21(unittest.TestCase):
    def test_legacy_numbers_require_explicit_version(self):
        for n in [1, 1.0, 1.25]:
            with self.assertRaisesRegex(mme.InputError, "SIGNED_NUMBER_REQUIRES_V2"):
                mme.sign_attestation({"payload": {"n": n}}, SECRET)

    def test_integral_float_and_integer_same_signature(self):
        a = {"signature_version": mme.SIGNATURE_NUMERIC_VERSION, "payload": {"n": 1}}
        b = {"signature_version": mme.SIGNATURE_NUMERIC_VERSION, "payload": {"n": 1.0}}
        self.assertEqual(mme.sign_attestation(a, SECRET)["signature"], mme.sign_attestation(b, SECRET)["signature"])

    def test_nonintegral_and_unsafe_numbers_rejected(self):
        for n in [1.25, float("nan"), float("inf"), 9007199254740992]:
            with self.assertRaisesRegex(mme.InputError, "SIGNED_NUMBER_NOT_SAFE_INTEGER"):
                mme.sign_attestation({"signature_version": mme.SIGNATURE_NUMERIC_VERSION, "n": n}, SECRET)

    def test_unknown_version_rejected(self):
        with self.assertRaisesRegex(mme.InputError, "UNSUPPORTED_SIGNATURE_VERSION"):
            mme.sign_attestation({"signature_version": "unknown"}, SECRET)

    def test_decimal_string_preserved(self):
        self.assertIn(b'"n":"1.25"', mme._canonical({"n": "1.25"}))

    def test_conflict_null_strict_rejection(self):
        case = fixture()["conflicts"][0]
        self.assertIn("CONFLICT_EVIDENCE_REFS_INVALID", case["errors"])
        self.assertEqual(case["outcome"]["status"], "REVIEW_REQUIRED")
        self.assertIsNone(case["outcome"]["level"])

    def test_conflict_invalid_lists_and_valid_control(self):
        for case in fixture()["conflicts"]:
            if case["label"] == "valid":
                self.assertEqual(case["errors"], [])
            else:
                self.assertIn("CONFLICT_EVIDENCE_REFS_INVALID", case["errors"])

    def test_invalid_signed_number_returns_validation_error(self):
        a = mme.sign_attestation(BASE, SECRET)
        a["payload"] = {"n": 1.0}
        self.assertIn("SIGNED_NUMBER_REQUIRES_V2", validate(a))


if __name__ == "__main__":
    import sys
    if len(sys.argv) == 3 and sys.argv[1] == "--fixture":
        Path(sys.argv[2]).write_text(json.dumps(fixture(), ensure_ascii=False, indent=2) + "\n")
    else:
        unittest.main(verbosity=2)