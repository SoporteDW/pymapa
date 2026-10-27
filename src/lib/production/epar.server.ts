import { eparBodySchema, hasProfessionalAuthority, type ProfessionalAuthority } from "./epar-contract";
import { getRegisteredPack } from "./packs-registry";

// Dedicated projection over existing records, never an Engine adapter.
type Db = { from: (table: string) => any; rpc: (name: string, args?: Record<string, unknown>) => PromiseLike<{ data: any; error: any }> };
type Scope = { organizationId: string; assessmentId: string; capabilityId: string };
async function read<T>(query: PromiseLike<{ data: T; error: any }>): Promise<T> {
  const r = await query;
  if (r.error) throw new Error("EPAR_OPERATION_FAILED");
  return r.data;
}
export async function verifyEparScope(db: Db, userId: string, scope: Scope) {
  getRegisteredPack(scope.capabilityId);
  const [member, assessment] = await Promise.all([
    read(db.from("memberships").select("id").eq("organization_id", scope.organizationId).eq("user_id", userId).maybeSingle()),
    read(db.from("assessments").select("id, knowledge_version_id").eq("organization_id", scope.organizationId).eq("id", scope.assessmentId).maybeSingle()),
  ]);
  if (!member || !assessment) throw new Error("EPAR_SCOPE_FORBIDDEN");
  return assessment as { id: string; knowledge_version_id: string };
}
export async function verifyEparAuthority(db: Db, userId: string, scope: Scope, id: string) {
  const a = await read<ProfessionalAuthority | null>(db.from("professional_authorities").select("*").eq("id", id).eq("organization_id", scope.organizationId).maybeSingle());
  const events = await read<{ id: string }[]>(db.from("professional_authority_events").select("id").eq("authority_id", id));
  if (!a || !hasProfessionalAuthority(a, scope, userId, events.length > 0, Date.now())) throw new Error("EPAR_AUTHORITY_DENIED");
  return a;
}
export async function getEparWorkspace(db: Db, userId: string, scope: Scope) {
  await verifyEparScope(db, userId, scope);
  const [responses, evidence, authorities, revocations, versions, reviews] = await Promise.all([
    read<any[]>(db.from("responses").select("id, payload, acquisition_ref, created_at, submitted_by").eq("organization_id", scope.organizationId).eq("assessment_id", scope.assessmentId)),
    read<any[]>(db.from("evidence").select("id, title, source, captured_at, external_reference, upload_context_capability_id").eq("organization_id", scope.organizationId).eq("assessment_id", scope.assessmentId)),
    read<ProfessionalAuthority[]>(db.from("professional_authorities").select("*").eq("organization_id", scope.organizationId).eq("evaluator_user_id", userId)),
    read<{ authority_id: string }[]>(db.from("professional_authority_events").select("authority_id").eq("organization_id", scope.organizationId)),
    read<any[]>(db.from("professional_assessments").select("*").eq("organization_id", scope.organizationId).eq("assessment_id", scope.assessmentId).eq("capability_id", scope.capabilityId).order("created_at", { ascending: false })),
    read<any[]>(db.from("professional_assessment_reviews").select("*").eq("organization_id", scope.organizationId).eq("assessment_id", scope.assessmentId).eq("capability_id", scope.capabilityId).order("created_at", { ascending: false })),
  ]);
  const currentAuthorities = authorities.filter(a => hasProfessionalAuthority(a, scope, userId, revocations.some(e => e.authority_id === a.id), Date.now()));
  return { authorities: currentAuthorities, versions, reviews, responses: responses.filter(r => (r.payload?.capabilityId ?? "OP-01") === scope.capabilityId), evidence, origin: "PROFESSIONAL_ASSESSMENT" as const };
}
export async function saveEpar(db: Db, userId: string, scope: Scope, input: unknown) {
  const body = eparBodySchema.parse(input);
  await verifyEparScope(db, userId, scope);
  await verifyEparAuthority(db, userId, scope, body.authorityId);
  if (Date.parse(body.validUntil) <= Date.now() || Date.parse(body.sourceDate) > Date.now()) throw new Error("EPAR_DATES_INVALID");
  const [responses, evidence] = await Promise.all([
    body.responseIds.length ? read<{ id: string; payload: { capabilityId?: string } }[]>(db.from("responses").select("id,payload").eq("organization_id", scope.organizationId).eq("assessment_id", scope.assessmentId).in("id", body.responseIds)) : [],
    body.evidenceIds.length ? read<{ id: string }[]>(db.from("evidence").select("id").eq("organization_id", scope.organizationId).eq("assessment_id", scope.assessmentId).in("id", body.evidenceIds)) : [],
  ]);
  if (body.responseIds.some(id => !responses.some(r => r.id === id && (r.payload.capabilityId ?? "OP-01") === scope.capabilityId)) || body.evidenceIds.some(id => !evidence.some(e => e.id === id))) throw new Error("EPAR_REFERENCE_FORBIDDEN");
  // Database independently checks all references and authority under a transaction lock.
  return read(db.rpc("register_professional_assessment", { _organization: scope.organizationId, _assessment: scope.assessmentId, _capability: scope.capabilityId, _body: body }));
}
export async function reviewEpar(db: Db, userId: string, scope: Scope, input: { versionId: string; authorityId: string; decision: string; note: string }) {
  await verifyEparScope(db, userId, scope);
  await verifyEparAuthority(db, userId, scope, input.authorityId);
  return read(db.rpc("review_professional_assessment", { _version: input.versionId, _organization: scope.organizationId, _assessment: scope.assessmentId, _capability: scope.capabilityId, _authority: input.authorityId, _decision: input.decision, _note: input.note }));
}