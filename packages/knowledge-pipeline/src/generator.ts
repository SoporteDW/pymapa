/**
 * Generador determinístico Source → Pack Candidate.
 *
 * QUÉ HACE:
 * - Copia verbatim las secciones gobernadas de la fuente.
 * - Preserva IDs, wording, estados, requisitos de evidencia, clasificación de
 *   reglas, gaps explícitos y procedencia.
 * - Registra MasterVersion, source references y checksum.
 *
 * QUÉ NO HACE (invariantes):
 * - No completa campos semánticos faltantes.
 * - No genera thresholds, mappings, option sets ni cross-capability links.
 * - No convierte GOVERNED_JUDGMENT en DETERMINISTIC.
 * - No resuelve KCC.
 */
import { computeChecksum } from "./checksum.ts";
import type { CapabilitySource, KnowledgeGap } from "./master.ts";

export const GENERATOR_VERSION = "pymapa-knowledge-pipeline/0.1.0";

/**
 * Secciones de pack admitidas. El generador NUNCA crea una clave que la fuente
 * no traiga, y rechaza cualquier clave fuera de esta lista (contenido añadido).
 */
export const PACK_SECTION_KEYS = [
  "governanceNote",
  "capability",
  "conditionsOfExistence",
  "conditionsNote",
  "variables",
  "criticalityNote",
  "informationNeeds",
  "acquisitionLevels",
  "acquisitions",
  "acquisitionsNote",
  "acquisitionStages",
  "governedStructuralMapping",
  "evidence",
  "sufficiency",
  "confidence",
  "rules",
  "contradictionHandling",
  "findings",
  "findingsNote",
  "recommendations",
  "recommendationsNote",
  "activities",
  "activitiesNote",
  "interventionPrinciple",
  "validationRequirements",
  "validationRequirementsNote",
  "crossCapabilityReferences",
  "knowledgeChangeCandidates",
  /* M2 runtime closure · ciclo de vida genérico (opcionales) */
  "interventionPatterns",
  "implementationModel",
  "effectivenessModel",
  "attributionModel",
  "validationModel",
  "followUp",
  "reassessment",
  "severity",
  "contextualization",
  "engineActions",
] as const;

/** Claves del pack que el generador fija por sí mismo (identidad, no semántica). */
export const PACK_IDENTITY_KEYS = [
  "$schema",
  "packId",
  "packVersion",
  "status",
  "knowledgeMaster",
] as const;

export interface CandidateTransformation {
  kind: "COPIED_VERBATIM" | "IDENTITY_ASSIGNED";
  path: string;
  note: string;
}

export interface PackCandidate {
  capabilityId: string;
  packId: string;
  packVersion: string;
  /** Pack candidato: estructura ejecutable, estado inicial DRAFT. */
  pack: Record<string, unknown>;
  provenance: {
    masterIdentity: string;
    masterVersion: string;
    baselineStatus: string;
    sourceReference: string;
    sourceChecksum: string;
    derivation: CapabilitySource["provenance"]["derivation"];
    generator: string;
    generatedFromSections: string[];
  };
  transformations: CandidateTransformation[];
  gaps: KnowledgeGap[];
  checksum: string;
}

export interface GeneratorIssue {
  code:
    | "UNSUPPORTED_SECTION"
    | "CAPABILITY_IDENTITY_MISMATCH"
    | "MISSING_REQUIRED_SECTION"
    | "SOURCE_CHECKSUM_MISMATCH";
  path: string;
  message: string;
}

export type GeneratorResult =
  { ok: true; candidate: PackCandidate } | { ok: false; issues: GeneratorIssue[] };

const REQUIRED_SECTIONS = ["capability", "variables", "informationNeeds", "acquisitions"] as const;

function clonar<T>(valor: T): T {
  return JSON.parse(JSON.stringify(valor)) as T;
}

/**
 * Transformación gap-preserving: el candidato conserva exactamente lo que la
 * fuente declara, incluidas las marcas NOT_EXPLICIT_IN_KNOWLEDGE_MASTER.
 */
