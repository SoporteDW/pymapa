import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { declareCapabilityDocumentCoverage } from "@/lib/production/capabilities.functions";
import type { ComponentEvidenceEvaluation, StructuredCoverageDeclaration } from "@/lib/production/structured-coverage";

export interface DocumentaryMappingItem {
 id: string; status: string; targetType: string; targetRef: string; factualCorrespondenceRef: string | null;
 fragmentText: string; interpretationStatement: string | null; coverageScope: "FULL" | "PARTIAL";
 coverageAcquisitionRef: string | null; coverageJustification: string | null; coverageDecidedAt: string | null;
 fragmentId: string; knowledgeVersionId: string; coverageRevision: number; coverageEvaluation: unknown;
 coverageCriteria: { coverageCriteriaVersion: string; components: readonly { componentKey: string; componentDescription: string; required: boolean }[] } | null;
}

function CoverageEditor({ m, save, pending, cancel }: { m: DocumentaryMappingItem; save: (d: StructuredCoverageDeclaration) => void; pending: boolean; cancel: () => void }) {
 const [components, setComponents] = useState<ComponentEvidenceEvaluation[]>(() => (m.coverageCriteria?.components ?? []).map((c) => ({
  componentKey: c.componentKey, componentDescription: c.componentDescription, supportState: "UNSUPPORTED", fragmentId: m.fragmentId,
  supportingQuote: "", componentJustification: "", uncertaintyNotes: "", humanConfirmedRelevance: false,
 })));
 const [justification, setJustification] = useState("");
 const [complete, setComplete] = useState(false);
 const [requestId] = useState(() => crypto.randomUUID());
 const update = (i: number, patch: Partial<ComponentEvidenceEvaluation>) => setComponents((rows) => rows.map((r, n) => n === i ? { ...r, ...patch } : r));
 const submit = (scope: "FULL" | "PARTIAL") => save({ mappingId: m.id, acquisitionRef: m.factualCorrespondenceRef ?? "", knowledgeVersionId: m.knowledgeVersionId,
  coverageCriteriaVersion: m.coverageCriteria?.coverageCriteriaVersion ?? "NOT_DEFINED", targetScope: scope, componentEvaluations: components,
  synthesisJustification: justification.trim(), humanConfirmedCompleteness: complete, expectedRevision: m.coverageRevision, requestId });
 return <div className="space-y-4">
  {components.map((c, i) => <fieldset key={c.componentKey} className="space-y-2 border-t border-border pt-3">
   <legend className="font-medium">{c.componentDescription}</legend>
   <label className="block">Respaldo documental<select aria-label={`Respaldo: ${c.componentDescription}`} className="ml-2 rounded border border-input bg-background p-2" value={c.supportState} onChange={(e) => update(i, { supportState: e.target.value as ComponentEvidenceEvaluation["supportState"] })}>
    <option value="SUPPORTED">Respaldado</option><option value="PARTIAL">Parcial</option><option value="UNSUPPORTED">Sin respaldo</option><option value="UNCERTAIN">Incierto</option>
   </select></label>
   <Textarea aria-label={`Cita: ${c.componentDescription}`} placeholder="Cita literal del fragmento" value={c.supportingQuote} onChange={(e) => update(i, { supportingQuote: e.target.value })} />
   <Textarea aria-label={`Justificación: ${c.componentDescription}`} placeholder="Justificación de la relación con este componente" value={c.componentJustification} onChange={(e) => update(i, { componentJustification: e.target.value })} />
   <Textarea aria-label={`Incertidumbres: ${c.componentDescription}`} placeholder="Incertidumbres pendientes" value={c.uncertaintyNotes} onChange={(e) => update(i, { uncertaintyNotes: e.target.value })} />
   <label className="flex items-start gap-2"><Checkbox checked={c.humanConfirmedRelevance} onCheckedChange={(v) => update(i, { humanConfirmedRelevance: v === true })} />Confirmo que la cita respalda este componente, no solamente otro.</label>
  </fieldset>)}
  {!m.coverageCriteria && <p className="text-muted-foreground">No hay criterios de cobertura aprobados para este requerimiento. Se conserva cobertura parcial.</p>}
  <Textarea aria-label="Justificación de síntesis" placeholder="Justificación de la decisión" value={justification} onChange={(e) => setJustification(e.target.value)} />
  {m.coverageCriteria && <label className="flex items-start gap-2"><Checkbox checked={complete} onCheckedChange={(v) => setComplete(v === true)} />Declaro bajo mi responsabilidad que todos los componentes están cubiertos; la verificación de citas no certifica su suficiencia semántica.</label>}
  <div className="flex flex-wrap gap-2">
   {m.coverageCriteria && <Button size="sm" disabled={pending || justification.trim().length < 10} onClick={() => submit("FULL")}>Solicitar cobertura completa</Button>}
   <Button size="sm" variant="outline" disabled={pending || justification.trim().length < 10} onClick={() => submit("PARTIAL")}>Registrar cobertura parcial</Button>
   <Button size="sm" variant="ghost" onClick={cancel}>Cancelar</Button>
  </div>
 </div>;
}

