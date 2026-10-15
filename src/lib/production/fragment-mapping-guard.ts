/**
 * Document-First · Bloque 1 · Guardia pura de admisión de correspondencias.
 *
 * Una correspondencia fragmento → CE/VA/NI/adquisición es CANDIDATA hasta que
 * una regla gobernada o una validación humana la admite. La semejanza
 * semántica (propuesta de IA) nunca es fundamento de admisión.
 * No modifica packs, Master ni Engine: solo lee el catálogo de la capacidad.
 */
import type { AdmissionBasis, MappingTargetType } from "@pymapa/contracts";

export interface CatalogoCapacidad {
  capabilityId: string;
  acquisitions: ReadonlyArray<{ id: string; acquisitionMode?: string; variableRefs: readonly string[] }>;
  variableIds: readonly string[];
  informationNeedIds: readonly string[];
  evidenceCriterionIds: readonly string[];
}

export interface PropuestaAdmision {
  capabilityId: string;
  targetType: MappingTargetType;
  targetRef: string;
  admissionBasis: AdmissionBasis | null;
  admissionRuleRef: string | null;
  validatedBy: string | null;
  factualCorrespondenceRef: string | null;
}

export type ResultadoAdmision = { admisible: true } | { admisible: false; motivo: string };

const BASES_GOBERNADAS: readonly string[] = ["GOVERNED_RULE", "HUMAN_VALIDATION"];

function esProgresivaMultimapeada(a: { acquisitionMode?: string; variableRefs: readonly string[] }): boolean {
  return a.acquisitionMode === "CAPABILITY_PROGRESSIVE" && a.variableRefs.length > 1;
}

export function puedeAdmitirse(p: PropuestaAdmision, cat: CatalogoCapacidad): ResultadoAdmision {
  if (p.capabilityId !== cat.capabilityId) return { admisible: false, motivo: "CAPABILITY_MISMATCH" };
  if (!p.admissionBasis || !BASES_GOBERNADAS.includes(p.admissionBasis)) {
    return { admisible: false, motivo: "ADMISSION_BASIS_NOT_GOVERNED" };
  }
  if (p.admissionBasis === "GOVERNED_RULE" && !p.admissionRuleRef) {
    return { admisible: false, motivo: "GOVERNED_RULE_REF_REQUIRED" };
  }
  if (p.admissionBasis === "HUMAN_VALIDATION" && !p.validatedBy) {
    return { admisible: false, motivo: "VALIDATOR_REQUIRED" };
  }
  const existe =
    p.targetType === "ACQUISITION"
      ? cat.acquisitions.some((a) => a.id === p.targetRef)
      : p.targetType === "VARIABLE"
        ? cat.variableIds.includes(p.targetRef)
        : p.targetType === "INFORMATION_NEED"
          ? cat.informationNeedIds.includes(p.targetRef)
          : cat.evidenceCriterionIds.includes(p.targetRef);
  if (!existe) return { admisible: false, motivo: "TARGET_NOT_IN_PACK" };
  if (p.targetType === "VARIABLE" && !p.factualCorrespondenceRef) {
    const genérica = cat.acquisitions.some((a) => esProgresivaMultimapeada(a) && a.variableRefs.includes(p.targetRef));
    if (genérica) return { admisible: false, motivo: "PROGRESSIVE_VARIABLE_WITHOUT_FACTUAL_CORRESPONDENCE" };
  }
  return { admisible: true };
}

/**
 * Adquisiciones cubiertas por información ADMITIDA. Solo correspondencias
 * VALIDATED de tipo ACQUISITION; las candidatas nunca cuentan. No es prueba de
 * suficiencia de NI ni de cierre de capacidad.
 */
export function adquisicionesCubiertasPorAdmision(
  mappings: ReadonlyArray<{ status: string; targetType: string; targetRef: string; capabilityId: string }>,
  capabilityId: string,
): Set<string> {
  return new Set(
    mappings
      .filter((m) => m.capabilityId === capabilityId && m.status === "VALIDATED" && m.targetType === "ACQUISITION")
      .map((m) => m.targetRef),
  );
}
