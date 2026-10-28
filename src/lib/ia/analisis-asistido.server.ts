/**
 * DEC-053 · Ejecución server-only de AI_ASSISTED_ANALYSIS.
 * Guardas fail-closed antes de cualquier transmisión:
 *  - capacidad CAPTURE_ONLY (sin motor institucional);
 *  - usuario OWNER/ADMIN de la organización (RLS);
 *  - organización con autorización SYNTHETIC_QA_ONLY activa (DEC-047: ningún
 *    dato real se envía a IA externa);
 *  - entradas = solo respuestas vigentes de esa capacidad (texto del servidor).
 * El resultado se guarda append-only; nunca alimenta al Engine, EPAR ni hallazgos.
 */
import { MODELO_IA } from "./interpretacion-documental";
import { createLovableGatewayClient, type LlmGatewayClient } from "./llm-gateway-client.server";
import {
  AI_ANALYSIS_CONTRACT_VERSION,
  ANALYSIS_JSON_SCHEMA,
  construirPrompt,
  validarAnalisis,
  type EntradaAnalisis,
} from "./analisis-asistido";

type Ctx = { userId: string; supabase: unknown };
type Cliente = { from: (t: string) => any };

export class AnalisisRechazado extends Error {}

export async function ejecutarAnalisisAsistido(context: Ctx, capabilityId: string, client?: LlmGatewayClient) {
  const h = await import("@/lib/production/capability-handlers");
  const ws = await h.getCapabilityWorkspaceHandler(context as never, capabilityId, {});
  if (ws.capability.diagnosticMode !== "CAPTURE_ONLY") throw new AnalisisRechazado("Esta capacidad usa el motor institucional; no aplica análisis asistido.");
  if (ws.userRole !== "OWNER" && ws.userRole !== "ADMIN") throw new AnalisisRechazado("Solo OWNER o ADMIN pueden solicitar el análisis asistido.");
  if (!ws.syntheticQaIngestionAuthorized) throw new AnalisisRechazado("Análisis asistido solo habilitado para empresas sintéticas autorizadas (DEC-047).");

  const entradas: EntradaAnalisis[] = ws.responseHistory
    .filter((r) => !r.supersededByObservationId && r.semanticValue != null && String(r.semanticValue).trim())
    .map((r) => ({ ref: r.observationId, kind: "RESPONSE" as const, acquisitionId: r.acquisitionId, label: r.label, text: String(r.semanticValue) }));
  if (!entradas.length) throw new AnalisisRechazado("Aún no hay respuestas registradas para analizar.");
  const pendientes = ((ws.workspace as { pending?: { question?: string | null; informationNeedStatement?: string | null }[] }).pending ?? [])
    .map((p) => p.question ?? p.informationNeedStatement ?? "").filter(Boolean);

  const { system, user } = construirPrompt({ capabilityName: ws.capability.name, definition: ws.capability.definition, entradas, pendientes });
  let c = client;
  if (!c) {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new AnalisisRechazado("Servicio de IA no configurado.");
    c = createLovableGatewayClient(key);
  }
  const res = await c.completeJson({ model: MODELO_IA, system, user, schemaName: "ai_assisted_analysis", schema: ANALYSIS_JSON_SCHEMA as never, maxOutputTokens: 6000 });
  if (!res.ok) throw new AnalisisRechazado(`El servicio de IA no respondió (${res.status}): ${res.message}`);
  const { items, rejected } = validarAnalisis(res.json, entradas);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as unknown as Cliente).from("ai_assisted_analyses").insert({
    organization_id: ws.organizationId,
    assessment_id: ws.assessmentId,
    capability_id: ws.capability.capabilityId,
    contract_version: AI_ANALYSIS_CONTRACT_VERSION,
    input_refs: entradas.map((e) => e.ref),
    evidence_refs: [],
    items,
    rejected_items: rejected,
    provider: res.provider,
    model: res.model,
    service_version: AI_ANALYSIS_CONTRACT_VERSION,
    run_id: res.runId,
    requested_by: context.userId,
  }).select("id, created_at").single();
  if (error) throw new Error(error.message);
  return { id: data.id as string, createdAt: data.created_at as string, items, rejectedCount: rejected.length };
}

export async function listarAnalisis(context: Ctx, capabilityId: string) {
  const cli = context.supabase as Cliente;
  const { data, error } = await cli.from("ai_assisted_analyses")
    .select("id, capability_id, contract_version, items, rejected_items, model, provider, created_at, input_refs")
    .eq("capability_id", capabilityId).order("created_at", { ascending: false }).limit(5);
  if (error) throw new Error(error.message);
  const ids = (data ?? []).map((d: { id: string }) => d.id);
  const { data: reviews } = ids.length
    ? await cli.from("ai_assisted_analysis_reviews").select("analysis_id, item_id, decision, note, created_at").in("analysis_id", ids)
    : { data: [] };
  return { analyses: data ?? [], reviews: reviews ?? [] };
}

export async function revisarItem(context: Ctx, d: { analysisId: string; itemId: string; decision: "ACCEPTED" | "DISMISSED" | "NEEDS_INFORMATION"; note: string; acceptedAction: string | null }) {
  const cli = context.supabase as Cliente;
  const { data: a } = await cli.from("ai_assisted_analyses").select("organization_id, items").eq("id", d.analysisId).maybeSingle();
  if (!a) throw new AnalisisRechazado("Análisis no encontrado.");
  if (!(a.items as { id: string }[]).some((i) => i.id === d.itemId)) throw new AnalisisRechazado("Elemento no encontrado.");
  const { error } = await cli.from("ai_assisted_analysis_reviews").insert({
    analysis_id: d.analysisId, organization_id: a.organization_id, item_id: d.itemId, decision: d.decision, note: d.note, accepted_action: d.acceptedAction, reviewed_by: context.userId,
  });
  if (error) throw new AnalisisRechazado("No autorizado para revisar (solo OWNER/ADMIN).");
  return { ok: true };
}
