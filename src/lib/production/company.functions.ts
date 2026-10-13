/** PKG-02A · Boundary autenticado de identidad de empresa. */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import * as h from "./company-handlers";

export const getCompany = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => h.getCompanyHandler(context));

export const updateCompanyName = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => h.updateCompanyNameInput(data))
  .handler(async ({ data, context }) => h.updateCompanyNameHandler(context, data));
