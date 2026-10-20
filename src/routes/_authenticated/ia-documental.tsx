import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { interpretarDocumentoSemQa, decidirCorrespondenciaIA } from "@/lib/ia/interpretacion.functions";
import { getCapabilityContext, registerCapabilityEvidence } from "@/lib/production/capabilities.functions";
import { supabase } from "@/integrations/supabase/client";
import { SEM_QA_01_CORPUS, SEM_QA_EXECUTION_ID } from "@/lib/ia/sem-qa-corpus";

export const Route = createFileRoute("/_authenticated/ia-documental")({
  head: () => ({
    meta: [
      { title: "Lectura documental con IA · DG-01 · Pymapa" },
      { name: "description", content: "Prueba controlada: la IA propone correspondencias citadas entre un documento y DG-01 para revisión humana." },
      { property: "og:title", content: "Lectura documental con IA · Pymapa" },
      { property: "og:description", content: "Propuestas candidatas con cita y página, sujetas a revisión humana." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IaDocumental,
});

type Resultado = Extract<Awaited<ReturnType<typeof interpretarDocumentoSemQa>>, { ok: true }>;
type Decision = "PENDIENTE" | "ACEPTADA" | "RECHAZADA";

function IaDocumental() {
  const interpretar = useServerFn(interpretarDocumentoSemQa);
  const contexto = useServerFn(getCapabilityContext);
  const registrar = useServerFn(registerCapabilityEvidence);
  const [documentId, setDocumentId] = useState<string>(SEM_QA_01_CORPUS[0]!.documentId);
  const [estado, setEstado] = useState<"idle" | "leyendo" | "interpretando">("idle");
  const [error, setError] = useState<string | null>(null);
  const [res, setRes] = useState<Resultado | null>(null);
  const [decisiones, setDecisiones] = useState<Record<string, Decision>>({});
  const [errDec, setErrDec] = useState<Record<string, string>>({});
  const decidirFn = useServerFn(decidirCorrespondenciaIA);
  async function decidir(id: string, d: "ACEPTADA" | "RECHAZADA") {
    const mappingId = res?.persistencia?.mappingIds[id];
    if (!mappingId) return;
    const r = await decidirFn({ data: { mappingId, decision: d === "ACEPTADA" ? "VALIDATED" : "REJECTED" } });
    if (r.ok) setDecisiones((s) => ({ ...s, [id]: d }));
    else setErrDec((s) => ({ ...s, [id]: r.error }));
  }

  async function onFile(f: File) {
    setError(null);
    setRes(null);
    setDecisiones({});
    try {
      setEstado("leyendo");
      const ctx = (await contexto({ data: { capabilityId: "DG-01" } })) as { organizationId: string; assessmentId: string };
      const ruta = `${ctx.organizationId}/${ctx.assessmentId}/${crypto.randomUUID()}-${f.name}`;
      const up = await supabase.storage.from("evidence").upload(ruta, f, { upsert: false });
      if (up.error) throw new Error(up.error.message);
      const ev = (await registrar({ data: { capabilityId: "DG-01", candidateRef: null, evidenceType: "DOCUMENT", source: "DOCUMENT", storageBucket: "evidence", storagePath: ruta, externalReference: null, title: f.name, note: "SEM-QA-01 · SYNTHETIC_QA_ONLY", observationIds: [] } })) as { evidenceId?: string; id?: string };
      const evidenceId = ev.evidenceId ?? ev.id;
      if (!evidenceId) throw new Error("No se pudo registrar el documento.");
      setEstado("interpretando");
      const r = await interpretar({ data: { executionId: SEM_QA_EXECUTION_ID, documentId, evidenceId } });
      if (!r.ok) setError(r.error ?? "No se pudo interpretar el documento.");
      else setRes(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setEstado("idle");
    }
  }

  const props = res?.resultado?.verificadas ?? [];
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Lectura documental con IA · DG-01</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Prueba controlada. La IA propone; tú decides. Las propuestas se guardan como pendientes y nunca cuentan solas como respuesta del diagnóstico.
          Solo está habilitada la prueba sintética SEM-QA-01: el servidor rechaza, sin enviar nada a la IA, cualquier archivo que no sea uno de los cinco documentos sintéticos aprobados.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <label className="mb-3 block text-sm">
            Documento del corpus{" "}
            <select aria-label="Documento del corpus" className="border-input bg-background rounded border px-2 py-1" value={documentId} onChange={(e) => setDocumentId(e.target.value)}>
              {SEM_QA_01_CORPUS.map((d) => (<option key={d.documentId} value={d.documentId}>{d.documentId}</option>))}
            </select>
          </label>
          <input
            type="file"
            accept="application/pdf"
            aria-label="Cargar documento PDF"
            disabled={estado !== "idle"}
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
          {estado !== "idle" && (
            <p className="text-muted-foreground mt-3 text-sm">{estado === "leyendo" ? "Leyendo el documento…" : "La IA está leyendo el documento…"}</p>
          )}
          {error && <p className="text-destructive mt-3 text-sm">{error}</p>}
        </CardContent>
      </Card>

      {res?.ok && res.resultado && (
        <>
          <p className="text-sm">
            {props.length} propuestas con cita verificada · {res.resultado.descartadas.length} descartadas por no superar la verificación ·{" "}
            {res.resultado.necesidadesSinPropuesta.length} necesidades sin información en el documento
          </p>
          {res.resultado.contradicciones.map((c) => (
            <Card key={c.informationNeedRef}>
              <CardHeader><CardTitle className="text-base">Contradicción sin resolver · {c.informationNeedRef}</CardTitle><CardDescription>{c.descripcion}</CardDescription></CardHeader>
              <CardContent className="space-y-1 text-sm">{c.citas.map((x, i) => (<blockquote key={i} className="border-l-2 pl-3 italic">Pág. {x.pagina}: “{x.cita}”</blockquote>))}</CardContent>
            </Card>
          ))}
          {props.map((p) => {
            const d = decisiones[p.id] ?? "PENDIENTE";
            return (
              <Card key={p.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {p.informationNeedRef} · {p.informationNeedStatement}
                  </CardTitle>
                  <CardDescription>
                    Página {p.pagina} · {p.tipo} · {p.variableRefs.join(", ")} · <Badge variant="outline">Propuesta {d === "PENDIENTE" ? "pendiente" : d.toLowerCase()}</Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <blockquote className="border-l-2 pl-3 italic">“{p.cita}”</blockquote>
                  <p><strong>Lo que dice:</strong> {p.hechoInterpretado}</p>
                  <p className="text-muted-foreground"><strong>Por qué se relaciona:</strong> {p.justificacion}</p>
                  {(res.persistencia?.fragmentoCompartido[p.id]?.length ?? 0) > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Esta misma cita también se propone para{" "}
                      {res.persistencia!.fragmentoCompartido[p.id]!.map((o) => props.find((x) => x.id === o)?.informationNeedRef).join(", ")}. Cada propuesta se decide por separado.
                    </p>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" disabled={d !== "PENDIENTE" || !res.persistencia} variant={d === "ACEPTADA" ? "default" : "outline"} onClick={() => decidir(p.id, "ACEPTADA")}>Aceptar</Button>
                    <Button size="sm" disabled={d !== "PENDIENTE" || !res.persistencia} variant={d === "RECHAZADA" ? "destructive" : "outline"} onClick={() => decidir(p.id, "RECHAZADA")}>Rechazar</Button>
                  </div>
                  {errDec[p.id] && <p className="text-destructive text-xs">{errDec[p.id]}</p>}
                </CardContent>
              </Card>
            );
          })}
          <p className="text-muted-foreground text-xs">
            Las propuestas quedan guardadas como pendientes en tu empresa. Aceptar una propuesta no la convierte en respuesta del diagnóstico, no demuestra que la información sea suficiente y no cierra la capacidad.
          </p>
          {res.errorPersistencia && <p className="text-destructive text-sm">{res.errorPersistencia}</p>}
        </>
      )}
      {res && (
        <p className="text-muted-foreground text-xs">
          Modelo {res.traza.model} · prompt {res.traza.promptVersion} · {res.traza.packId}@{res.traza.packVersion} · ejecución {res.traza.runId ?? "—"} · tokens{" "}
          {res.traza.inputTokens ?? "—"}/{res.traza.outputTokens ?? "—"}
        </p>
      )}
    </div>
  );
}
