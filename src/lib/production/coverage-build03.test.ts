import { afterEach, describe, expect, it, vi } from "vitest";
import { createKnowledgeEngine } from "@pymapa/knowledge-engine";
import * as criteriaModule from "./coverage-criteria";
import { buildCoverageInventory, validateCanonicalCriteria } from "./coverage-canonical.server";
import { getRegisteredPack } from "./packs-registry";
import { createInMemoryProductionRepository, type DocumentMappingRecord } from "./puertos";
import { evaluarCapacidad } from "./caso-uso";
import { createActionableProjector } from "./actionable";
import { validateStructuredCoverage, type StructuredCoverageDeclaration } from "./structured-coverage";
import { assertDocumentGovernanceRole } from "./capability-handlers";
const KV = criteriaModule.COVERAGE_KNOWLEDGE_VERSION_ID;
afterEach(() => vi.restoreAllMocks());

describe("BUILD03 canonical validation and lifecycle", () => {
  it("31 packs retain 11/3/12/5 archetypes and OP02 retains 47 unlinked needs", () => {
    const i = buildCoverageInventory();
    expect(i).toHaveLength(31);
    expect(["ONE_TO_ONE", "STRUCTURAL", "PROGRESSIVE", "OPERATIONAL_MIXED"].map(a => i.filter(p => p.archetype === a).length)).toEqual([11,3,12,5]);
    expect(i.reduce((n,p)=>n+p.acquisitions.length,0)).toBe(448);
    expect(i.find(p=>p.capabilityId==="OP-02")?.needsWithoutExplicitAcquisition).toHaveLength(47);
  });
  it("rejects invented acquisition, wrong version, duplicate identity and absent components", () => {
    const e = criteriaModule.COVERAGE_CRITERIA_REGISTRY[0]; if (!e) throw Error("fixture");
    expect(()=>validateCanonicalCriteria([{...e,acquisitionRef:"INVENTED"}])).toThrow("CANONICAL_ACQUISITION_NOT_FOUND");
    expect(()=>validateCanonicalCriteria([{...e,knowledgeVersionId:"other"}])).toThrow("CRITERIA_KNOWLEDGE_VERSION_INVALID");
    expect(()=>validateCanonicalCriteria([e,e])).toThrow("CRITERIA_IDENTITY_DUPLICATE");
    expect(()=>validateCanonicalCriteria([{...e,components:[]}])).toThrow("CRITERIA_COMPONENTS_INVALID");
  });
  it("DG01 is approved, CM05/OP05 require exact QA eligibility, PROPOSED never enables FULL", () => {
    expect(criteriaModule.coverageModeFor(KV,"DG-01","ACQ·NI04")).toBe("FULL_ELIGIBLE");
    for (const [cap,acq] of [["CM-05","ACQ·P1·01"],["OP-05","ACQ·VA01#NI@L254"]] as const) {
      expect(criteriaModule.coverageModeFor(KV,cap,acq)).toBe("PARTIAL_ONLY");
      expect(criteriaModule.coverageModeFor(KV,cap,acq,true)).toBe("FULL_ELIGIBLE");
    }
    const e=criteriaModule.COVERAGE_CRITERIA_REGISTRY[0]; if (!e) throw Error("fixture");
    expect(criteriaModule.criteriaEligible({...e,approvalStatus:"PROPOSED"},true)).toBe(false);
  });
  it("only OWNER/ADMIN govern organization decisions",()=>{
    expect(()=>assertDocumentGovernanceRole("OWNER")).not.toThrow();
    expect(()=>assertDocumentGovernanceRole("ADMIN")).not.toThrow();
    expect(()=>assertDocumentGovernanceRole("MEMBER")).toThrow("DOCUMENT_GOVERNANCE_FORBIDDEN");
  });
});

