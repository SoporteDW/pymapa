import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ClipboardCheck, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { getProfessionalWorkspace, registerProfessionalAssessment, reviewProfessionalAssessment } from "@/lib/production/epar.functions";
import { eparBodySchema } from "@/lib/production/epar-contract";

const STATES = { SUBSTANTIATED: "Evaluación sustentada", INSUFFICIENT_INFORMATION: "Información insuficiente · abstención", CONTRADICTORY_INFORMATION: "Información contradictoria · abstención", NOT_APPLICABLE: "No aplicabilidad · abstención", REVIEW_REQUIRED: "Revisión requerida" } as const;
type State = keyof typeof STATES;
type Workspace = Awaited<ReturnType<typeof getProfessionalWorkspace>>;
type Version = Workspace["versions"][number];
const emptyForm = { justification: "", limitations: "", uncertainty: "", pendingInformation: "", sources: "", conclusion: "" };
const fields = { justification: "Justificación", limitations: "Limitaciones", uncertainty: "Incertidumbre", pendingInformation: "Información pendiente", sources: "Fuentes y referencias" };
export function EparPanel({ capabilityId, organizationId, assessmentId }: { capabilityId: string; organizationId: string; assessmentId: string }) {
  const scope = { capabilityId, organizationId, assessmentId };
  const qc = useQueryClient();
  const load = useServerFn(getProfessionalWorkspace);
  const save = useServerFn(registerProfessionalAssessment);
  const review = useServerFn(reviewProfessionalAssessment);
  const queryKey = ["epar", organizationId, assessmentId, capabilityId];
  const q = useQuery({ queryKey, queryFn: () => load({ data: scope }), retry: false });
  const [authorityId, setAuthorityId] = useState("");
  const [state, setState] = useState<State>("INSUFFICIENT_INFORMATION");
  const [form, setForm] = useState(emptyForm);
  const [responseIds, setResponseIds] = useState<string[]>([]);
  const [evidenceIds, setEvidenceIds] = useState<string[]>([]);
  const [sourceDate, setSourceDate] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [editing, setEditing] = useState<Version | null>(null);
  const [reviewTarget, setReviewTarget] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewDecision, setReviewDecision] = useState<"REVIEWED" | "CHANGES_REQUESTED">("CHANGES_REQUESTED");
  const effectiveAuthority = authorityId || q.data?.authorities[0]?.id || "";
  const abstention = ["INSUFFICIENT_INFORMATION", "CONTRADICTORY_INFORMATION", "NOT_APPLICABLE"].includes(state);
  const reset = () => { setEditing(null); setForm(emptyForm); setResponseIds([]); setEvidenceIds([]); setSourceDate(""); setValidUntil(""); setState("INSUFFICIENT_INFORMATION"); };
  const mutation = useMutation({
    mutationFn: async () => {
      if (!sourceDate || !validUntil) throw new Error("Completa la fecha de las fuentes y la vigencia.");
      const body = eparBodySchema.parse({ authorityId: effectiveAuthority, evaluationId: editing?.evaluation_id ?? null, previousVersionId: editing?.id ?? null, state, ...form, conclusion: abstention ? null : form.conclusion.trim() || null, sourceDate: new Date(sourceDate).toISOString(), validUntil: new Date(validUntil).toISOString(), responseIds, evidenceIds });
      return save({ data: { ...scope, body } });
    },
    onSuccess: async () => { reset(); await qc.invalidateQueries({ queryKey }); toast.success("Evaluación profesional registrada"); },
    onError: () => toast.error("No se pudo registrar EPAR. Revisa la autoridad, las fuentes y la vigencia."),
  });
  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (!reviewTarget) throw new Error("Selecciona una evaluación.");
      return review({ data: { ...scope, versionId: reviewTarget, authorityId: effectiveAuthority, decision: reviewDecision, note: reviewNote } });
    },
    onSuccess: async () => { setReviewTarget(null); setReviewNote(""); await qc.invalidateQueries({ queryKey }); toast.success("Revisión profesional registrada"); },
    onError: () => toast.error("No se pudo registrar la revisión profesional."),
  });
  const toggle = (ids: string[], id: string, setter: (v: string[]) => void) => setter(ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
  function amend(v: Version) {
    setEditing(v); setState(v.state as State); setForm({ justification: v.justification, limitations: v.limitations, uncertainty: v.uncertainty, pendingInformation: v.pending_information, sources: v.sources, conclusion: v.conclusion ?? "" });
    setResponseIds(v.response_ids); setEvidenceIds(v.evidence_ids);
    const local = (date: string) => { const d = new Date(date); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
    setSourceDate(local(v.source_date)); setValidUntil(local(v.valid_until));
    document.getElementById(`epar-form-${capabilityId}`)?.scrollIntoView({ behavior: "smooth" });
  }
  return <section className="space-y-4 border-t border-border pt-6" aria-label="Evaluación profesional EPAR" data-testid="epar-panel">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="flex items-center gap-2 text-lg font-semibold"><ClipboardCheck className="h-5 w-5 text-primary" />Evaluación profesional · EPAR</h2><p className="mt-1 text-sm text-muted-foreground">Origen profesional · separado del hallazgo institucional y de la decisión empresarial</p></div>
      <Badge variant="outline">PROFESSIONAL_ASSESSMENT</Badge>
    </header>
    {q.isPending ? <p role="status" className="text-sm text-muted-foreground">Consultando evaluaciones profesionales…</p> : q.error ? <div role="alert" className="space-y-2 text-sm"><p>No se pudieron consultar las evaluaciones de esta empresa.</p><Button variant="outline" size="sm" onClick={() => q.refetch()}>Reintentar</Button></div> : q.data && <>
      {q.data.authorities.length === 0 ? <p className="border-l-2 border-border pl-3 text-sm text-muted-foreground">Sin designación profesional vigente para esta capacidad. La autoridad corresponde al Gobierno de PYMAPA.</p> : <form id={`epar-form-${capabilityId}`} className="space-y-4" onSubmit={e => { e.preventDefault(); mutation.mutate(); }}>
        <h3 className="font-medium">{editing ? `Nueva versión de evaluación · anterior v${editing.version}` : "Registrar evaluación o abstención"}</h3>
        <div className="space-y-2"><Label htmlFor={`epar-authority-${capabilityId}`}>Autoridad profesional</Label><select id={`epar-authority-${capabilityId}`} value={effectiveAuthority} onChange={e => setAuthorityId(e.target.value)} className="w-full rounded-md border border-input bg-background p-2 text-sm">{q.data.authorities.map(a => <option key={a.id} value={a.id}>{a.id} · vigente hasta {new Date(a.valid_until).toLocaleDateString("es")}</option>)}</select></div>
        <div className="space-y-2"><Label htmlFor={`epar-state-${capabilityId}`}>Estado de suficiencia · juicio profesional</Label><select id={`epar-state-${capabilityId}`} value={state} onChange={e => { setState(e.target.value as State); setForm({ ...form, conclusion: "" }); }} className="w-full rounded-md border border-input bg-background p-2 text-sm">{Object.entries(STATES).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></div>
        <details className="space-y-3"><summary className="cursor-pointer text-sm font-medium">Información capturada y evidencia disponible</summary>
          <fieldset className="space-y-2 pt-2"><legend className="text-sm font-medium">Respuestas utilizadas</legend>{q.data.responses.length === 0 && <p className="text-sm text-muted-foreground">Sin respuestas registradas en esta capacidad.</p>}{q.data.responses.map(r => <label key={r.id} className="flex items-start gap-3 border-b border-border py-2 text-sm"><Checkbox checked={responseIds.includes(r.id)} onCheckedChange={() => toggle(responseIds, r.id, setResponseIds)} /><span className="min-w-0 break-words">{r.acquisition_ref} · {JSON.stringify(r.payload)}<span className="block text-xs text-muted-foreground">{r.id} · {new Date(r.created_at).toLocaleString("es")}</span></span></label>)}</fieldset>
          <fieldset className="space-y-2"><legend className="text-sm font-medium">Evidencias utilizadas · del assessment</legend>{q.data.evidence.length === 0 && <p className="text-sm text-muted-foreground">Sin evidencia registrada.</p>}{q.data.evidence.map(e => <label key={e.id} className="flex items-start gap-3 border-b border-border py-2 text-sm"><Checkbox checked={evidenceIds.includes(e.id)} onCheckedChange={() => toggle(evidenceIds, e.id, setEvidenceIds)} /><span className="min-w-0 break-words">{e.title ?? e.source}<span className="block text-xs text-muted-foreground">{e.id} · {e.upload_context_capability_id ?? "Contexto no indicado"}</span></span></label>)}</fieldset>
        </details>
        {!abstention && <div className="space-y-2"><Label htmlFor={`epar-conclusion-${capabilityId}`}>Conclusión profesional{state === "SUBSTANTIATED" ? " *" : " (opcional)"}</Label><Textarea id={`epar-conclusion-${capabilityId}`} value={form.conclusion} onChange={e => setForm({ ...form, conclusion: e.target.value })} required={state === "SUBSTANTIATED"} /></div>}
        {Object.entries(fields).map(([key, label]) => <div key={key} className="space-y-2"><Label htmlFor={`epar-${key}-${capabilityId}`}>{label}{key !== "pendingInformation" && " *"}</Label><Textarea id={`epar-${key}-${capabilityId}`} required={key !== "pendingInformation"} value={form[key as keyof typeof form]} onChange={e => setForm({ ...form, [key]: e.target.value })} /></div>)}
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor={`epar-source-date-${capabilityId}`}>Fecha de las fuentes</Label><Input id={`epar-source-date-${capabilityId}`} type="datetime-local" value={sourceDate} onChange={e => setSourceDate(e.target.value)} required /></div><div className="space-y-2"><Label htmlFor={`epar-until-${capabilityId}`}>Vigente hasta</Label><Input id={`epar-until-${capabilityId}`} type="datetime-local" value={validUntil} onChange={e => setValidUntil(e.target.value)} required /></div></div>
        <div className="flex flex-wrap gap-2"><Button type="submit" disabled={mutation.isPending}><Save className="h-4 w-4" />{abstention ? "Registrar abstención" : "Registrar evaluación"}</Button>{editing && <Button type="button" variant="outline" onClick={reset}><RotateCcw className="h-4 w-4" />Cancelar nueva versión</Button>}</div>
      </form>}
      <div className="space-y-3"><h3 className="text-sm font-semibold">Evaluaciones e historial ({q.data.versions.length})</h3>{q.data.versions.length === 0 && <p className="text-sm text-muted-foreground">Sin evaluaciones profesionales registradas.</p>}{q.data.versions.map(v => {
        const superseded = q.data.versions.some(next => next.previous_version_id === v.id);
        const reviews = q.data.reviews.filter(r => r.version_id === v.id);
        const expired = Date.parse(v.valid_until) <= Date.now();
        return <article key={v.id} className="space-y-3 rounded-md border border-border p-4 text-sm">
          <div className="flex flex-wrap gap-2"><Badge variant="secondary">EPAR · v{v.version}</Badge><Badge variant="outline">{STATES[v.state as State]}</Badge><Badge variant="outline">{superseded ? "Versión anterior" : expired ? "Vigencia vencida" : "Versión vigente"}</Badge><Badge variant="outline">{reviews[0]?.decision === "REVIEWED" ? "Revisada profesionalmente" : reviews[0]?.decision === "CHANGES_REQUESTED" ? "Cambios solicitados" : "Pendiente de revisión"}</Badge></div>
          <p className="font-medium whitespace-pre-wrap">{v.conclusion ?? "Abstención · sin conclusión profesional"}</p>
          <dl className="space-y-2">{[["Justificación", v.justification], ["Limitaciones", v.limitations], ["Incertidumbre", v.uncertainty], ["Información pendiente", v.pending_information || "No indicada"], ["Fuentes", v.sources]].map(([k, value]) => <div key={k}><dt className="font-medium">{k}</dt><dd className="whitespace-pre-wrap break-words text-muted-foreground">{value}</dd></div>)}</dl>
          <p className="break-all text-xs text-muted-foreground">Autor: {v.evaluator_user_id} · Autoridad: {v.authority_id}<br />{new Date(v.created_at).toLocaleString("es")} · Fuentes: {new Date(v.source_date).toLocaleString("es")} · Vigente hasta: {new Date(v.valid_until).toLocaleString("es")}</p>
          <details><summary className="cursor-pointer text-xs font-medium">Fuentes preservadas · {v.response_ids.length} respuestas / {v.evidence_ids.length} evidencias</summary><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all bg-muted p-3 text-xs">{JSON.stringify(v.source_snapshot, null, 2)}</pre></details>
          {reviews.map(r => <p key={r.id} className="border-l-2 border-border pl-3 text-xs text-muted-foreground">{r.decision === "REVIEWED" ? "Revisada" : "Cambios solicitados"} · {new Date(r.created_at).toLocaleString("es")} · {r.reviewer_user_id} · {r.note}</p>)}
          {!superseded && q.data.authorities.length > 0 && <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => amend(v)}>Registrar nueva versión</Button>{!expired && <Button variant="outline" size="sm" onClick={() => { setReviewTarget(v.id); setReviewNote(""); }}>Revisar profesionalmente</Button>}</div>}
          {reviewTarget === v.id && <div className="space-y-2"><Label htmlFor={`epar-review-${v.id}`}>Decisión de revisión</Label><select id={`epar-review-${v.id}`} className="w-full rounded-md border border-input bg-background p-2" value={reviewDecision} onChange={e => setReviewDecision(e.target.value as typeof reviewDecision)}><option value="CHANGES_REQUESTED">Solicitar cambios</option><option value="REVIEWED">Revisada profesionalmente</option></select><Label htmlFor={`epar-review-note-${v.id}`}>Nota de revisión</Label><Textarea id={`epar-review-note-${v.id}`} value={reviewNote} onChange={e => setReviewNote(e.target.value)} /><div className="flex gap-2"><Button size="sm" disabled={!reviewNote.trim() || reviewMutation.isPending} onClick={() => reviewMutation.mutate()}>Registrar revisión</Button><Button size="sm" variant="ghost" onClick={() => setReviewTarget(null)}>Cancelar</Button></div></div>}
        </article>;
      })}</div>
    </>}
  </section>;
}