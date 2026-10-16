import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { extraerPdf, mensajeErrorExtraccion, ExtraccionError } from "@/lib/document-first/pdf-texto";
import { interpretarDocumentoDG01, decidirCorrespondenciaIA } from "@/lib/ia/interpretacion.functions";

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

type Resultado = Awaited<ReturnType<typeof interpretarDocumentoDG01>>;
type Decision = "PENDIENTE" | "ACEPTADA" | "RECHAZADA";

function IaDocumental() {
  const interpretar = useServerFn(interpretarDocumentoDG01);
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
      const doc = await extraerPdf(new Uint8Array(await f.arrayBuffer()));
      const paginas = Object.entries(doc.textoPorPagina).map(([p, texto]) => ({ pagina: Number(p), texto }));
      setEstado("interpretando");
      const r = await interpretar({ data: { paginas, titulo: f.name } });
      if (!r.ok) setError(r.error ?? "No se pudo interpretar el documento.");
      setRes(r);
    } catch (e) {
      setError(e instanceof ExtraccionError ? mensajeErrorExtraccion(e.codigo) : e instanceof Error ? e.message : "Error inesperado");
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
          Usa solo documentos de prueba (PDF, máx. 5 páginas).
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
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
          {props.map((p) => {
            const d = decisiones[p.id] ?? "PENDIENTE";
            return (
              <Card key={p.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {p.informationNeedRef} · {p.informationNeedStatement}
                  </CardTitle>
                  <CardDescription>
                    Página {p.pagina} · {p.variableRefs.join(", ")} · <Badge variant="outline">Propuesta {d === "PENDIENTE" ? "pendiente" : d.toLowerCase()}</Badge>
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
          {"errorPersistencia" in res && res.errorPersistencia && <p className="text-destructive text-sm">{res.errorPersistencia}</p>}
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
