import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const entrada = z.object({
  titulo: z.string().min(1).max(200).optional(),
  paginas: z.array(z.object({ pagina: z.number().int().min(1), texto: z.string().max(20_000) })).min(1).max(5),
});

/**
 * Document-First · DG-01. Requiere sesión. La IA propone; el servidor verifica
 * y guarda documento, fragmentos y correspondencias como CANDIDATAS en la
 * organización del usuario. Nada se admite ni se evalúa automáticamente.
 */
export const interpretarDocumentoDG01 = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => entrada.parse(d))
  .handler(async ({ data, context }) => {
    const { interpretarDocumento } = await import("./interpretar-documento.server");
    const r = await interpretarDocumento(data.paginas, "DG-01");
    if (!r.ok || !r.resultado) return { ...r, persistencia: null };
    const { persistirLectura } = await import("./persistencia-documental.server");
    try {
      const persistencia = await persistirLectura(context, {
        capabilityId: "DG-01",
        titulo: data.titulo ?? "Documento",
        paginas: data.paginas,
        resultado: r.resultado,
        traza: r.traza,
      });
      return { ...r, persistencia };
    } catch (e) {
      console.error("[ia-documental] persistencia", e);
      return { ...r, persistencia: null, errorPersistencia: "No se pudieron guardar las propuestas." };
    }
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
