/**
 * PYM-NOV-MVP31 · Escenario B · Expediente documental de empresa.
 * Carga única de documentos → lectura literal → propuestas transversales a las
 * 31 capacidades → confirmación humana agrupada → preguntas pendientes.
 * Coincidencia léxica ≠ suficiencia: nada se responde sin confirmación.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { DOMINIOS } from "@/components/diagnostico/catalogo-capacidades";
import { confirmExpedienteProposals, getExpediente, registerCapabilityEvidence } from "@/lib/production/capabilities.functions";

export const Route = createFileRoute("/_authenticated/expediente")({
  head: () => ({
    meta: [
      { title: "Expediente documental — pymapa" },
      { name: "description", content: "Carga los documentos de tu empresa una vez y revisa las respuestas propuestas para las 31 capacidades." },
      { property: "og:title", content: "Expediente documental — pymapa" },
      { property: "og:description", content: "Documentos de la empresa leídos contra las 31 capacidades, con citas verificables y confirmación humana." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Expediente,
});

type Datos = Awaited<ReturnType<typeof getExpediente>>;
type Propuesta = Datos["proposals"][number];
const clave = (p: { capabilityId: string; acquisitionId: string }) => `${p.capabilityId}::${p.acquisitionId}`;

function Cifra({ valor, etiqueta }: { valor: number | string; etiqueta: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="text-2xl font-semibold tabular-nums">{valor}</div>
      <div className="text-xs text-muted-foreground">{etiqueta}</div>
    </div>
  );
}

function Expediente() {
  const qc = useQueryClient();
  const leer = useServerFn(getExpediente);
  const registrar = useServerFn(registerCapabilityEvidence);
  const confirmar = useServerFn(confirmExpedienteProposals);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [soloAlta, setSoloAlta] = useState(false);

  const q = useQuery({ queryKey: ["expediente"], queryFn: () => leer(), staleTime: 60_000 });

  const cargar = useMutation({
    mutationFn: async () => {
      const d = q.data;
      if (!d) throw new Error("Expediente no disponible");
      for (const f of archivos) {
        const ruta = `${d.organizationId}/${d.assessmentId}/${crypto.randomUUID()}-${f.name.replace(/[^\w.\-]+/g, "_")}`;
        const { error } = await supabase.storage.from("evidence").upload(ruta, f, { upsert: false, contentType: "application/pdf" });
        if (error) throw new Error(error.message);
        await registrar({ data: { capabilityId: "DG-01", evidenceType: "DOCUMENT", source: "DOCUMENT", storageBucket: "evidence", storagePath: ruta, title: `Expediente · ${f.name}`, note: "Cargado en el expediente documental de empresa", observationIds: [] } });
      }
    },
    onSuccess: async () => {
      toast.success(`${archivos.length} documento(s) cargados`, { description: "Leyendo contra las 31 capacidades…" });
      setArchivos([]);
      await qc.invalidateQueries({ queryKey: ["expediente"] });
    },
    onError: (e: Error) => toast.error("No pudimos cargar los documentos", { description: e.message }),
  });

  const confirmarSel = useMutation({
    mutationFn: async (items: Propuesta[]) => {
      const porCap = new Map<string, Propuesta[]>();
      for (const p of items) porCap.set(p.capabilityId, [...(porCap.get(p.capabilityId) ?? []), p]);
      let ok = 0;
      let rechazadas = 0;
      for (const [capabilityId, lista] of porCap) {
        for (let i = 0; i < lista.length; i += 40) {
          const r = await confirmar({ data: { capabilityId, items: lista.slice(i, i + 40).map((p) => ({ acquisitionId: p.acquisitionId, evidenceId: p.evidenceId, fragmentId: p.fragmentId })) } });
          ok += r.confirmed;
          rechazadas += r.results.length - r.confirmed;
        }
      }
      return { ok, rechazadas };
    },
    onSuccess: async (r) => {
      toast.success(`${r.ok} respuestas confirmadas`, { description: r.rechazadas ? `${r.rechazadas} no se pudieron registrar.` : undefined });
      setSeleccion(new Set());
      await qc.invalidateQueries({ queryKey: ["expediente"] });
      await qc.invalidateQueries({ queryKey: ["hub-diagnostico"] });
    },
    onError: (e: Error) => toast.error("No pudimos confirmar", { description: e.message }),
  });

  const d = q.data;
  const visibles = useMemo(() => (d?.proposals ?? []).filter((p) => !soloAlta || p.match === "ALTA"), [d, soloAlta]);
  const porDominio = useMemo(() => {
    const m = new Map<string, Propuesta[]>();
    for (const p of visibles) {
      const dom = p.capabilityId.slice(0, 2);
      m.set(dom, [...(m.get(dom) ?? []), p]);
    }
    return m;
  }, [visibles]);

  const alternar = (k: string) => setSeleccion((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const marcarTodas = (lista: Propuesta[], v: boolean) => setSeleccion((s) => { const n = new Set(s); lista.forEach((p) => (v ? n.add(clave(p)) : n.delete(clave(p)))); return n; });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <PageHeader
        title="Expediente documental"
        description="Carga una sola vez los documentos de la empresa. Pymapa los lee contra las 31 capacidades y te propone respuestas con la cita exacta. Tú decides qué confirmar."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1 · Cargar documentos</CardTitle>
          <CardDescription>PDF con texto (no escaneado), hasta 30 páginas cada uno.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input aria-label="Documentos PDF" type="file" accept="application/pdf" multiple onChange={(e) => setArchivos([...(e.target.files ?? [])])} className="text-sm" />
          <Button disabled={!archivos.length || cargar.isPending || !d} onClick={() => cargar.mutate()}>
            {cargar.isPending ? "Cargando…" : `Cargar y leer ${archivos.length || ""}`}
          </Button>
        </CardContent>
      </Card>

      {q.isLoading && <LoadingState label="Leyendo documentos contra las 31 capacidades…" />}
      {q.error && <p className="text-sm text-destructive">No pudimos leer el expediente: {(q.error as Error).message}</p>}

      {d && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">2 · Lo que Pymapa encontró</CardTitle>
              <CardDescription>
                Coincidencia léxica entre la cita y la pregunta del paquete de conocimiento. No es una conclusión ni prueba suficiencia.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
                <Cifra valor={d.documents.length} etiqueta="Documentos leídos" />
                <Cifra valor={d.totals.acquisitions} etiqueta="Datos requeridos (31 capacidades)" />
                <Cifra valor={d.totals.answered} etiqueta="Ya respondidos" />
                <Cifra valor={d.totals.proposedHigh} etiqueta="Propuestas con coincidencia alta" />
                <Cifra valor={d.totals.proposedPartial} etiqueta="Propuestas parciales" />
                <Cifra valor={d.totals.withoutCoverage} etiqueta="Sin cobertura documental" />
              </div>
              <ul className="space-y-1 text-sm">
                {d.documents.map((doc) => (
                  <li key={doc.evidenceId} className="flex flex-wrap gap-2">
                    <span className="font-medium">{doc.title}</span>
                    {doc.error ? <Badge variant="destructive">No legible ({doc.error})</Badge> : <span className="text-muted-foreground">{doc.pages} pág. · {doc.fragments} fragmentos</span>}
                  </li>
                ))}
                {!d.documents.length && <li className="text-muted-foreground">Aún no hay documentos en el expediente.</li>}
              </ul>
            </CardContent>
          </Card>

          {d.proposals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">3 · Confirmar respuestas propuestas</CardTitle>
                <CardDescription>Al confirmar, la cita queda registrada como tu respuesta, con el documento como evidencia.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm"><Checkbox checked={soloAlta} onCheckedChange={(v) => setSoloAlta(Boolean(v))} /> Solo coincidencia alta</label>
                  <Button variant="outline" size="sm" onClick={() => marcarTodas(visibles, true)}>Seleccionar visibles ({visibles.length})</Button>
                  <Button variant="ghost" size="sm" onClick={() => setSeleccion(new Set())}>Limpiar</Button>
                  <Button size="sm" disabled={!seleccion.size || confirmarSel.isPending}
                    onClick={() => confirmarSel.mutate(d.proposals.filter((p) => seleccion.has(clave(p))))}>
                    {confirmarSel.isPending ? "Confirmando…" : `Confirmar ${seleccion.size} seleccionadas`}
                  </Button>
                </div>
                {DOMINIOS.filter((dom) => porDominio.has(dom.id)).map((dom) => {
                  const lista = porDominio.get(dom.id)!;
                  return (
                    <details key={dom.id} className="rounded-xl border border-border" open>
                      <summary className="flex cursor-pointer items-center justify-between gap-2 p-3 text-sm font-medium">
                        <span>{dom.nombre} · {lista.length} propuestas</span>
                        <Button variant="link" size="sm" onClick={(e) => { e.preventDefault(); marcarTodas(lista, true); }}>Seleccionar dominio</Button>
                      </summary>
                      <ul className="divide-y divide-border">
                        {lista.map((p) => (
                          <li key={clave(p)} className="flex gap-3 p-3">
                            <Checkbox aria-label={`Confirmar ${p.capabilityId} ${p.acquisitionId}`} checked={seleccion.has(clave(p))} onCheckedChange={() => alternar(clave(p))} className="mt-1" />
                            <div className="min-w-0 space-y-1 text-sm">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline">{p.capabilityId}</Badge>
                                <Badge variant={p.match === "ALTA" ? "default" : "secondary"}>{p.match === "ALTA" ? "Coincidencia alta" : "Coincidencia parcial"}</Badge>
                                <span className="font-medium">{p.label}</span>
                              </div>
                              <blockquote className="border-l-2 border-primary/40 pl-3 text-muted-foreground">“{p.quote}”</blockquote>
                              <p className="text-xs text-muted-foreground">{p.documentTitle} · pág. {p.page}{p.section ? ` · ${p.section}` : ""} · términos: {p.matchedTerms.join(", ")}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </details>
                  );
                })}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">4 · Lo que falta por responder</CardTitle>
              <CardDescription>Datos sin respuesta ni propuesta documental. Complétalos en cada capacidad.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {d.capabilities.filter((c) => c.pending.length > 0).map((c) => (
                <details key={c.capabilityId} className="rounded-lg border border-border">
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-3 text-sm">
                    <span><Badge variant="outline" className="mr-2">{c.capabilityId}</Badge>{c.name}</span>
                    <span className="text-muted-foreground">{c.answered}/{c.total} respondidos · {c.pending.length} pendientes</span>
                  </summary>
                  <div className="space-y-2 p-3 pt-0">
                    <ul className="list-disc space-y-1 pl-5 text-sm">
                      {c.pending.slice(0, 8).map((a) => <li key={a.acquisitionId}>{a.label}{a.closedOptions ? " (elegir opción)" : ""}</li>)}
                      {c.pending.length > 8 && <li className="text-muted-foreground">y {c.pending.length - 8} más…</li>}
                    </ul>
                    <Button asChild size="sm" variant="outline"><Link to="/capacidad/$id" params={{ id: c.capabilityId.toLowerCase() }}>Completar en {c.capabilityId}</Link></Button>
                  </div>
                </details>
              ))}
              {d.capabilities.every((c) => c.pending.length === 0) && <p className="text-sm text-muted-foreground">No quedan datos pendientes sin propuesta.</p>}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