export function CoberturaDocumentalPanel({ capabilityId, mappings, canGovern }: { capabilityId: string; mappings: DocumentaryMappingItem[]; canGovern: boolean }) {
 const qc = useQueryClient(); const declare = useServerFn(declareCapabilityDocumentCoverage); const [editing, setEditing] = useState<string | null>(null);
 const mutation = useMutation({ mutationFn: (d: StructuredCoverageDeclaration) => declare({ data: { capabilityId, ...d } }),
  onSuccess: (r) => { toast.success(r.coverageScope === "FULL" ? "Cobertura completa registrada" : "Cobertura parcial registrada", { description: r.rejectionReasons.length ? `La solicitud completa no fue aceptada: ${r.rejectionReasons.join(", ")}` : undefined }); setEditing(null); qc.invalidateQueries({ queryKey: ["capacidad", capabilityId] }); qc.invalidateQueries({ queryKey: ["hub-diagnostico"] }); },
  onError: (e) => toast.error("No se pudo registrar la decisión", { description: e instanceof Error ? e.message : undefined }),
 });
 const factual = mappings.filter((m) => m.status === "VALIDATED" && m.targetType === "VARIABLE" && m.factualCorrespondenceRef);
 if (!factual.length) return null;
 return <section data-testid="cobertura-documental" className="space-y-4 border-t border-border pt-6">
  <h2 className="text-base font-semibold">Cobertura documental</h2>
  <ul className="space-y-4">{factual.map((m) => <li key={m.id} data-mapping-id={m.id} className="space-y-3 rounded-lg border border-border p-4 text-sm">
   <div className="flex flex-wrap justify-between gap-2"><span>Requerimiento {m.factualCorrespondenceRef} · variable {m.targetRef}</span><Badge variant="outline">{m.coverageScope === "FULL" && m.coverageEvaluation ? "Cobertura completa declarada" : "Cobertura parcial / no verificada"}</Badge></div>
   <p className="whitespace-pre-wrap text-muted-foreground">«{m.fragmentText}»</p>
   {m.coverageJustification && <p>Decisión registrada: {m.coverageJustification}</p>}
   {canGovern && editing !== m.id && <Button size="sm" variant="outline" onClick={() => setEditing(m.id)}>Evaluar cobertura</Button>}
   {canGovern && editing === m.id && <CoverageEditor m={m} save={(d) => mutation.mutate(d)} pending={mutation.isPending} cancel={() => setEditing(null)} />}
   {!canGovern && <p className="text-muted-foreground">Solo OWNER/ADMIN pueden decidir la cobertura.</p>}
  </li>)}</ul>
 </section>;
}
