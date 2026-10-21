import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { evaluateStoredPrescription } from "./prescriptive.server";
import { prescriptionInputSchema, CONDITION_IDS } from "./prescriptive-contract.server";

function syntheticInput() {
  return prescriptionInputSchema.parse({requestId:"10000000-0000-4000-8000-000000000002",assessmentId:"10000000-0000-4000-8000-000000000003",findingId:"10000000-0000-4000-8000-000000000004",priorDecisionRef:null,trigger:"INITIAL_REVIEW",conditions:Object.fromEntries(CONDITION_IDS.map(id=>[id,{state:"UNKNOWN",evidenceRefs:[],justification:"QA synthetic pending review"}])),processContext:{},causalAssessment:"UNKNOWN",differential:{},contraindications:[]});
}

function dbWith(rows:Record<string,unknown>) {
  return {from:(table:string)=>{
    const chain={select:()=>chain,eq:()=>chain,maybeSingle:async()=>({data:rows[table] ?? null,error:null})};
    return chain;
  }} as unknown as SupabaseClient<Database>;
}
const assessment={id:syntheticInput().assessmentId,organization_id:"QA-ORG",knowledge_version_id:"QA-KV"};
describe("DEC-046 server authorization boundary",()=>{
  it("invisible foreign assessment is rejected before any privileged access",async()=>{
    await expect(evaluateStoredPrescription(dbWith({}),"qa",syntheticInput())).rejects.toThrow("PRESCRIPTION_SCOPE_FORBIDDEN");
  });
  it("MEMBER is rejected before evidence reads or privileged access",async()=>{
    await expect(evaluateStoredPrescription(dbWith({assessments:assessment,memberships:{role:"MEMBER"}}),"qa",syntheticInput())).rejects.toThrow("PRESCRIPTION_ROLE_FORBIDDEN");
  });
  it("OWNER without active synthetic authorization cannot evaluate",async()=>{
    await expect(evaluateStoredPrescription(dbWith({assessments:assessment,memberships:{role:"OWNER"},synthetic_qa_ingestion_authorizations:{active:false}}),"qa",syntheticInput())).rejects.toThrow("PRESCRIPTION_SYNTHETIC_QA_ONLY");
  });
});