import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const evaluateComplementaryPrescription = createServerFn({method:"POST"})
  .middleware([requireSupabaseAuth])
  .inputValidator((data:unknown)=>data)
  .handler(async({data,context})=>{
    const {evaluateStoredPrescription}=await import("./prescriptive.server");
    return evaluateStoredPrescription(context.supabase,context.userId,data);
  });