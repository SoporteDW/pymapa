import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, FlaskConical, Play, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ESCENARIOS, type EntradaPiloto } from "@/lib/piloto-dg01/escenarios";
import { ejecutarPiloto } from "@/lib/piloto-dg01/piloto.functions";
import type { ResultadoPiloto } from "@/lib/piloto-dg01/evaluador-piloto";

export const Route = createFileRoute("/piloto-dg01")({
  head: () => ({ meta: [
    { title: "DG-01 · Piloto aislado DEC-049 | pymapa" },
    { name: "description", content: "Circuito sintético DG-01 con Knowledge Engine 0.2.0: observaciones, candidatos técnicos y revisión semántica pendiente." },
    { property: "og:title", content: "pymapa · DG01-VERTICAL-01" },
    { property: "og:description", content: "Piloto aislado de DG-01 sin confirmación diagnóstica automática ni cambios productivos." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: PilotoDg01,
});

function PilotoDg01() {
  const [input, setInput] = useState<EntradaPiloto>({ ...ESCENARIOS[0]?.input, state: "KNOWN", statement: ESCENARIOS[0]?.input.statement ?? "", conflictingStatement: "", notApplicableReason: "" });
  const [selected, setSelected] = useState("S1");
  const [result, setResult] = useState<ResultadoPiloto | null>(null);
  const [bank, setBank] = useState<{ id: string; name: string; result: ResultadoPiloto }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = useServerFn(ejecutarPiloto);
  const update = (patch: Partial<EntradaPiloto>) => { setInput((current) => ({ ...current, ...patch })); setSelected(""); setResult(null); setError(""); };
  async function evaluate(all = false) {
    setBusy(true); setError(""); setResult(null);
    try {
      if (all) {
        const outputs = await Promise.all(ESCENARIOS.map(async (s) => ({ id: s.id, name: s.name, result: await run({ data: s.input }) })));
        setBank(outputs);
      } else setResult(await run({ data: input }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo ejecutar el piloto."); }
    finally { setBusy(false); }
  }
  const variable = result?.evaluation.variableEvaluations.find((v) => v.variableRef === "VA01");
  const inputClass = "w-full rounded-md border border-input bg-card p-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <div className="space-y-7 tracking-normal">
      <header className="space-y-3 border-b border-border pb-5">
        <p className="flex items-center gap-2 text-sm font-medium text-primary"><FlaskConical className="size-5" aria-hidden="true" />DEC-049 · DG01-VERTICAL-01</p>
        <h1 className="text-3xl font-semibold !tracking-normal">DG-01 · Piloto aislado</h1>
        <p className="text-muted-foreground">Orientar la transformación a partir del negocio y su entorno</p>
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="size-4 shrink-0" aria-hidden="true" />Solo datos sintéticos · Sin persistencia productiva · Sin IA externa</p>
      </header>

      <section aria-label="Límite semántico" className="border-l-4 border-warning bg-warning/10 p-4 text-sm text-foreground">
        <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="size-4 shrink-0" aria-hidden="true" />KNOWN no equivale a BUSINESS_LOGIC_UNCLEAR</p>
        <p className="mt-2">Los relatos positivo y adverso pueden producir el mismo candidato técnico. El Engine no determina si el texto cumple o descarta la condición adversa. La interpretación semántica sigue pendiente de gobierno.</p>
      </section>

      <section aria-labelledby="capture" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="capture" className="text-lg font-semibold !tracking-normal">01 · Captura sintética</h2>
          <Button variant="outline" disabled={busy} onClick={() => evaluate(true)}><Play aria-hidden="true" />Ejecutar los cinco escenarios</Button>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Escenarios sintéticos">
          {ESCENARIOS.map((scenario) => <Button key={scenario.id} variant={selected === scenario.id ? "default" : "outline"} size="sm" aria-pressed={selected === scenario.id} disabled={busy} onClick={() => { setInput({ ...scenario.input }); setSelected(scenario.id); setResult(null); setError(""); }}>{scenario.id} · {scenario.name}</Button>)}
        </div>
        <p className="text-sm text-muted-foreground">VA01 · Modelo y lógica actual de creación de valor · NI01 · ACQ·NI01</p>
        <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); void evaluate(); }}>
          <label className="grid max-w-sm gap-2 text-sm font-medium">Estado de información
            <select className={inputClass} value={input.state} disabled={busy} onChange={(event) => update({ state: event.target.value as EntradaPiloto["state"] })}>
              <option value="KNOWN">KNOWN · Información conocida</option><option value="UNKNOWN">UNKNOWN · Información desconocida</option><option value="CONTRADICTORY">CONTRADICTORY · Información contradictoria</option><option value="NOT_APPLICABLE">NOT_APPLICABLE · No aplicabilidad</option>
            </select>
          </label>
          {(input.state === "KNOWN" || input.state === "CONTRADICTORY") && <label className="grid gap-2 text-sm font-medium">{input.state === "CONTRADICTORY" ? "Declaración sintética · Fuente A" : "Declaración sintética"}<textarea className={inputClass} rows={4} maxLength={4000} required value={input.statement} disabled={busy} onChange={(event) => update({ statement: event.target.value })} /></label>}
          {input.state === "CONTRADICTORY" && <label className="grid gap-2 text-sm font-medium">Declaración sintética · Fuente B<textarea className={inputClass} rows={3} maxLength={4000} required value={input.conflictingStatement} disabled={busy} onChange={(event) => update({ conflictingStatement: event.target.value })} /></label>}
          {input.state === "NOT_APPLICABLE" && <label className="grid gap-2 text-sm font-medium">Justificación sintética de no aplicabilidad<textarea className={inputClass} rows={3} maxLength={4000} required value={input.notApplicableReason} disabled={busy} onChange={(event) => update({ notApplicableReason: event.target.value })} /></label>}
          {input.state === "UNKNOWN" && <p className="text-sm text-muted-foreground">Incertidumbre explícita capturada; no equivale a una respuesta negativa.</p>}
          <div><Button type="submit" disabled={busy}><Play aria-hidden="true" />{busy ? "Evaluando…" : "Evaluar observaciones"}</Button></div>
        </form>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </section>

      {result && <section aria-labelledby="result" className="space-y-5 border-t border-border pt-6" aria-live="polite">
        <h2 id="result" className="text-lg font-semibold !tracking-normal">02 · Resultado técnico del Engine</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="border-l-2 border-primary pl-3"><p className="text-sm text-muted-foreground">Estado VA01</p><p className="mt-1 break-words font-semibold">{variable?.state}</p><p className="mt-2 text-sm text-muted-foreground">{result.evaluation.findingCandidates.length} candidato(s) técnico(s)</p></div>
          <div className="border-l-2 border-warning pl-3"><p className="text-sm text-muted-foreground">Interpretación semántica</p><p className="mt-1 font-semibold">Pendiente de gobierno</p><p className="mt-2 text-sm text-muted-foreground">Condición adversa no evaluada</p></div>
          <div className="border-l-2 border-border pl-3"><p className="text-sm text-muted-foreground">Hallazgos confirmados</p><p className="mt-1 font-semibold">0 · Ninguno</p><p className="mt-2 text-sm text-muted-foreground">Sin decisión humana de confirmación</p></div>
        </div>
        {result.evaluation.findingCandidates.map((candidate) => <article key={candidate.findingRef} className="rounded-md border border-border bg-card p-4">
          <p className="break-words font-semibold">{candidate.name}</p><p className="mt-1 text-sm text-warning-foreground">{candidate.lifecycleState} · No es un diagnóstico confirmado</p>
          <p className="mt-3 text-sm">{candidate.reason}</p>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Regla / variable</dt><dd>{candidate.ruleRefs.join(", ")} / {candidate.variableRefs.join(", ")}</dd></div><div><dt className="text-muted-foreground">Observaciones de soporte</dt><dd className="break-words">{candidate.supportingObservationIds.join(", ")}</dd></div><div><dt className="text-muted-foreground">Identidad de demostración</dt><dd>{candidate.findingRef}</dd></div><div><dt className="text-muted-foreground">Confirmable determinísticamente</dt><dd>{String(candidate.deterministicallyConfirmable)}</dd></div></dl>
        </article>)}
        {result.evaluation.findingsAwaitingResolution.map((finding) => <div key={finding.findingRef} className="border-l-2 border-warning pl-3 text-sm"><p className="break-words font-semibold">{finding.status}</p><p className="mt-2">{finding.reason}</p><p className="mt-2 text-muted-foreground">{finding.resolution.requirement} · Adquisiciones: {finding.resolution.acquisitionRefs.join(", ") || "ninguna declarada para esta resolución"}</p></div>)}
        <div><h3 className="font-semibold !tracking-normal">Juicios pendientes</h3>{result.evaluation.pendingJudgments.map((judgment) => <p key={judgment.ruleRef} className="mt-2 text-sm">{judgment.ruleRef} · {judgment.classification} · {judgment.reason}</p>)}</div>
        <div><h3 className="font-semibold !tracking-normal">Trazabilidad</h3><p className="mt-2 text-sm">{result.engineVersion} · piloto-dg01@0.1.0 · No publicado</p><p className="mt-2 text-sm text-muted-foreground">Fuente histórica: knowledge/intake/DG-01/text/DG-01.txt:487–488. Evidencia mínima VA01: NOT_EXPLICIT_IN_KNOWLEDGE_MASTER; E0 no aprobado.</p><p className="mt-2 text-sm text-muted-foreground">{variable?.detail.note}</p></div>
        <details className="border-t border-border pt-4"><summary className="cursor-pointer text-sm font-medium">Observaciones y resultado íntegro del Engine</summary><pre className="mt-3 max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify({ observations: result.observations, evaluation: result.evaluation }, null, 2)}</pre></details>
      </section>}

      {bank.length > 0 && <section aria-labelledby="bank" className="space-y-4 border-t border-border pt-6" aria-live="polite">
        <h2 id="bank" className="text-lg font-semibold !tracking-normal">Cinco ejecuciones sintéticas · Engine 0.2.0</h2>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-muted"><tr><th className="p-3">Escenario</th><th className="p-3">VA01</th><th className="p-3">Resultado técnico</th><th className="p-3">Confirmados</th></tr></thead><tbody>{bank.map((s) => <tr key={s.id} className="border-b border-border"><td className="p-3">{s.id} · {s.name}</td><td className="p-3">{s.result.evaluation.variableEvaluations.find((v) => v.variableRef === "VA01")?.state}</td><td className="p-3">{s.result.evaluation.findingCandidates.map((c) => `${c.findingRef} · ${c.lifecycleState}`).join(", ") || s.result.evaluation.findingsAwaitingResolution.map((f) => f.status).join(", ")}</td><td className="p-3">0</td></tr>)}</tbody></table></div>
        <p className="text-sm text-warning-foreground">S1 y S2 producen el mismo candidato técnico NEEDS_REVIEW. La discriminación semántica positivo/adverso está BLOQUEADA POR SEMÁNTICA, no superada.</p>
      </section>}
      <footer className="border-t border-border pt-4 text-xs text-muted-foreground">Master v1.0 · 31 packs v1.0.0 · Engine 0.2.0 preservados. REC-01 bloqueada. DEC-046 y SEM-QA-01 sin reapertura.</footer>
    </div>
  );
}