export function generatePackCandidate(source: CapabilitySource): GeneratorResult {
  const issues: GeneratorIssue[] = [];
  const secciones = source.sections;
  const soportadas = new Set<string>(PACK_SECTION_KEYS);

  for (const clave of Object.keys(secciones)) {
    if (!soportadas.has(clave)) {
      issues.push({
        code: "UNSUPPORTED_SECTION",
        path: `sections.${clave}`,
        message: `sección no soportada por el contrato de pack: ${clave}. El generador no inventa estructura.`,
      });
    }
  }
  for (const requerida of REQUIRED_SECTIONS) {
    if (!(requerida in secciones)) {
      issues.push({
        code: "MISSING_REQUIRED_SECTION",
        path: `sections.${requerida}`,
        message: `la fuente no declara la sección obligatoria ${requerida}; no se completa por inferencia.`,
      });
    }
  }

  const capacidadSeccion = secciones["capability"] as { id?: string } | undefined;
  if (capacidadSeccion && capacidadSeccion.id !== source.capability.id) {
    issues.push({
      code: "CAPABILITY_IDENTITY_MISMATCH",
      path: "sections.capability.id",
      message: "la identidad de la capacidad en las secciones no coincide con la fuente",
    });
  }

  if (issues.length > 0) return { ok: false, issues };

  const pack: Record<string, unknown> = {
    packId: source.targetPack.packId,
    packVersion: source.targetPack.packVersion,
    status: "draft",
    knowledgeMaster: {
      identifier: source.master.identity,
      version: source.master.version,
      status: source.master.baselineStatus,
      sourceReference: source.provenance.sourceReference,
    },
  };

  const transformations: CandidateTransformation[] = PACK_IDENTITY_KEYS.filter(
    (k) => k !== "$schema",
  ).map((clave) => ({
    kind: "IDENTITY_ASSIGNED" as const,
    path: clave,
    note: "identidad de pack asignada por el generador; no es contenido semántico",
  }));

  const generatedFromSections: string[] = [];
  for (const clave of PACK_SECTION_KEYS) {
    if (!(clave in secciones)) continue;
    pack[clave] = clonar(secciones[clave]);
    generatedFromSections.push(clave);
    transformations.push({
      kind: "COPIED_VERBATIM",
      path: clave,
      note: "copiado literal de la fuente gobernada",
    });
  }

  const candidate: PackCandidate = {
    capabilityId: source.capability.id,
    packId: source.targetPack.packId,
    packVersion: source.targetPack.packVersion,
    pack,
    provenance: {
      masterIdentity: source.master.identity,
      masterVersion: source.master.version,
      baselineStatus: source.master.baselineStatus,
      sourceReference: source.provenance.sourceReference,
      sourceChecksum: source.checksum,
      derivation: source.provenance.derivation,
      generator: GENERATOR_VERSION,
      generatedFromSections,
    },
    transformations,
    gaps: clonar(source.gaps),
    checksum: computeChecksum(pack),
  };

  return { ok: true, candidate };
}

/** Comparación contra el Golden Pack publicado (OP-01). Ignora solo identidad no semántica. */
export function compareWithGoldenPack(
  candidatePack: Record<string, unknown>,
  goldenPack: Record<string, unknown>,
): { equivalent: boolean; differences: { path: string; candidate: unknown; golden: unknown }[] } {
  const ignorar = new Set(["$schema", "status"]);
  const differences: { path: string; candidate: unknown; golden: unknown }[] = [];
  const claves = new Set([...Object.keys(candidatePack), ...Object.keys(goldenPack)]);
  for (const clave of claves) {
    if (ignorar.has(clave)) continue;
    const a = computeChecksum(candidatePack[clave] ?? null);
    const b = computeChecksum(goldenPack[clave] ?? null);
    if (a !== b) {
      differences.push({ path: clave, candidate: candidatePack[clave], golden: goldenPack[clave] });
    }
  }
  return { equivalent: differences.length === 0, differences };
}
