import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Ruta general de lectura con IA: CERRADA (DEC-047). Aceptaba texto enviado
 * por el cliente sin procedencia verificable; no transmite nada al Gateway.
 */
export const interpretarDocumentoDG01 = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => d)
  .handler(async ({ context }) => {
    const { registrarIntento } = await import("./sem-qa-guard.server");
    const { SEM_QA_01_CORPUS_CHECKSUM } = await import("./sem-qa-corpus");
    await registrarIntento({
      organization_id: null, user_id: context.userId, execution_id: "GENERAL", document_id: "CLIENT_TEXT", evidence_id: null,
      outcome: "REJECTED", rejection_reason: "GENERAL_ROUTE_CLOSED", file_sha256: null, text_sha256: null, corpus_checksum: SEM_QA_01_CORPUS_CHECKSUM,
    });
    return { ok: false as const, error: "La lectura documental con IA está cerrada para uso general. Solo está habilitada la prueba sintética SEM-QA-01." };
  });

const entradaSemQa = z.object({
  executionId: z.string().min(1).max(40),
  documentId: z.string().min(1).max(40),
  evidenceId: z.string().uuid(),
}).strict();

/**
 * SEM-QA-01 · Única ruta que puede invocar el Gateway documental. La guarda
 * verifica organización/rol/ejecución/corpus/checksums sobre el archivo
 * almacenado ANTES de transmitir. El resultado queda CANDIDATE.
 */
export const interpretarDocumentoSemQa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => entradaSemQa.parse(d))
  .handler(async ({ data, context }) => {
    const guard = await import("./sem-qa-guard.server");
    let aut: Awaited<ReturnType<typeof guard.autorizarSemQa>>;
    try {
      aut = await guard.autorizarSemQa(context, data);
    } catch (e) {
      if (e instanceof guard.SemQaRechazo) return { ok: false as const, rechazo: e.motivo, error: `Rechazado antes de usar IA: ${e.motivo}` };
      console.error("[sem-qa] guarda", e);
      return { ok: false as const, rechazo: "GUARD_ERROR", error: "Rechazado antes de usar IA." };
    }
    const { interpretarDocumento } = await import("./interpretar-documento.server");
    const r = await interpretarDocumento(aut, "DG-01");
    const auditoria = {
      organization_id: aut.organizationId, user_id: context.userId, execution_id: aut.executionId, document_id: aut.documentId,
      evidence_id: aut.evidenceId, file_sha256: aut.fileSha256, text_sha256: aut.textSha256, corpus_checksum: aut.corpusChecksum,
      provider: r.traza.provider, model: r.traza.model, run_id: r.traza.runId, prompt_version: r.traza.promptVersion,
    };
    if (!r.ok || !r.resultado) {
      await guard.registrarIntento({ ...auditoria, outcome: "TRANSMITTED_ERROR", rejection_reason: `MODEL_ERROR:${r.status ?? ""}` });
      return { ok: false as const, rechazo: null, error: r.error ?? "Error del modelo", traza: r.traza };
    }
    const { persistirLectura } = await import("./persistencia-documental.server");
    let persistencia: Awaited<ReturnType<typeof persistirLectura>> | null = null;
    let errorPersistencia: string | null = null;
    try {
      persistencia = await persistirLectura(context, {
        capabilityId: "DG-01",
        titulo: `${aut.documentId} · SYNTHETIC_QA_ONLY`,
        paginas: aut.paginas.map((p) => ({ ...p })),
        resultado: r.resultado,
        existente: { evidenceId: aut.evidenceId, versionId: aut.evidenceVersionId, fileSha256: aut.fileSha256, executionId: aut.executionId },
        traza: r.traza,
      });
    } catch (e) {
      console.error("[sem-qa] persistencia", e);
      errorPersistencia = "No se pudieron guardar las propuestas.";
    }
    await guard.registrarIntento({
      ...auditoria, outcome: "TRANSMITTED_OK", rejection_reason: null,
      verified_count: r.resultado.verificadas.length, discarded_count: r.resultado.descartadas.length,
      contradiction_count: r.resultado.contradicciones.length,
      result_summary: {
        verificadas: r.resultado.verificadas.map((v) => ({ ni: v.informationNeedRef, tipo: v.tipo, pagina: v.pagina })),
        descartadas: r.resultado.descartadas.map((d) => d.motivo),
        contradicciones: r.resultado.contradicciones.map((c) => ({ ni: c.informationNeedRef, paginas: c.citas.map((x) => x.pagina) })),
        sinCorrespondencia: r.resultado.sinCorrespondencia,
        extractionId: persistencia?.extractionId ?? null,
      },
    });
    return { ok: true as const, documentId: aut.documentId, traza: r.traza, resultado: r.resultado, propuestasBrutas: r.propuestasBrutas, persistencia, errorPersistencia };
  });

const decision = z.object({ mappingId: z.string().uuid(), decision: z.enum(["VALIDATED", "REJECTED"]), nota: z.string().max(1000).optional() });

/**
 * Revisión humana gobernada: solo ADMIN/OWNER (validate_fragment_mapping).
 * Aceptar = correspondencia VALIDATED a una NI. No crea observaciones, no
 * declara suficiencia y no cierra la capacidad.
 */
export const decidirCorrespondenciaIA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => decision.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("validate_fragment_mapping", {
      _mapping_id: data.mappingId,
      _decision: data.decision,
      _basis: (data.decision === "VALIDATED" ? "HUMAN_VALIDATION" : null) as never,
      _rule_ref: null as never,
      _note: (data.nota ?? null) as never,
    });
    if (error) {
      const msg = error.message.includes("FORBIDDEN")
        ? "Solo un administrador de la empresa puede aceptar o rechazar propuestas."
        : error.message.includes("NO_STATUS_CHANGE") || error.message.includes("INVALID_TRANSITION")
          ? "Esta propuesta ya fue decidida."
          : "No se pudo registrar la decisión.";
      return { ok: false as const, error: msg };
    }
    // INT-01-R1 · Tras una validación, el DocumentAdmissionBridge procesa las
    // correspondencias de esa capacidad (best-effort: una admisión fallida
    // nunca revierte la decisión ya registrada). Las temáticas (NI sin
    // correspondencia factual) son rechazadas por el puente, fail-closed.
    if (data.decision === "VALIDATED") {
      try {
        const { data: mapping } = await context.supabase
          .from("fragment_mappings")
          .select("capability_id")
          .eq("id", data.mappingId)
          .maybeSingle();
        const capabilityId = (mapping as { capability_id?: string } | null)?.capability_id;
        if (capabilityId) {
          const { processCapabilityDocumentAdmissionsHandler } = await import("../production/capability-handlers");
          await processCapabilityDocumentAdmissionsHandler(context, capabilityId);
        }
      } catch (e) {
        console.error("[ia-documental] admision documental", e);
      }
    }
    return { ok: true as const };
  });
