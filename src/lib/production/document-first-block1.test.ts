import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { adquisicionesCubiertasPorAdmision, puedeAdmitirse, type CatalogoCapacidad } from "./fragment-mapping-guard";

const sql = readFileSync(join(process.cwd(), "drizzle", "migrations", "0002_document_first_block1.sql"), "utf8").toLowerCase();
const TABLAS = ["evidence_versions", "document_extractions", "evidence_fragments", "fragment_interpretations", "fragment_mappings"];

describe("Document-First · Bloque 1 · esquema", () => {
  it("cada tabla: uuid, organización, grants sin anon, RLS y lectura por membresía", () => {
    for (const t of TABLAS) {
      const cuerpo = sql.slice(sql.indexOf(`create table public.${t}`)).split(");")[0];
      expect(cuerpo).toContain("id uuid primary key default gen_random_uuid()");
      expect(cuerpo).toContain("organization_id uuid not null references public.organizations");
      expect(sql).toContain(`grant all on public.${t} to service_role`);
      expect(sql).toContain(`alter table public.${t} enable row level security`);
      expect(sql).toContain(`"${t}_select_members" on public.${t}`);
      expect(sql).toContain(`${t}_no_delete before delete on public.${t}`);
    }
    expect(sql).not.toMatch(/grant[^;]*to anon/);
    expect(sql).not.toContain("using (true)");
    expect(sql).not.toMatch(/grant (insert|update|delete)[^;]*to authenticated/);
  });

  it("FKs compuestas impiden cruces entre organizaciones", () => {
    for (const ref of ["public.evidence (organization_id, id)", "public.evidence_versions (organization_id, id)",
      "public.document_extractions (organization_id, id)", "public.evidence_fragments (organization_id, id)",
      "public.fragment_interpretations (organization_id, id)", "public.assessments (organization_id, id)"]) {
      expect(sql).toContain(`references ${ref}`);
    }
  });

  it("mapeo gobernado: nace candidato, sin base de similitud, transiciones auditadas", () => {
    expect(sql).toContain("mapping_validated_requires_basis");
    expect(sql).toContain("mapping_admission_basis as enum ('governed_rule','human_validation')");
    expect(sql).not.toMatch(/similarity/);
    expect(sql).toContain("fragment_mapping_must_start_as_candidate");
    expect(sql).toContain("fragment_mapping_invalid_transition");
    expect(sql).toContain("has_organization_role(_org, array['owner','admin']");
  });

  it("trazabilidad de modelo y pack; fragmentos inmutables; no toca knowledge_versions", () => {
    expect(sql).toContain("model_id text not null");
    expect(sql).toContain("prompt_ref text not null");
    expect(sql).toContain("knowledge_pack_version text not null");
    expect(sql).toContain("evidence_fragments_immutable before update");
    expect(sql).not.toMatch(/(insert into|update) public\.knowledge_versions/);
  });
});

const CM05: CatalogoCapacidad = {
  capabilityId: "CM-05",
  acquisitions: [
    { id: "ACQ·P1·01", acquisitionMode: "CAPABILITY_PROGRESSIVE", variableRefs: ["VA01", "VA02", "VA03"] },
    { id: "ACQ·P1·02", acquisitionMode: "CAPABILITY_PROGRESSIVE", variableRefs: ["VA01", "VA02", "VA03"] },
    { id: "ACQ·V·01", variableRefs: ["VA09"] },
  ],
  variableIds: ["VA01", "VA02", "VA03", "VA09"],
  informationNeedIds: ["NI01"],
  evidenceCriterionIds: ["CE01"],
};
const base = { capabilityId: "CM-05", admissionRuleRef: null, validatedBy: null, factualCorrespondenceRef: null };

describe("Document-First · Bloque 1 · guardia de admisión", () => {
  it("una candidata de IA sin fundamento gobernado no es admisible", () => {
    expect(puedeAdmitirse({ ...base, targetType: "ACQUISITION", targetRef: "ACQ·P1·01", admissionBasis: null }, CM05).admisible).toBe(false);
    expect(puedeAdmitirse({ ...base, targetType: "ACQUISITION", targetRef: "ACQ·P1·01", admissionBasis: "GOVERNED_RULE" }, CM05).admisible).toBe(false);
  });

  it("CM-05: VA01 genérica desde progresivas es inadmisible; como adquisiciones quedan independientes", () => {
    const r = puedeAdmitirse({ ...base, targetType: "VARIABLE", targetRef: "VA01", admissionBasis: "HUMAN_VALIDATION", validatedBy: "u" }, CM05);
    expect(r).toEqual({ admisible: false, motivo: "PROGRESSIVE_VARIABLE_WITHOUT_FACTUAL_CORRESPONDENCE" });
    for (const ref of ["ACQ·P1·01", "ACQ·P1·02"]) {
      expect(puedeAdmitirse({ ...base, targetType: "ACQUISITION", targetRef: ref, admissionBasis: "HUMAN_VALIDATION", validatedBy: "u" }, CM05).admisible).toBe(true);
    }
    expect(puedeAdmitirse({ ...base, targetType: "VARIABLE", targetRef: "VA09", admissionBasis: "GOVERNED_RULE", admissionRuleRef: "R1" }, CM05).admisible).toBe(true);
  });

  it("destino inexistente en el pack se rechaza", () => {
    expect(puedeAdmitirse({ ...base, targetType: "INFORMATION_NEED", targetRef: "NI99", admissionBasis: "GOVERNED_RULE", admissionRuleRef: "R1" }, CM05).admisible).toBe(false);
  });

  it("E2: VALIDATED de adquisición no demuestra cobertura completa", () => {
    const set = adquisicionesCubiertasPorAdmision([
      { status: "CANDIDATE", targetType: "ACQUISITION", targetRef: "ACQ·P1·01", capabilityId: "CM-05" },
      { status: "VALIDATED", targetType: "ACQUISITION", targetRef: "ACQ·P1·02", capabilityId: "CM-05" },
      { status: "VALIDATED", targetType: "INFORMATION_NEED", targetRef: "NI01", capabilityId: "CM-05" },
      { status: "REJECTED", targetType: "ACQUISITION", targetRef: "ACQ·V·01", capabilityId: "CM-05" },
    ], "CM-05");
    expect([...set]).toEqual([]);
  });
});
