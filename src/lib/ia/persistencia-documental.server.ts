/**
 * Document-First P5 · Persistencia gobernada de una lectura documental con IA.
 *
 * Documento → versión → extracción → fragmentos (cita literal verificada) →
 * interpretación (hecho propuesto) → correspondencia CANDIDATA a una NI.
 * Nada de esto es una observación admitida, ni suficiencia, ni cierre.
 * Las escrituras usan el cliente privilegiado SOLO tras resolver la
 * organización del usuario autenticado vía RLS (asegurarContextoProductivo).
 */
import type { PaginaTexto, ResultadoVerificacion } from "./interpretacion-documental";

async function sha256(texto: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface LecturaPersistida {
  evidenceId: string;
  extractionId: string;
  /** propuesta.id → fragment_mappings.id */
  mappingIds: Record<string, string>;
  /** propuesta.id → otras propuestas que comparten el mismo fragmento */
  fragmentoCompartido: Record<string, string[]>;
}

export async function persistirLectura(
  context: { userId: string; supabase: unknown },
  params: {
    capabilityId: string;
    titulo: string;
    paginas: PaginaTexto[];
    resultado: ResultadoVerificacion;
    traza: { provider: string; model: string; promptVersion: string; runId: string | null; packId: string; packVersion: string; packChecksum: string };
  },
): Promise<LecturaPersistida> {
  const runtime = await import("@/lib/production/runtime.server");
  type Cliente = Parameters<typeof runtime.asegurarContextoProductivo>[0];
  // Organización y Assessment del propio usuario (RLS); nunca de terceros.
  const assessment = await runtime.asegurarContextoProductivo(context.supabase as Cliente, context.userId, params.capabilityId);
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const org = assessment.organizationId;
  const fallo = (paso: string, e: { message: string } | null) => {
    if (e) throw new Error(`DOCUMENT_FIRST_PERSIST_FAILED:${paso}:${e.message}`);
  };
  const textoHash = await sha256(params.paginas.map((p) => `${p.pagina}\n${p.texto}`).join("\n\f\n"));

  const ev = await db
    .from("evidence")
    .insert({
      organization_id: org,
      case_id: assessment.caseId,
      assessment_id: assessment.id,
      evidence_type: "DOCUMENT_AI_READING",
      source: "DOCUMENT",
      title: params.titulo.slice(0, 200),
      note: "Documento cargado para lectura con IA. Cargado ≠ validado.",
      external_reference: `text-sha256:${textoHash}`,
      submitted_by: context.userId,
      upload_context_capability_id: params.capabilityId,
    })
    .select("id")
    .single();
  fallo("evidence", ev.error);
  const ver = await db
    .from("evidence_versions")
    .insert({ organization_id: org, evidence_id: ev.data!.id, version_number: 1, content_sha256: textoHash, mime_type: "application/pdf", created_by: context.userId })
    .select("id")
    .single();
  fallo("evidence_versions", ver.error);
  const ext = await db
    .from("document_extractions")
    .insert({
      organization_id: org,
      evidence_version_id: ver.data!.id,
      extraction_version: 1,
      status: "COMPLETED",
      model_provider: params.traza.provider,
      model_id: params.traza.model,
      prompt_ref: `${params.traza.promptVersion}|run:${params.traza.runId ?? "n/a"}|pack:${params.traza.packId}@${params.traza.packVersion}`,
      knowledge_version_id: assessment.knowledgeVersionId,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  fallo("document_extractions", ext.error);

  // Un fragmento por cita literal (página + texto); citas compartidas entre
  // varias NI son UN fragmento con varias correspondencias candidatas.
  const claves = new Map<string, string[]>();
  for (const v of params.resultado.verificadas) {
    const k = `${v.pagina}|${v.cita}`;
    claves.set(k, [...(claves.get(k) ?? []), v.id]);
  }
  const fragId = new Map<string, string>();
  let i = 0;
  for (const k of claves.keys()) {
    const [pag, ...resto] = k.split("|");
    const cita = resto.join("|");
    const f = await db
      .from("evidence_fragments")
      .insert({ organization_id: org, extraction_id: ext.data!.id, sequence_index: i++, verbatim_text: cita, locator: { page: Number(pag) }, text_sha256: await sha256(cita) })
      .select("id")
      .single();
    fallo("evidence_fragments", f.error);
    fragId.set(k, f.data!.id);
  }

  const mappingIds: Record<string, string> = {};
  const fragmentoCompartido: Record<string, string[]> = {};
  for (const v of params.resultado.verificadas) {
    const k = `${v.pagina}|${v.cita}`;
    fragmentoCompartido[v.id] = (claves.get(k) ?? []).filter((x) => x !== v.id);
    const it = await db
      .from("fragment_interpretations")
      .insert({ organization_id: org, fragment_id: fragId.get(k)!, statement: v.hechoInterpretado || v.cita, model_provider: params.traza.provider, model_id: params.traza.model, prompt_ref: params.traza.promptVersion })
      .select("id")
      .single();
    fallo("fragment_interpretations", it.error);
    const m = await db
      .from("fragment_mappings")
      .insert({
        organization_id: org,
        assessment_id: assessment.id,
        fragment_id: fragId.get(k)!,
        interpretation_id: it.data!.id,
        capability_id: params.capabilityId,
        target_type: "INFORMATION_NEED",
        target_ref: v.informationNeedRef,
        knowledge_version_id: assessment.knowledgeVersionId,
        knowledge_pack_id: params.traza.packId,
        knowledge_pack_version: params.traza.packVersion,
        proposed_by: "AI",
        proposer_model_id: params.traza.model,
        decision_note: v.justificacion ? `IA: ${v.justificacion}`.slice(0, 1000) : null,
      })
      .select("id")
      .single();
    fallo("fragment_mappings", m.error);
    mappingIds[v.id] = m.data!.id;
  }
  return { evidenceId: ev.data!.id, extractionId: ext.data!.id, mappingIds, fragmentoCompartido };
}
