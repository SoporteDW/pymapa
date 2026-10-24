import { z } from "zod";

export const entradaPilotoSchema = z.object({
  state: z.enum(["KNOWN", "UNKNOWN", "CONTRADICTORY", "NOT_APPLICABLE"]),
  statement: z.string().max(4000),
  conflictingStatement: z.string().max(4000).default(""),
  notApplicableReason: z.string().max(4000).default(""),
}).superRefine((data, ctx) => {
  if (data.state === "KNOWN" && !data.statement.trim()) {
    ctx.addIssue({ code: "custom", path: ["statement"], message: "La información conocida requiere una declaración sintética." });
  }
  if (data.state === "CONTRADICTORY" && (!data.statement.trim() || !data.conflictingStatement.trim() || data.statement.trim() === data.conflictingStatement.trim())) {
    ctx.addIssue({ code: "custom", path: ["conflictingStatement"], message: "Registra dos declaraciones sintéticas distintas como fuentes del conflicto." });
  }
  if (data.state === "NOT_APPLICABLE" && !data.notApplicableReason.trim()) {
    ctx.addIssue({ code: "custom", path: ["notApplicableReason"], message: "La no aplicabilidad requiere una justificación sintética." });
  }
});

export type EntradaPiloto = z.infer<typeof entradaPilotoSchema>;

export const ESCENARIOS: { id: string; name: string; input: EntradaPiloto }[] = [
  { id: "S1", name: "Relato adverso", input: { state: "KNOWN", statement: "Empresa sintética: no tenemos claro cómo creamos valor ni qué hace funcionar el negocio; proponemos digitalizar sin poder explicar esa relación.", conflictingStatement: "", notApplicableReason: "" } },
  { id: "S2", name: "Relato positivo", input: { state: "KNOWN", statement: "Empresa sintética: creamos valor calibrando sensores para talleres. Los clientes pagan por mediciones confiables; nuestros técnicos ejecutan el servicio y orientamos la transformación a reducir errores de registro.", conflictingStatement: "", notApplicableReason: "" } },
  { id: "S3", name: "Información desconocida", input: { state: "UNKNOWN", statement: "", conflictingStatement: "", notApplicableReason: "" } },
  { id: "S4", name: "Información contradictoria", input: { state: "CONTRADICTORY", statement: "Fuente sintética A: el negocio obtiene ingresos por calibración de sensores.", conflictingStatement: "Fuente sintética B: el negocio no presta servicios de calibración ni obtiene ingresos por ellos.", notApplicableReason: "" } },
  { id: "S5", name: "No aplicabilidad justificada", input: { state: "NOT_APPLICABLE", statement: "", conflictingStatement: "", notApplicableReason: "Caso sintético de no aplicabilidad declarada: unidad aún no constituida, sin operación empresarial actual. La justificación no es validación automática de su legitimidad." } },
];