/**
 * PKG-02A · Identidad de empresa productiva (PostgreSQL, RLS como el usuario).
 *
 * - La organización se resuelve SIEMPRE en servidor desde la identidad
 *   autenticada (bootstrap gobernado); nunca se acepta organizationId del browser.
 * - Solo OWNER/ADMIN pueden cambiar el nombre (además, la RLS
 *   `organizations_update_admins` lo impone en PostgreSQL).
 */
import { validarNombreEmpresa, requiereNombreEmpresa } from "./entrada";

export type CompanyCtx = { userId: string; supabase: unknown };

type Resultado<T> = { data: T | null; error: { message: string } | null };
interface Consulta<T = unknown> extends PromiseLike<Resultado<T>> {
  select(c: string): Consulta<T>;
  eq(c: string, v: unknown): Consulta<T>;
  update(v: Record<string, unknown>): Consulta<T>;
  maybeSingle(): PromiseLike<Resultado<T>>;
}
export interface ClienteEmpresa {
  from(tabla: string): Consulta;
}

export interface CompanyDeps {
  /** Recupera/crea org + case + assessment BASELINE (runtime manifest). */
  asegurar: (db: unknown, userId: string) => Promise<{ organizationId: string; caseId: string; id: string }>;
}

async function depsPorDefecto(): Promise<CompanyDeps> {
  const runtime = await import("./runtime.server");
  return {
    asegurar: (db, userId) =>
      runtime.asegurarContextoProductivo(db as Parameters<typeof runtime.asegurarContextoProductivo>[0], userId),
  };
}

async function leerEmpresa(db: ClienteEmpresa, userId: string, organizationId: string) {
  const m = (await db
    .from("memberships")
    .select("role")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .maybeSingle()) as Resultado<{ role: string }>;
  if (m.error) throw new Error(`memberships.select: ${m.error.message}`);
  if (!m.data) throw new Error("MEMBERSHIP_REQUIRED");
  const o = (await db.from("organizations").select("id, name").eq("id", organizationId).maybeSingle()) as Resultado<{
    id: string;
    name: string;
  }>;
  if (o.error) throw new Error(`organizations.select: ${o.error.message}`);
  if (!o.data) throw new Error("ORGANIZATION_NOT_VISIBLE");
  return { role: m.data.role, name: o.data.name };
}

export async function getCompanyHandler(context: CompanyCtx, deps?: CompanyDeps) {
  const d = deps ?? (await depsPorDefecto());
  const assessment = await d.asegurar(context.supabase, context.userId);
  const { role, name } = await leerEmpresa(context.supabase as ClienteEmpresa, context.userId, assessment.organizationId);
  return {
    name,
    role,
    canEdit: role === "OWNER" || role === "ADMIN",
    needsName: requiereNombreEmpresa(name),
  };
}

export function updateCompanyNameInput(data: unknown): { name: string } {
  const nombre = (data as { name?: unknown } | null)?.name;
  const v = validarNombreEmpresa(nombre);
  if (!v.ok) throw new Error(v.error);
  return { name: v.nombre };
}

export async function updateCompanyNameHandler(context: CompanyCtx, input: { name: string }, deps?: CompanyDeps) {
  const d = deps ?? (await depsPorDefecto());
  const db = context.supabase as ClienteEmpresa;
  const assessment = await d.asegurar(context.supabase, context.userId);
  const { role } = await leerEmpresa(db, context.userId, assessment.organizationId);
  if (role !== "OWNER" && role !== "ADMIN") throw new Error("FORBIDDEN");
  const r = (await db
    .from("organizations")
    .update({ name: input.name })
    .eq("id", assessment.organizationId)
    .select("id, name")
    .maybeSingle()) as Resultado<{ id: string; name: string }>;
  if (r.error) throw new Error(`organizations.update: ${r.error.message}`);
  // RLS filtra la fila si el usuario no está autorizado: fallo cerrado.
  if (!r.data) throw new Error("FORBIDDEN");
  return { name: r.data.name, needsName: requiereNombreEmpresa(r.data.name) };
}
