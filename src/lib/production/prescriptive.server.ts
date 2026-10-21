import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { assertPrescriptionRole, evaluatePrescription, prescriptionInputSchema } from "./prescriptive-contract";

/** No bootstrap, no UI activation and no writes to findings, evidence or Engine. */
export async function evaluateStoredPrescription(db: SupabaseClient<Database>, actor: string, raw: unknown) {
  const input = prescriptionInputSchema.parse(raw);
  const { data: assessment, error: assessmentError } = await db.from("assessments").select("id, organization_id, knowledge_version_id").eq("id", input.assessmentId).maybeSingle();
  if (assessmentError || !assessment) throw new Error("PRESCRIPTION_SCOPE_FORBIDDEN");
  const org = assessment.organization_id;
  const { data: member, error: memberError } = await db.from("memberships").select("role").eq("organization_id", org).eq("user_id", actor).maybeSingle();
  if (memberError) throw new Error("PRESCRIPTION_ROLE_FORBIDDEN");
  assertPrescriptionRole(member?.role ?? null);
  const { data: qa, error: qaError } = await db.from("synthetic_qa_ingestion_authorizations").select("active").eq("organization_id", org).maybeSingle();
  if (qaError || !qa?.active) throw new Error("PRESCRIPTION_SYNTHETIC_QA_ONLY");
  const { data: finding, error: findingError } = await db.from("findings").select("*").eq("id", input.findingId).eq("organization_id", org).eq("assessment_id", input.assessmentId).maybeSingle();
  if (findingError || !finding || finding.capability_id !== "OP-01" || finding.finding_ref !== "H04"
    || finding.knowledge_pack_version !== "1.0.0" || finding.engine_version !== "0.2.0"
    || finding.knowledge_version_id !== assessment.knowledge_version_id) throw new Error("PRESCRIPTION_FINDING_SCOPE_MISMATCH");
  let previous: { id: string; lifecycleState: string; emissionDecision: string } | undefined;
  if (input.priorDecisionRef) {
    const { data: row, error } = await db.from("prescriptive_decisions").select("*").eq("id",input.priorDecisionRef).eq("organization_id",org).eq("assessment_id",input.assessmentId).eq("finding_id",input.findingId).maybeSingle();
    if (error || !row) throw new Error("PRESCRIPTION_HISTORY_SCOPE_MISMATCH");
    const p = row.payload as Record<string, Json | undefined>;
    previous = { id: row.id, lifecycleState: typeof p.lifecycleState === "string" ? p.lifecycleState : "EVALUATED", emissionDecision: row.emission_decision };
  }
  const results = await Promise.all([
    db.from("observations").select("*").eq("assessment_id",input.assessmentId).eq("organization_id",org),
    db.from("observation_evidence").select("observation_id,evidence_id").eq("organization_id",org),
    db.from("finding_observations").select("observation_id").eq("finding_id",input.findingId).eq("organization_id",org),
    db.from("fragment_mappings").select("*").eq("assessment_id",input.assessmentId).eq("organization_id",org),
    db.from("evidence").select("id,captured_at,created_at").eq("assessment_id",input.assessmentId).eq("organization_id",org),
  ]);
  if (results.some(r=>r.error)) throw new Error("PRESCRIPTION_EVIDENCE_READ_FAILED");
  const [obsResult, linkResult, findingLinkResult, mappingResult, evidenceResult] = results;
  const observations = obsResult.data ?? [];
  const values = new Map(observations.map(o=>[o.id,o.value as Record<string,Json|undefined>]));
  const corrected = new Set(observations.flatMap(o=> {const v=values.get(o.id); return typeof v?.correctsObservationId === "string" ? [v.correctsObservationId] : []; }));
  const mappings = mappingResult.data ?? [];
  const current = observations.filter(o=>{
    const v=values.get(o.id);
    if (!v || corrected.has(o.id) || v.documentControl || v.knowledgeState !== "KNOWN" || (v.capabilityId ?? "OP-01") !== "OP-01") return false;
    const p=v.documentProvenance as Record<string,Json|undefined> | undefined;
    if (!p) return Boolean(o.source_response_id);
    return mappings.some(m=>m.id===p.mappingId && m.status==="VALIDATED" && m.target_type==="VARIABLE"
      && m.target_ref===o.variable_ref && m.factual_correspondence_ref===v.acquisitionRef
      && m.capability_id==="OP-01" && m.knowledge_version_id===assessment.knowledge_version_id
      && m.knowledge_pack_id===finding.knowledge_pack_id && m.knowledge_pack_version==="1.0.0"
      && m.fragment_id===p.fragmentId && m.interpretation_id===p.interpretationId
      && ((m.admission_basis==="HUMAN_VALIDATION" && m.validated_by) || (m.admission_basis==="GOVERNED_RULE" && m.admission_rule_ref)));
  });
  const currentIds=new Set(current.map(o=>o.id));
  const links=linkResult.data ?? [];
  const admittedIds = [...new Set(links.filter(l=>currentIds.has(l.observation_id)).map(l=>l.evidence_id))].filter(id=>(evidenceResult.data ?? []).some(e=>e.id===id));
  const supported = finding.lifecycle_state === "CONFIRMED" && Boolean(finding.reviewed_by && finding.reviewed_at)
    && (findingLinkResult.data ?? []).some(l=>currentIds.has(l.observation_id));
  const now=new Date().toISOString();
  const decision=evaluatePrescription(input,{actor,now,findingSupported:supported,admittedEvidenceIds:admittedIds,previous});
  // Privileged INSERT only after user-scoped role/QA/lineage verification.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const {data:existing,error:readError}=await supabaseAdmin.from("prescriptive_decisions").select("*").eq("organization_id",org).eq("request_id",input.requestId).maybeSingle();
  if(readError) throw new Error("PRESCRIPTION_HISTORY_READ_FAILED");
  if(existing) {
    const payload=existing.payload as Record<string,Json|undefined>;
    if(existing.assessment_id!==input.assessmentId || existing.finding_id!==input.findingId || JSON.stringify(payload.input)!==JSON.stringify(input)) throw new Error("PRESCRIPTION_REQUEST_REUSE_MISMATCH");
    return {id:existing.id,emissionDecision:"BLOCKED",semanticDecision:payload.semanticDecision,lifecycleState:payload.lifecycleState};
  }
  const {data:stored,error}=await supabaseAdmin.from("prescriptive_decisions").insert({organization_id:org,assessment_id:input.assessmentId,finding_id:input.findingId,actor,request_id:input.requestId,prior_decision_ref:input.priorDecisionRef,payload:JSON.parse(JSON.stringify({...decision,input})) as Json}).select("id").single();
  if(error || !stored) throw new Error("PRESCRIPTION_HISTORY_WRITE_FAILED");
  // No recommendation title, text or activities returned to end-user UI.
  return {id:stored.id,emissionDecision:decision.emissionDecision,semanticDecision:decision.semanticDecision,lifecycleState:decision.lifecycleState};
}