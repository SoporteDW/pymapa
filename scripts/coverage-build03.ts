/** Reproducible auxiliary artifacts only. Never writes published knowledge. */
import { mkdirSync, writeFileSync } from "node:fs";
import { buildCoverageInventory } from "../src/lib/production/coverage-canonical.server";
import { COVERAGE_KNOWLEDGE_VERSION_ID as KV } from "../src/lib/production/coverage-criteria";

const root = "docs/coverage/build03";
mkdirSync(root, { recursive: true });
mkdirSync("/tmp/cov03-build03", { recursive: true });
const inventory = buildCoverageInventory();
const proposedCapabilities = new Set(["DG-02", "DG-03", "DG-04", "DG-05", "PC-01", "PC-02", "PC-03", "PC-04", "PC-05", "DT-01"]);
const proposals = inventory.flatMap((p) => p.acquisitions.filter((a) => proposedCapabilities.has(p.capabilityId)
  || (p.capabilityId === "OP-03" && a.id === "P1-OP03-02")).map((a) => {
  const special = p.capabilityId === "OP-03";
  return { knowledgeVersionId: KV, capabilityId: p.capabilityId, acquisitionRef: a.id,
    coverageCriteriaVersion: `${p.capabilityId}:${a.id}:PROPOSAL-1.0.0`, approvalStatus: "PROPOSED",
    approvalReference: "INT-01-COV-03-BUILD-03-LOTE01-PROPOSAL", mappingTargetType: "ACQUISITION",
    sourceText: a.sourceText, sourceInformationNeedRef: a.informationNeedRef ?? null, sourceVariableRefs: a.variableRefs,
    packReference: `knowledge/packs/${p.packId}/${p.packVersion}/pack.json`, packChecksum: p.packChecksum,
    components: special ? [
      { componentKey: "RECENT_REAL_CASE", componentDescription: "Caso reciente real identificado", required: true },
      { componentKey: "START_TO_FINISH_ROUTE", componentDescription: "Recorrido desde que comenzó hasta que terminó", required: true },
      { componentKey: "PEOPLE_AREAS_PROCESSES_SYSTEMS", componentDescription: "Personas, áreas, procesos o sistemas por los que pasó el caso", required: true },
    ] : [{ componentKey: `${a.informationNeedRef ?? a.id}:LITERAL_REQUIREMENT`, componentDescription: a.sourceText, required: true }],
    evidenceTypes: special ? ["Registro fechado de un caso y su recorrido literal completo"] : ["Registro contextual fechado con respaldo explícito de la necesidad literal y su alcance"],
    insufficiencyConditions: ["Solo mencionar el tema no respalda la necesidad", "Citas sin contexto o sin vigencia", "Alcance omitido o incertidumbres sin resolver", "Juicio de suficiencia sin criterio institucional"],
    reviewStatus: "NEEDS_GOVERNANCE_REVIEW", humanReviewPending: true,
    justification: special ? "Descomposición propuesta de la pregunta literal, no de sus seis variables relacionadas; nunca asigna valores." : "Componente mínimo literal propuesto; no constituye criterio semántico completo ni aprobación. Gobierno debe definir alcance, exhaustividad y umbrales interpretativos.",
  };
}));
writeFileSync(`${root}/canonical-inventory.v1.0.0.json`, JSON.stringify({ artifactVersion: "1.0.0", knowledgeVersionId: KV, capabilities: inventory }, null, 2)+"\n");
writeFileSync(`${root}/criteria-lote01.proposed.v1.0.0.json`, JSON.stringify({ artifactVersion: "1.0.0", status: "PROPOSED", proposals }, null, 2)+"\n");
const q = (v: unknown) => `'${String(v).replaceAll("'", "''")}'`;
const rows = inventory.flatMap((p) => p.acquisitions.map((a) => `(${[KV,p.capabilityId,a.id,p.packId,p.packVersion,p.packChecksum,JSON.stringify(a.variableRefs),a.sourceText].map(q).join(",")})`));
const proposalRows = proposals.map((p) => `(${[KV,p.capabilityId,p.acquisitionRef,p.coverageCriteriaVersion,p.approvalStatus,p.approvalReference,p.mappingTargetType,JSON.stringify(p.components),JSON.stringify(p)].map(q).join(",")})`);
writeFileSync("/tmp/cov03-build03/canonical-seed.sql", `INSERT INTO public.coverage_canonical_acquisitions(knowledge_version_id,capability_id,acquisition_ref,pack_id,pack_version,pack_checksum,variable_refs,source_text) VALUES ${rows.join(",\n")} ON CONFLICT DO NOTHING;\nINSERT INTO public.coverage_criteria_catalog(knowledge_version_id,capability_id,acquisition_ref,criteria_version,approval_status,approval_reference,mapping_target_type,components,proposal_detail) VALUES ${proposalRows.join(",\n")} ON CONFLICT DO NOTHING;`);
console.log(JSON.stringify({capabilities:inventory.length,acquisitions:rows.length,proposals:proposals.length,op02Unlinked:inventory.find(p=>p.capabilityId==="OP-02")?.needsWithoutExplicitAcquisition.length}));