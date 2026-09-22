import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * M1-C · Productive Data Foundation
 * Valida que las definiciones de base de datos estén versionadas en Git y que
 * cumplan los invariantes estructurales de la fundación productiva.
 * No valida lógica diagnóstica: estas tablas no están conectadas al MVP.
 */

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

function leerMigraciones(): string {
  const archivos = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  return archivos.map((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf8")).join("\n").toLowerCase();
}

const sql = leerMigraciones();

const TABLAS = [
  "organizations",
  "memberships",
  "cases",
  "assessments",
  "responses",
  "observations",
  "knowledge_versions",
  "evaluation_runs",
  "variable_evaluations",
  "information_need_states",
  // M1-EFG · diagnóstico colaborativo y Evidence Store
  "respondents",
  "assignments",
  "invitations",
  "evidence",
  "observation_evidence",
  // M1-HIJ · findings, recomendaciones y preparación de ejecución
  "findings",
  "finding_observations",
  "finding_evidence",
  "derived_dependency_references",
  "recommendation_candidates",
  "interventions",
  "activities",
  "deliverables",
  "audit_events",
  // M1-KL · CRV, Validation, Follow-up y Reassessment
  "validation_requirements",
  "validation_requirement_cases",
  "validations",
  "validation_evidence",
  "follow_ups",
  "learning_candidates",
  "assessment_snapshots",
  // M2 · pre-publication integrity: findings pendientes de resolución por run
  "finding_resolution_states",
] as const;

const TABLAS_TENANT_OWNED = TABLAS.filter((t) => t !== "organizations" && t !== "knowledge_versions");

describe("fundación de datos productiva · migraciones versionadas", () => {
  it("existe al menos una migración versionada en Git", () => {
    expect(readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).length).toBeGreaterThan(0);
  });

  it("crea todas las entidades del modelo productivo", () => {
    for (const tabla of TABLAS) {
      expect(sql).toContain(`create table public.${tabla}`);
    }
  });

  it("usa uuid como identificador en todas las entidades", () => {
    const ocurrencias = sql.match(/id uuid primary key default gen_random_uuid\(\)/g) ?? [];
    expect(ocurrencias.length).toBe(TABLAS.length);
  });

  it("habilita row level security en todas las entidades", () => {
    for (const tabla of TABLAS) {
      expect(sql).toContain(`alter table public.${tabla} enable row level security`);
    }
  });

  it("otorga acceso de data api a service_role en todas las entidades", () => {
    for (const tabla of TABLAS) {
      expect(sql).toContain(`grant all on public.${tabla} to service_role`);
    }
  });

  it("traza toda tabla tenant-owned hasta organization_id", () => {
    for (const tabla of TABLAS_TENANT_OWNED) {
      const bloque = sql.slice(sql.indexOf(`create table public.${tabla}`));
      const cuerpo = bloque.slice(0, bloque.indexOf(");"));
      expect(cuerpo).toContain("organization_id uuid not null references public.organizations");
    }
  });

  it("no concede acceso al rol anónimo", () => {
    expect(sql).not.toContain(" to anon");
    expect(sql).not.toMatch(/grant[^;]*anon/);
  });

  it("no crea políticas permisivas generales sobre tablas tenant-owned", () => {
    for (const tabla of TABLAS_TENANT_OWNED) {
      expect(sql).not.toMatch(new RegExp(`on public\\.${tabla}[^;]*using \\(true\\)`));
    }
  });
});

describe("fundación de datos productiva · invariantes de dominio", () => {
  it("vincula obligatoriamente cada assessment a una knowledge version", () => {
    expect(sql).toContain(
      "knowledge_version_id uuid not null references public.knowledge_versions (id) on delete restrict",
    );
  });

  it("define los tipos de assessment compatibles", () => {
    expect(sql).toContain("create type public.assessment_type as enum ('baseline', 'reassessment', 'follow_up')");
  });

  it("define el ciclo de vida de knowledge version con checksum y publicación", () => {
    expect(sql).toContain(
      "create type public.knowledge_version_status as enum ('draft', 'validated', 'published', 'superseded')",
    );
    expect(sql).toContain("checksum text not null");
    expect(sql).toContain("published_at timestamptz");
  });

  it("mantiene response y observation como entidades separadas con trazabilidad opcional", () => {
    expect(sql).toContain("create table public.responses");
    expect(sql).toContain("create table public.observations");
    // nullable: no toda response produce observation
    expect(sql).toContain("source_response_id uuid references public.responses (id) on delete set null");
    expect(sql).not.toContain("source_response_id uuid not null");
  });

  it("registra los triggers y estados permitidos de evaluation run", () => {
    for (const trigger of [
      "response_accepted",
      "evidence_added",
      "observation_updated",
      "contradiction_resolved",
      "manual_reevaluation",
      "reassessment_started",
      "validation_completed",
    ]) {
      expect(sql).toContain(`'${trigger}'`);
    }
    for (const estado of ["pending", "processing", "processed", "failed", "needs_review"]) {
      expect(sql).toContain(`'${estado}'`);
    }
    expect(sql).toContain("engine_version text not null");
    expect(sql).toContain("completed_at timestamptz");
  });

  it("vincula variable_evaluations al run que las produjo, sin escalas numéricas", () => {
    const bloque = sql.slice(sql.indexOf("create table public.variable_evaluations"));
    const cuerpo = bloque.slice(0, bloque.indexOf(");"));
    expect(cuerpo).toContain("evaluation_run_id uuid not null references public.evaluation_runs");
    expect(cuerpo).toContain("state text not null");
    expect(cuerpo).not.toMatch(/numeric|integer|real|double/);
  });

  it("define roles de membership sin IAM adicional", () => {
    expect(sql).toContain("create type public.membership_role as enum ('owner', 'admin', 'member')");
    // Sin IAM propio: ni roles adicionales ni jerarquías fuera de membership.
    expect(sql).not.toMatch(/create table public\.(roles|permissions|user_roles)\b/);
  });

  it("mantiene User ≠ Membership ≠ Respondent", () => {
    const bloque = sql.slice(sql.indexOf("create table public.respondents"));
    const cuerpo = bloque.slice(0, bloque.indexOf(");"));
    // Un respondent puede existir sin cuenta y sin membresía en la organización.
    expect(cuerpo).toContain("user_id uuid");
    expect(cuerpo).not.toContain("user_id uuid not null");
    expect(cuerpo).not.toContain("membership_id");
    expect(cuerpo).not.toContain("membership_role");
  });

  it("almacena la evidencia por referencia a storage, no como binario en la base", () => {
    const bloque = sql.slice(sql.indexOf("create table public.evidence"));
    const cuerpo = bloque.slice(0, bloque.indexOf(");"));
    expect(cuerpo).toContain("storage_bucket text");
    expect(cuerpo).toContain("storage_path text");
    expect(cuerpo).not.toMatch(/bytea|blob/);
  });

  it("permite que una evidencia soporte varias observaciones", () => {
    const bloque = sql.slice(sql.indexOf("create table public.observation_evidence"));
    const cuerpo = bloque.slice(0, bloque.indexOf(");"));
    expect(cuerpo).toContain("observation_id uuid not null references public.observations");
    expect(cuerpo).toContain("evidence_id uuid not null references public.evidence");
    // La unicidad es por par, no por evidencia: una evidencia puede repetirse.
    expect(sql).toContain("unique index observation_evidence_unique on public.observation_evidence (observation_id, evidence_id)");
  });

  it("elimina la política genérica de alta de organizaciones", () => {
    expect(sql).toContain('drop policy if exists "organizations_insert_authenticated" on public.organizations');
  });

  it("acota el alta de organización a quien aún no pertenece a ninguna", () => {
    const bloque = sql.slice(sql.indexOf('create policy "organizations_insert_bootstrap"'));
    const cuerpo = bloque.slice(0, bloque.indexOf(";"));
    expect(cuerpo).toContain("not exists");
    expect(cuerpo).toContain("m.user_id = auth.uid()");
    // La política no puede ser genérica (with check true).
    expect(cuerpo).not.toMatch(/with check \(\s*true\s*\)/);
  });

  it("no expone el bootstrap como función con privilegios elevados", () => {
    const bloque = sql.slice(sql.lastIndexOf("function public.bootstrap_organization"));
    expect(bloque).toContain("security invoker");
  });

  it("restringe los archivos de evidencia a la organización dueña de la carpeta", () => {
    const bloque = sql.slice(sql.indexOf('create policy "evidence_select_members"'));
    expect(bloque).toContain("bucket_id = 'evidence'");
    expect(bloque).toContain("private.is_organization_member(((storage.foldername(name))[1])::uuid)");
  });
});

describe("M1-HIJ · findings y preparación de ejecución", () => {
  it("todo finding conserva su lineage en columnas obligatorias", () => {
    for (const columna of [
      "assessment_id uuid not null",
      "evaluation_run_id uuid not null",
      "knowledge_version_id uuid not null",
      "capability_id text not null",
      "knowledge_pack_id text not null",
      "knowledge_pack_version text not null",
      "engine_version text not null",
    ]) {
      expect(sql).toContain(columna);
    }
  });

  it("la severidad es cualitativa: no existe columna numérica ni de prioridad", () => {
    expect(sql).toContain("severity_qualitative text");
    expect(sql).not.toMatch(/severity_score|severity numeric|priority_score|priority integer/);
  });

  it("una referencia derivada nunca es ejecutable", () => {
    expect(sql).toContain("executable boolean not null default false");
    expect(sql).toContain("check (executable = false)");
  });

  it("el estado de ejecución no incluye validación", () => {
    expect(sql).toContain("create type public.execution_state as enum ('pending', 'executing', 'deliverable_produced')");
    expect(sql).not.toMatch(/execution_state as enum[^;]*validated/);
  });

  it("las acciones relevantes quedan auditadas sin event sourcing", () => {
    expect(sql).toContain("create table public.audit_events");
    for (const evento of [
      "finding_created",
      "finding_confirmed",
      "recommendation_selected",
      "intervention_created",
      "activity_state_changed",
      "deliverable_registered",
    ]) {
      expect(sql).toContain(evento);
    }
  });

  it("los outputs del engine no son escribibles desde el cliente", () => {
    // findings y referencias derivadas se escriben server-side (service_role).
    expect(sql).toMatch(/grant select on public\.findings to authenticated/);
    expect(sql).not.toMatch(/grant insert[^;]*public\.findings to authenticated/);
  });
});

describe("M1-KL · CRV, Validation, Follow-up y Reassessment", () => {
  it("el CRV cuelga de intervención y actividad, con lineage de conocimiento", () => {
    const bloque = sql.slice(sql.indexOf("create table public.validation_requirements"));
    const cuerpo = bloque.slice(0, bloque.indexOf(");"));
    for (const columna of [
      "intervention_id uuid not null",
      "knowledge_version_id uuid not null",
      "knowledge_pack_id text not null",
      "knowledge_pack_version text not null",
      "engine_version text not null",
      "definition text not null",
      "definition_source text not null",
    ]) {
      expect(cuerpo).toContain(columna);
    }
  });

  it("un CRV no es un KPI: no existe columna de puntaje ni de umbral numérico", () => {
    const bloque = sql.slice(sql.indexOf("create table public.validation_requirements"));
    const cuerpo = bloque.slice(0, bloque.indexOf(");"));
    expect(cuerpo).not.toMatch(/score|kpi|threshold|maturity/);
  });

  it("registra el gap cuando el CRV no está explícito en el Knowledge Master", () => {
    expect(sql).toContain("validation_requirement_not_explicit");
  });

  it("Done es un hecho propio de la actividad, distinto del entregable", () => {
    expect(sql).toContain("add column if not exists done_at timestamptz");
    expect(sql).toContain("add column if not exists done_by uuid");
  });

  it("el ciclo de ejecución llega hasta consolidación sin confundir estados", () => {
    for (const estado of ["validated", "follow_up", "consolidated", "needs_adjustment"]) {
      expect(sql).toContain(`'${estado}'`);
    }
  });

  it("los estados de validación incluyen evidencia insuficiente", () => {
    for (const estado of ["pending", "in_review", "validated", "not_validated", "insufficient_evidence"]) {
      expect(sql).toContain(`'${estado}'`);
    }
  });

  it("un LearningCandidate nunca se aplica al Knowledge Master", () => {
    expect(sql).toContain("applied_to_master boolean not null default false");
    expect(sql).toMatch(/check \(applied_to_master = false\)/);
  });

  it("los objetos de validación no son escribibles desde el cliente", () => {
    for (const tabla of ["validations", "validation_requirements", "assessment_snapshots"]) {
      expect(sql).toMatch(new RegExp(`grant select on public\\.${tabla} to authenticated`));
      expect(sql).not.toMatch(new RegExp(`grant insert[^;]*public\\.${tabla} to authenticated`));
    }
  });
});
