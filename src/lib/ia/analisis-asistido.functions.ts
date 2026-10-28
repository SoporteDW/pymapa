import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const cap = z.object({ capabilityId: z.string().min(2).max(20) });

export const ejecutarAnalisisIA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => cap.parse(d))
  .handler(async ({ context, data }) => {
    const s = await import("./analisis-asistido.server");
    try {
      return { ok: true as const, ...(await s.ejecutarAnalisisAsistido(context, data.capabilityId)) };
    } catch (e) {
      if (e instanceof s.AnalisisRechazado) return { ok: false as const, error: e.message };
      throw e;
    }
  });

export const listarAnalisisIA = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => cap.parse(d))
  .handler(async ({ context, data }) => (await import("./analisis-asistido.server")).listarAnalisis(context, data.capabilityId));

export const revisarItemIA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      analysisId: z.string().uuid(),
      itemId: z.string().min(1).max(20),
      decision: z.enum(["ACCEPTED", "DISMISSED", "NEEDS_INFORMATION"]),
      note: z.string().trim().min(3).max(1000),
      acceptedAction: z.string().max(500).nullable(),
    }).parse(d))
  .handler(async ({ context, data }) => {
    const s = await import("./analisis-asistido.server");
    try {
      return await s.revisarItem(context, data);
    } catch (e) {
      if (e instanceof s.AnalisisRechazado) return { ok: false as const, error: e.message };
      throw e;
    }
  });