// Eligible criteria below exist ONLY inside the mock: no real criterion is promoted.
describe.each(["DG-02","DT-02","CM-05","OP-03"])("BUILD03 isolated four-archetype harness %s", capabilityId => {
  function setup() {
    const pack = getRegisteredPack(capabilityId).pack as Parameters<typeof createKnowledgeEngine>[0];
    const engine = createKnowledgeEngine(pack);
    const acq = engine.listAcquisitions()[0]; if (!acq) throw Error("fixture acquisition");
    const entry: criteriaModule.CoverageCriteriaEntry = {knowledgeVersionId:KV,capabilityId,acquisitionRef:acq.id,
      coverageCriteriaVersion:"SYNTHETIC-HARNESS-1.0.0",approvalReference:"TEST_ONLY",approvalStatus:"APPROVED",mappingTargetType:"ACQUISITION",
      components:[{componentKey:"TEST_LITERAL",componentDescription:"Synthetic literal component",required:true}]};
    vi.spyOn(criteriaModule,"approvedCoverageCriteria").mockImplementation((k,c,a)=>k===KV&&c===capabilityId&&a===acq.id?entry:null);
    const declaration: StructuredCoverageDeclaration = {mappingId:"b0300000-0000-4000-8000-000000000001",
      acquisitionRef:acq.id,knowledgeVersionId:KV,coverageCriteriaVersion:entry.coverageCriteriaVersion,targetScope:"FULL",componentEvaluations:[{
      componentKey:"TEST_LITERAL",componentDescription:"Synthetic literal component",fragmentId:"b0300000-0000-4000-8000-000000000002",
      supportState:"SUPPORTED",supportingQuote:"Synthetic complete evidence.",componentJustification:"Synthetic human justification.",uncertaintyNotes:"",humanConfirmedRelevance:true}],
      synthesisJustification:"Synthetic complete declaration.",humanConfirmedCompleteness:true,expectedRevision:0,requestId:"b0300000-0000-4000-8000-000000000003"};
    const repo=createInMemoryProductionRepository([{id:"qa-assess",organizationId:"qa-org",caseId:"qa-case",knowledgeVersionId:KV,type:"BASELINE",startedAt:null,closedAt:null,updatedAt:"2026-10-20"}],[]);
    const mapping:DocumentMappingRecord={id:declaration.mappingId,organizationId:"qa-org",assessmentId:"qa-assess",capabilityId,targetType:"ACQUISITION",targetRef:acq.id,
      fragmentId:declaration.componentEvaluations[0]?.fragmentId??"",interpretationId:null,knowledgeVersionId:KV,knowledgePackId:getRegisteredPack(capabilityId).packId,knowledgePackVersion:"1.0.0",
      proposedBy:"HUMAN",status:"VALIDATED",admissionBasis:"HUMAN_VALIDATION",admissionRuleRef:null,factualCorrespondenceRef:null,validatedBy:"qa-owner",validatedAt:"2026-10-20",supersedesMappingId:null,createdAt:"2026-10-20",
      extractionId:"qa-extract",evidenceId:"qa-evidence",fragmentText:"Synthetic complete evidence.",interpretationStatement:null,coverageScope:"FULL",coverageAcquisitionRef:acq.id,coverageDecidedBy:"qa-owner",coverageRevision:1,coverageEvidenceCurrent:true,
      coverageEvaluation:{declaration,result:{coverageScope:"FULL",revision:1},decidedBy:"qa-owner",evidenceId:"qa-evidence",extractionId:"qa-extract"}};
    const state=repo.estado as unknown as {documentMappings:DocumentMappingRecord[];observations:unknown[]};
    async function evaluate(){const r=await evaluarCapacidad({engine,repository:repo,knowledgeVersionId:KV},"qa-assess");if(!r)throw Error("assessment");return {r,w:createActionableProjector(pack).derive({engine,...r})};}
    const context={capabilityId,knowledgeVersionId:KV,acquisitionRef:acq.id,fragmentId:mapping.fragmentId,fragmentText:mapping.fragmentText,evidenceCurrent:true,hasConflict:false};
    return {entry,declaration,mapping,state,evaluate,acq,context};
  }
  it("initial pending → atomic FULL → revocation restores without observations or variable change",async()=>{
    const s=setup(),before=await s.evaluate();expect(before.r.answeredAcquisitionIds).not.toContain(s.acq.id);
    s.state.documentMappings.push(s.mapping);const full=await s.evaluate();expect(full.r.answeredAcquisitionIds).toEqual([s.acq.id]);
    expect(full.r.evaluation.variableEvaluations).toEqual(before.r.evaluation.variableEvaluations);expect(s.state.observations).toHaveLength(0);
    s.state.documentMappings[0]={...s.mapping,status:"SUPERSEDED"};const revoked=await s.evaluate();expect(revoked.r.answeredAcquisitionIds).not.toContain(s.acq.id);expect(s.state.documentMappings).toHaveLength(1);
  });
  it("incomplete evidence stays PARTIAL",()=>{const s=setup();s.declaration.componentEvaluations=[];expect(validateStructuredCoverage(s.declaration,s.context).coverageScope).toBe("PARTIAL");});
  it("invented literal quote rejected",()=>{const s=setup();const c=s.declaration.componentEvaluations[0];if(!c)throw Error("fixture");c.supportingQuote="absent";expect(()=>validateStructuredCoverage(s.declaration,s.context)).toThrow("INVALID_COMPONENT_QUOTE");});
  it("PROPOSED and unauthorized pilot never grant FULL",()=>{const s=setup();s.entry.approvalStatus="PROPOSED";expect(validateStructuredCoverage(s.declaration,s.context).coverageScope).toBe("PARTIAL");s.entry.approvalStatus="PILOT_TEST_GOVERNED";expect(validateStructuredCoverage(s.declaration,s.context).coverageScope).toBe("PARTIAL");expect(validateStructuredCoverage(s.declaration,{...s.context,pilotAuthorized:true}).coverageScope).toBe("FULL");});
  it("wrong tenant, capability or version cannot subtract",async()=>{const s=setup();for(const patch of [{organizationId:"other"},{capabilityId:"other"},{knowledgeVersionId:"other"}]){s.state.documentMappings.splice(0,1,{...s.mapping,...patch});expect((await s.evaluate()).r.answeredAcquisitionIds).not.toContain(s.acq.id);}});
  it("stale evidence and conflicts cannot grant FULL",()=>{const s=setup();expect(validateStructuredCoverage(s.declaration,{...s.context,evidenceCurrent:false}).coverageScope).toBe("PARTIAL");expect(validateStructuredCoverage(s.declaration,{...s.context,hasConflict:true}).coverageScope).toBe("PARTIAL");});
});