import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const entrada = z.object({
  paginas: z.array(z.object({ pagina: z.number().int().min(1), texto: z.string().max(20_000) })).min(1).max(5),
});

/** Rebanada vertical IA · DG-01. Requiere sesión; no escribe en la base de datos. */
export const interpretarDocumentoDG01 = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => entrada.parse(d))
  .handler(async ({ data }) => {
    const { interpretarDocumento } = await import("./interpretar-documento.server");
    return interpretarDocumento(data.paginas, "DG-01");
  });
