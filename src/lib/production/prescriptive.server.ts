import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { assertPrescriptionRole, evaluatePrescription, prescriptionInputSchema } from "./prescriptive-contract.server";

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
    || finding.knowledge_pack_id !== "op-01" || finding.knowledge_pack_version !== "1.0.0" || finding.engine_version !== "pymapa-knowledge-engine/0.2.0"
    || finding.knowledge_version_id !== assessment.knowledge_version_id) throw new Error("PRESCRIPTION_FINDING_SCOPE_MISMATCH");
  const { data: run, error: runError } = await db.from("evaluation_runs").select("*").eq("id",finding.evaluation_run_id).eq("organization_id",org).eq("assessment_id",input.assessmentId).maybeSingle();
  if (runError || !run || !run.completed_at || !["PROCESSED","NEEDS_REVIEW"].includes(run.status) || run.knowledge_version_id !== assessment.knowledge_version_id
    || run.engine_version !== finding.engine_version || !finding.variable_refs.includes("VA07")
    || !finding.rule_refs.some(ref=>["R-OP01-02","R-OP01-05"].includes(ref))) throw new Error("PRESCRIPTION_FINDING_LINEAGE_INVALID");
  let previous: { id: string; lifecycleState: string; emissionDecision: string } | undefined;
  let priorDecisionRef=input.priorDecisionRef;
  if (!priorDecisionRef && input.trigger !== "INITIAL_REVIEW") {
    const {data:latest,error}=await db.from("prescriptive_decisions").select("id").eq("organization_id",org).eq("assessment_id",input.assessmentId).eq("finding_id",input.findingId).order("created_at",{ascending:false}).limit(1).maybeSingle();
    if(error) throw new Error("PRESCRIPTION_HISTORY_READ_FAILED");
    priorDecisionRef=latest?.id ?? null;
  }
  if (priorDecisionRef) {
    const { data: row, error } = await db.from("prescriptive_decisions").select("*").eq("id",priorDecisionRef).eq("organization_id",org).eq("assessment_id",input.assessmentId).eq("finding_id",input.findingId).maybeSingle();
    if (error || !row) throw new Error("PRESCRIPTION_HISTORY_SCOPE_MISMATCH");
    const p = row.payload as Record<string, Json | undefined>;
    previous = { id: row.id, lifecycleState: typeof p['lifecycleState'] === "string" ? p['lifecycleState'] : "EVALUATED", emissionDecision: row.emission_decision };
  }
  const results = await Promise.all([
    db.from("observations").select("*").eq("assessment_id",input.assessmentId).eq("organization_id",org),
    db.from("observation_evidence").select("observation_id,evidence_id").eq("organization_id",org),
    db.from("finding_observations").select("observation_id").eq("finding_id",input.findingId).eq("organization_id",org),
    db.from("fragment_mappings").select("*").eq("assessment_id",input.assessmentId).eq("organization_id",org),
    db.from("evidence").select("id,captured_at,created_at").eq("assessment_id",input.assessmentId).eq("organization_id",org),
    db.from("document_extractions").select("id,status,evidence_version_id").eq("organization_id",org),
    db.from("evidence_versions").select("id,evidence_id,version_number").eq("organization_id",org),
  ]);
  if (results.some(r=>r.error)) throw new Error("PRESCRIPTION_EVIDENCE_READ_FAILED");
  const [obsResult, linkResult, findingLinkResult, mappingResult, evidenceResult, extractionResult, versionResult] = results;
  const observations = obsResult.data ?? [];
  const values = new Map(observations.map(o=>[o.id,o.value as Record<string,Json|undefined>]));
  const corrected = new Set(observations.flatMap(o=> {const v=values.get(o.id); return typeof v?.['correctsObservationId'] === "string" ? [v['correctsObservationId']] : []; }));
  const mappings = mappingResult.data ?? [];
  const current = observations.filter(o=>{
    const v=values.get(o.id);
    if (!v || corrected.has(o.id) || v['documentControl'] || v['knowledgeState'] !== "KNOWN" || (v['capabilityId'] ?? "OP-01") !== "OP-01") return false;
    const p=v['documentProvenance'] as Record<string,Json|undefined> | undefined;
    if (!p) return Boolean(o.source_response_id);
    const extraction=(extractionResult.data ?? []).find(e=>e.id===p['extractionId'] && e.status==="COMPLETED");
    const version=(versionResult.data ?? []).find(e=>e.id===extraction?.evidence_version_id && e.evidence_id===p['evidenceId']);
    if (!version || (versionResult.data ?? []).some(e=>e.evidence_id===version.evidence_id && e.version_number>version.version_number)) return false;
    return mappings.some(m=>m.id===p['mappingId'] && m.status==="VALIDATED" && m.target_type==="VARIABLE"
      && m.target_ref===o.variable_ref && m.factual_correspondence_ref===v['acquisitionRef']
      && m.capability_id==="OP-01" && m.knowledge_version_id===assessment.knowledge_version_id
      && m.knowledge_pack_id===finding.knowledge_pack_id && m.knowledge_pack_version==="1.0.0"
      && m.fragment_id===p['fragmentId'] && m.interpretation_id===p['interpretationId'] && linksEvidenceMatch(p['evidenceId'],o.id,linkResult.data ?? [])
      && ((m.admission_basis==="HUMAN_VALIDATION" && m.validated_by) || (m.admission_basis==="GOVERNED_RULE" && m.admission_rule_ref)));
  });
  const h04ObservationIds=new Set((findingLinkResult.data ?? []).map(l=>l.observation_id));
  const currentIds=new Set(current.filter(o=>o.variable_ref === "VA07" && h04ObservationIds.has(o.id)).map(o=>o.id));
  const links=linkResult.data ?? [];
  const admittedIds = [...new Set(links.filter(l=>currentIds.has(l.observation_id)).map(l=>l.evidence_id))].filter(id=>(evidenceResult.data ?? []).some(e=>e.id===id));
  const supported = finding.lifecycle_state === "CONFIRMED" && Boolean(finding.reviewed_by && finding.reviewed_at)
    && (findingLinkResult.data ?? []).some(l=>currentIds.has(l.observation_id));
  const now=new Date().toISOString();
  const decision=evaluatePrescription(input,{actor,now,findingSupported:supported,admittedEvidenceIds:admittedIds,...(previous ? {previous} : {})});
  // Privileged INSERT only after user-scoped role/QA/lineage verification.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const {data:existing,error:readError}=await supabaseAdmin.from("prescriptive_decisions").select("*").eq("organization_id",org).eq("request_id",input.requestId).maybeSingle();
  if(readError) throw new Error("PRESCRIPTION_HISTORY_READ_FAILED");
  if(existing) {
    const payload=existing.payload as Record<string,Json|undefined>;
    if(existing.assessment_id!==input.assessmentId || existing.finding_id!==input.findingId || canonicalJson(payload['input'])!==canonicalJson(input)) throw new Error("PRESCRIPTION_REQUEST_REUSE_MISMATCH");
    return {id:existing.id,emissionDecision:"BLOCKED",semanticDecision:payload['semanticDecision'],lifecycleState:payload['lifecycleState']};
  }
  const {data:stored,error}=await supabaseAdmin.from("prescriptive_decisions").insert({organization_id:org,assessment_id:input.assessmentId,finding_id:input.findingId,actor,request_id:input.requestId,prior_decision_ref:priorDecisionRef,payload:JSON.parse(JSON.stringify({...decision,input,sourceRefs:{evaluationRunId:run.id,caseId:finding.case_id,ruleRefs:finding.rule_refs,variableRefs:finding.variable_refs,observationIds:[...currentIds],evidenceIds:admittedIds}})) as Json}).select("id").single();
  if(error?.code === "23505") {
    const {data:retry,error:retryError}=await supabaseAdmin.from("prescriptive_decisions").select("*").eq("organization_id",org).eq("request_id",input.requestId).maybeSingle();
    const payload=retry?.payload as Record<string,Json|undefined> | undefined;
    if(retryError || !retry || retry.assessment_id!==input.assessmentId || retry.finding_id!==input.findingId || canonicalJson(payload?.['input'])!==canonicalJson(input)) throw new Error("PRESCRIPTION_REQUEST_REUSE_MISMATCH");
    return {id:retry.id,emissionDecision:"BLOCKED",semanticDecision:payload?.['semanticDecision'],lifecycleState:payload?.['lifecycleState']};
  }
  if(error || !stored) throw new Error("PRESCRIPTION_HISTORY_WRITE_FAILED");
  // No recommendation title, text or activities returned to end-user UI.
  return {id:stored.id,emissionDecision:decision.emissionDecision,semanticDecision:decision.semanticDecision,lifecycleState:decision.lifecycleState};
}

function linksEvidenceMatch(evidenceId: Json | undefined, observationId:string, links:{evidence_id:string;observation_id:string}[]) {
  return links.some(l=>l.evidence_id===evidenceId && l.observation_id===observationId);
}
function canonicalJson(value:unknown):string {
  if(Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if(value && typeof value==="object") return `{${Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}