import { describe, expect, it } from "vitest";
import { assertPrescriptionRole, CONDITION_IDS, evaluatePrescription, prescriptionInputSchema, type PrescriptionInput, type VerifiedContext } from "./prescriptive-contract";

const evidence = "10000000-0000-4000-8000-000000000001";
export function syntheticInput(): PrescriptionInput {
  return prescriptionInputSchema.parse({
    requestId: "10000000-0000-4000-8000-000000000002", assessmentId: "10000000-0000-4000-8000-000000000003", findingId: "10000000-0000-4000-8000-000000000004",
    priorDecisionRef: null, trigger: "INITIAL_REVIEW",
    conditions: Object.fromEntries(CONDITION_IDS.map((id) => [id, { state: "TRUE", evidenceRefs: [evidence], justification: `QA sintética ${id}: evidencia revisada por responsable` }])),
    processContext: { processId: "QA-PROCESS", name: "Calibración sintética", dependency: "Criterio de calibración concentrado", impact: "Interrupción corroborada en prueba QA", validUntil: "2030-01-01T00:00:00Z", substituteRole: "Alterno autorizado QA", proposedActivity: "Transferencia focalizada", validationCriterion: "Ejecución independiente según riesgo", uncertainty: "Revisar después de cambio de proceso" },
    causalAssessment: "TRANSFERABLE_KNOWLEDGE", differential: { access: "Examinado", staffing: "Examinado", competence: "Examinado", design: "Examinado", documentation: "Examinado", coordination: "Examinado" }, contraindications: [],
  });
}
const ctx: VerifiedContext = { actor: "qa-owner", now: "2026-10-21T05:44:00Z", findingSupported: true, admittedEvidenceIds: [evidence] };
function run(input: PrescriptionInput, context = ctx) {
  const out = evaluatePrescription(input, context);
  expect(out.emissionDecision).toBe("BLOCKED");
  expect(out.activationApprovalId).toBeNull();
  expect(out.publicationState).toBe("UNPUBLISHED");
  return out;
}
describe("DEC-046 T01–T12", () => {
  it("T01 expert with effective backup preserves", () => { const i=syntheticInput(); i.conditions.C2.state="FALSE"; i.conditions.C3.state="FALSE"; expect(run(i).semanticDecision).toBe("PRESERVE_MONITOR"); });
  it("T02 six TRUE allow only candidature with own ACT identities", () => { const out=run(syntheticInput()); expect(out.semanticDecision).toBe("RECOMMEND_CANDIDATE"); expect(out.activityIds).toEqual([1,2,3,4,5].map(n=>`PRESC-OP01-H04-ACT-0${n}`)); expect(out.recommendationId).toBe("PRESC-OP01-H04-REC-01"); });
  it("T03 access restriction abstains", () => { const i=syntheticInput(); i.conditions.C6.state="FALSE"; i.causalAssessment="ACCESS"; expect(run(i).semanticDecision).toBe("ABSTAIN_ESCALATE"); });
  it("T04 conflicting old document blocks", () => { const i=syntheticInput(); i.conditions.C5.state="CONTRADICTORY"; expect(run(i).semanticReasonCodes).toContain("CONCILIATION_REQUIRED"); });
  it("T05 unknown impact requests C3", () => { const i=syntheticInput(); i.conditions.C3.state="UNKNOWN"; expect(run(i).missingInfo.map(x=>x.conditionId)).toContain("C3"); expect(run(i).semanticDecision).toBe("REQUEST_INFO"); });
  it("T06 prohibited transfer has no ACT03", () => { const i=syntheticInput(); i.conditions.C6.state="FALSE"; i.contraindications=["CONFIDENTIALITY_REGULATION"]; const out=run(i); expect(out.semanticDecision).toBe("ABSTAIN_ESCALATE"); expect(out.activityIds).toEqual([]); });
  it("T07 staffing does not replace H04", () => { const i=syntheticInput(); i.conditions.C4.state="FALSE"; i.causalAssessment="STAFFING"; const out=run(i); expect(out.findingId).toBe(i.findingId); expect(out.semanticDecision).toBe("ABSTAIN_ESCALATE"); });
  it("T08 mitigated unissued monitors, hypothetical prior emission suspends without emitting", () => { const i=syntheticInput(); i.conditions.C2.state="FALSE"; i.conditions.C3.state="FALSE"; expect(run(i).semanticDecision).toBe("PRESERVE_MONITOR"); expect(run(i,{...ctx,previous:{id:"prior",lifecycleState:"EMITTED",emissionDecision:"EMITTED"}}).lifecycleState).toBe("SUSPENDED"); });
  it("T09 DRAFT gates cannot suppress semantic candidature or allow emission", () => { const out=run(syntheticInput(),{...ctx,contentApproval:{state:"DRAFT",id:null}}); expect(out.semanticDecision).toBe("RECOMMEND_CANDIDATE"); expect(out.contentApprovalId).toBeNull(); });
  it("T10 unknown backup requests C6", () => { const i=syntheticInput(); i.conditions.C6.state="UNKNOWN"; const out=run(i); expect(out.semanticDecision).toBe("REQUEST_INFO"); expect(out.missingInfo.map(x=>x.conditionId)).toContain("C6"); });
  it("T11 process change appends suspended reevaluation, preserving previous", () => { const previous={id:"prior",lifecycleState:"EMITTED",emissionDecision:"EMITTED"}; const copy=structuredClone(previous); const i=syntheticInput(); i.trigger="PROCESS_CHANGE"; const out=run(i,{...ctx,previous}); expect(out.lifecycleState).toBe("SUSPENDED"); expect(out.priorDecisionRef).toBe("prior"); expect(previous).toEqual(copy); });
  it("T12 substitution conflict abstains", () => { const i=syntheticInput(); i.conditions.C2.state="CONTRADICTORY"; expect(run(i).semanticDecision).toBe("ABSTAIN_ESCALATE"); });
});
describe("DEC-046 fail-closed security", () => {
  it("MEMBER cannot evaluate",()=>expect(()=>assertPrescriptionRole("MEMBER")).toThrow("PRESCRIPTION_ROLE_FORBIDDEN"));
  it("missing role cannot evaluate",()=>expect(()=>assertPrescriptionRole(null)).toThrow());
  it("confirmed H04 alone never recommends",()=>expect(run(syntheticInput(),{...ctx,admittedEvidenceIds:[]}).semanticDecision).toBe("REQUEST_INFO"));
  it("foreign or CANDIDATE evidence cannot satisfy TRUE",()=>{ const i=syntheticInput(); i.conditions.C1.evidenceRefs=["20000000-0000-4000-8000-000000000001"]; expect(run(i).conditions.C1.state).toBe("UNKNOWN"); });
  it("withdrawn H04 support prevents candidature",()=>expect(run(syntheticInput(),{...ctx,findingSupported:false}).semanticDecision).toBe("REQUEST_INFO"));
  it("NOT_APPLICABLE mandatory condition abstains",()=>{const i=syntheticInput(); i.conditions.C1.state="NOT_APPLICABLE"; expect(run(i).semanticDecision).toBe("ABSTAIN_ESCALATE");});
  it("client cannot inject emission approval",()=>expect(prescriptionInputSchema.safeParse({...syntheticInput(),emissionDecision:"EMIT_ALLOWED",activationApprovalId:"fake"}).success).toBe(false));
  it("missing differential cannot recommend",()=>{const i=syntheticInput(); i.differential={}; expect(run(i).semanticDecision).toBe("REQUEST_INFO");});
});