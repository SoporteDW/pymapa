/**
 * Frontera de automatización.
 *
 * Toda operación del pipeline queda clasificada. Las decisiones semánticas no
 * explícitas NUNCA se automatizan.
 */
export const AUTOMATION_CLASSES = [
  "AUTOMATABLE",
  "AUTOMATABLE_WITH_VALIDATION",
  "HUMAN_GOVERNANCE_REQUIRED",
] as const;
export type AutomationClass = (typeof AUTOMATION_CLASSES)[number];

export interface PipelineOperation {
  id: string;
  stage: string;
  classification: AutomationClass;
  rationale: string;
}

export const PIPELINE_OPERATIONS: readonly PipelineOperation[] = [
  {
    id: "SOURCE_INGESTION",
    stage: "Governed Knowledge Source",
    classification: "HUMAN_GOVERNANCE_REQUIRED",
    rationale: "solo gobierno editorial puede declarar que una fuente está BASELINE-APPROVED",
  },
  {
    id: "SOURCE_STRUCTURE_VALIDATION",
    stage: "Capability Source Extraction",
    classification: "AUTOMATABLE",
    rationale: "la forma de la fuente es verificable mecánicamente",
  },
  {
    id: "PACK_CANDIDATE_GENERATION",
    stage: "Pack Candidate",
    classification: "AUTOMATABLE",
    rationale: "transformación determinística y verbatim, sin decisiones semánticas",
  },
  {
    id: "SCHEMA_VALIDATION",
    stage: "Schema Validation",
    classification: "AUTOMATABLE",
    rationale: "contrato estructural ejecutable",
  },
  {
    id: "REFERENTIAL_VALIDATION",
    stage: "Semantic/Referential Validation",
    classification: "AUTOMATABLE",
    rationale: "integridad de IDs y relaciones internas",
  },
  {
    id: "GOVERNANCE_VALIDATION",
    stage: "Governance Validation",
    classification: "AUTOMATABLE_WITH_VALIDATION",
    rationale: "detecta inferencia y pérdida de procedencia; la decisión final es humana",
  },
  {
    id: "RUNTIME_COMPATIBILITY",
    stage: "Runtime compatibility",
    classification: "AUTOMATABLE",
    rationale: "el conjunto de primitivas soportadas es explícito",
  },
  {
    id: "FIXTURE_AUTHORING",
    stage: "Fixtures",
    classification: "HUMAN_GOVERNANCE_REQUIRED",
    rationale: "un resultado esperado semántico no puede inventarse desde el pipeline",
  },
  {
    id: "FIXTURE_STRUCTURE_VALIDATION",
    stage: "Fixtures",
    classification: "AUTOMATABLE",
    rationale: "el contrato del fixture es verificable",
  },
  {
    id: "KNOWLEDGE_TESTS",
    stage: "Knowledge Tests",
    classification: "AUTOMATABLE",
    rationale: "harness paramétrico sobre cualquier pack",
  },
  {
    id: "RUNTIME_ACCEPTANCE",
    stage: "Runtime Acceptance Tests",
    classification: "AUTOMATABLE",
    rationale: "comparación fixture ↔ runtime sin branching por capacidad",
  },
  {
    id: "SOURCE_TO_PACK_DIFF",
    stage: "Review",
    classification: "AUTOMATABLE_WITH_VALIDATION",
    rationale: "el diff se calcula solo; su interpretación semántica es humana",
  },
  {
    id: "GOVERNANCE_REVIEW",
    stage: "Human/Governance Review",
    classification: "HUMAN_GOVERNANCE_REQUIRED",
    rationale: "aprobar conocimiento es una decisión de gobierno, nunca del pipeline",
  },
  {
    id: "PUBLICATION",
    stage: "PUBLISHED",
    classification: "HUMAN_GOVERNANCE_REQUIRED",
    rationale: "publicar fija conocimiento inmutable y exige aprobación explícita",
  },
  {
    id: "GAP_RESOLUTION",
    stage: "Knowledge gaps",
    classification: "HUMAN_GOVERNANCE_REQUIRED",
    rationale: "un KCC solo se resuelve con contenido aprobado del Knowledge Master",
  },
];
