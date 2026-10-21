import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { prescriptionInputSchema } from "./prescriptive-contract";

export const evaluateComplementaryPrescription = createServerFn({method:"POST"})
  .middleware([requireSupabaseAuth])
  .inputValidator((data:unknown)=>prescriptionInputSchema.parse(data))
  .handler(async({data,context})=>{
    const {evaluateStoredPrescription}=await import("./prescriptive.server");
    return evaluateStoredPrescription(context.supabase,context.userId,data);
  });