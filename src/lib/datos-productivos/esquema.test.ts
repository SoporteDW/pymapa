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
] as const;

const TABLAS_TENANT_OWNED = TABLAS.filter((t) => t !== "organizations" && t !== "knowledge_versions");

describe("fundación de datos productiva · migraciones versionadas", () => {
  it("existe al menos una migración versionada en Git", () => {
    expect(readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).length).toBeGreaterThan(0);
  });

  it("crea las diez entidades del modelo inicial", () => {
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
    expect(sql).not.toContain("create table public.respondents");
    expect(sql).not.toContain("create table public.assignments");
  });
});
