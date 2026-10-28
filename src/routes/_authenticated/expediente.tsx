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
import { confirmExpedienteBatch, getExpediente, registerCapabilityEvidence } from "@/lib/production/capabilities.functions";
import { clasificarSuficiencia, resumenSuficiencia, VERSION_SUFICIENCIA } from "@/lib/production/expediente-suficiencia";

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
  const confirmar = useServerFn(confirmExpedienteBatch);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [soloAlta, setSoloAlta] = useState(false);
  const [agrupar, setAgrupar] = useState<"capacidad" | "seccion" | "documento">("capacidad");
  const [ultimo, setUltimo] = useState<{ ok: number; rechazadas: number; seconds: number; porCapacidad: [string, number][] } | null>(null);
  const [avance, setAvance] = useState({ done: 0, total: 0 });

  const q = useQuery({ queryKey: ["expediente"], queryFn: () => leer(), staleTime: 60_000 });

  const cargar = useMutation({
    mutationFn: async () => {
      const d = q.data;
      if (!d) throw new Error("Expediente no disponible");
      // Evita duplicados: un archivo con el mismo nombre ya cargado no se vuelve a subir.
      const existentes = new Set(d.documents.map((doc) => doc.title));
      const omitidos: string[] = [];
      let cargados = 0;
      for (const f of archivos) {
        if (existentes.has(`Expediente · ${f.name}`)) { omitidos.push(f.name); continue; }
        existentes.add(`Expediente · ${f.name}`);
        const ruta = `${d.organizationId}/${d.assessmentId}/${crypto.randomUUID()}-${f.name.replace(/[^\w.\-]+/g, "_")}`;
        const { error } = await supabase.storage.from("evidence").upload(ruta, f, { upsert: false, contentType: "application/pdf" });
        if (error) throw new Error(error.message);
        await registrar({ data: { capabilityId: "DG-01", evidenceType: "DOCUMENT", source: "DOCUMENT", storageBucket: "evidence", storagePath: ruta, title: `Expediente · ${f.name}`, note: "Cargado en el expediente documental de empresa", observationIds: [] } });
        cargados++;
      }
      return { cargados, omitidos };
    },
    onSuccess: async (r) => {
      toast.success(`${r.cargados} documento(s) cargados`, { description: r.omitidos.length ? `Ya estaban en el expediente y no se repitieron: ${r.omitidos.join(", ")}` : "Leyendo contra las 31 capacidades…" });
      setArchivos([]);
      await qc.invalidateQueries({ queryKey: ["expediente"] });
    },
    onError: (e: Error) => toast.error("No pudimos cargar los documentos", { description: e.message }),
  });

  const confirmarSel = useMutation({
    mutationFn: async (items: Propuesta[]) => {
      const inicio = performance.now();
      setAvance({ done: 0, total: items.length });
      let ok = 0;
      let rechazadas = 0;
      const rechazados = new Set<string>();
      // Dos lotes independientes; no más de una propuesta por adquisición.
      const lotes: Propuesta[][] = [];
      const capacidades = new Map<string, Propuesta[]>();
      items.forEach((p) => capacidades.set(p.capabilityId, [...(capacidades.get(p.capabilityId) ?? []), p]));
      for (const lista of capacidades.values()) for (let i = 0; i < lista.length; i += 20) lotes.push(lista.slice(i, i + 20));
      for (let i = 0; i < lotes.length; i += 4) {
        await Promise.all(lotes.slice(i, i + 4).map(async (lista) => {
          const r = await confirmar({ data: { items: lista.map((p) => ({ capabilityId: p.capabilityId, acquisitionId: p.acquisitionId, evidenceId: p.evidenceId, fragmentId: p.fragmentId })) } });
          ok += r.confirmed;
          rechazadas += r.results.length - r.confirmed;
          r.results.filter((x) => !x.accepted).forEach((x) => rechazados.add(clave(x)));
          setAvance((v) => ({ ...v, done: v.done + lista.length }));
        }));
      }
      const aceptadasPorCap = new Map<string, number>();
      items.filter((p) => !rechazados.has(clave(p))).forEach((p) => aceptadasPorCap.set(p.capabilityId, (aceptadasPorCap.get(p.capabilityId) ?? 0) + 1));
      return { ok, rechazadas, rechazados, porCapacidad: [...aceptadasPorCap.entries()], seconds: Math.round((performance.now() - inicio) / 100) / 10 };
    },
    onSuccess: async (r) => {
      toast.success(`${r.ok} respuestas confirmadas · ${r.seconds} s`, { description: r.rechazadas ? `${r.rechazadas} requieren revisión.` : undefined });
      setSeleccion(r.rechazados);
      setUltimo({ ok: r.ok, rechazadas: r.rechazadas, seconds: r.seconds, porCapacidad: r.porCapacidad });
      await qc.invalidateQueries({ queryKey: ["expediente"] });
      await qc.invalidateQueries({ queryKey: ["hub-diagnostico"] });
    },
    onError: (e: Error) => toast.error("No pudimos confirmar", { description: e.message }),
  });

  const d = q.data;
  const suficiencia = useMemo(() => {
    if (!d) return null;
    const claves = new Map<string, { capabilityId: string; acquisitionId: string }>();
    d.capabilities.forEach((c) => c.pending.forEach((a) => claves.set(`${c.capabilityId}::${a.acquisitionId}`, { capabilityId: c.capabilityId, acquisitionId: a.acquisitionId })));
    d.proposals.forEach((p) => claves.set(`${p.capabilityId}::${p.acquisitionId}`, { capabilityId: p.capabilityId, acquisitionId: p.acquisitionId }));
    return resumenSuficiencia(clasificarSuficiencia([...claves.values()], d.proposals));
  }, [d]);
  const visibles = useMemo(() => (d?.proposals ?? []).filter((p) => !soloAlta || p.match === "ALTA"), [d, soloAlta]);
  const porDominio = useMemo(() => {
    const m = new Map<string, Propuesta[]>();
    for (const p of visibles) {
      const dom = agrupar === "documento" ? p.evidenceId : agrupar === "seccion" ? `${p.documentTitle} · ${p.section ?? "Sin sección"}` : p.capabilityId;
      m.set(dom, [...(m.get(dom) ?? []), p]);
    }
    return m;
  }, [visibles, agrupar]);

  const alternar = (k: string) => setSeleccion((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const marcarTodas = (lista: Propuesta[], v: boolean) => setSeleccion((s) => { const n = new Set(s); lista.forEach((p) => (v ? n.add(clave(p)) : n.delete(clave(p)))); return n; });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <PageHeader
        titulo="Expediente documental"
        subtitulo="Carga una sola vez los documentos de la empresa. Pymapa los lee contra las 31 capacidades y te propone respuestas con la cita exacta. Tú decides qué confirmar."
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

      {q.isLoading && <LoadingState message="Leyendo documentos contra las 31 capacidades…" />}
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
              <div className="grid grid-cols-2 gap-3 md:grid-cols-7">
                <Cifra valor={d.documents.length} etiqueta="Documentos leídos" />
                <Cifra valor={d.totals.acquisitions} etiqueta="Datos requeridos (31 capacidades)" />
                <Cifra valor={Math.max(0, d.totals.withoutCoverage)} etiqueta="Faltan: sin respuesta ni cita" />
                <Cifra valor={d.totals.documentaryCandidateAcquisitions} etiqueta="Con alguna cita en tus documentos (no cambia al confirmar)" />
                <Cifra valor={d.totals.proposedAcquisitions} etiqueta="Propuestas por revisar (baja al confirmar)" />
                <Cifra valor={d.totals.documentaryConfirmedAcquisitions} etiqueta="Confirmadas por ti desde documentos (sube al confirmar)" />
                <Cifra valor={d.totals.answered} etiqueta="Respondidos en total (documentos + preguntas)" />
              </div>
              <p className="text-sm text-muted-foreground">Citas candidatas: {d.totals.documentaryCandidatePercent}% · {d.totals.proposedHigh} altas y {d.totals.proposedPartial} parciales pendientes · {d.totals.withoutCoverage} sin respuesta ni propuesta. Una cita candidata no acredita cobertura completa.</p>
              {suficiencia && (
                <div data-testid="suficiencia-documental" className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">Suficiencia documental de lo no respondido:</span>
                  <Badge variant="secondary">{suficiencia.PARCIAL} parciales (mención sin confirmar)</Badge>
                  <Badge variant="outline">{suficiencia.AUSENTE} ausentes</Badge>
                  {suficiencia.contradicciones > 0 && <Badge variant="destructive">{suficiencia.contradicciones} contradictorias (no se resuelven solas)</Badge>}
                  <span className="text-xs text-muted-foreground">({VERSION_SUFICIENCIA}; solo es suficiente lo que una persona confirma como respuesta a la necesidad aprobada, sin contradicciones)</span>
                </div>
              )}
              <ul className="space-y-1 text-sm">
                {d.documents.map((doc, i) => {
                  const repetido = d.documents.findIndex((x) => x.title === doc.title) < i;
                  return (
                    <li key={doc.evidenceId} className="flex flex-wrap gap-2">
                      <span className="font-medium">{doc.title}</span>
                      {repetido && <Badge variant="outline">Copia repetida · no suma cobertura</Badge>}
                      {doc.error ? <Badge variant="destructive">No legible ({doc.error})</Badge> : <span className="text-muted-foreground">{doc.pages} pág. · {doc.fragments} fragmentos</span>}
                    </li>
                  );
                })}
                {!d.documents.length && <li className="text-muted-foreground">Aún no hay documentos en el expediente.</li>}
              </ul>
            </CardContent>
          </Card>

          {ultimo && (
            <Card data-testid="resultado-confirmacion" className="border-primary">
              <CardHeader>
                <CardTitle className="text-base">Guardado: {ultimo.ok} respuestas registradas</CardTitle>
                <CardDescription>
                  Cada cita confirmada quedó guardada como tu respuesta, con el documento y la página como evidencia. Ya no aparecen como propuestas; puedes verlas o corregirlas en cada capacidad. Una respuesta confirmada no significa que la capacidad esté completa: lo que falte se te seguirá preguntando.
                  {ultimo.rechazadas > 0 && ` ${ultimo.rechazadas} no se guardaron porque el servidor no pudo verificar la cita; siguen seleccionadas para revisarlas.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {ultimo.porCapacidad.map(([cap, n]) => (
                  <Button key={cap} asChild size="sm" variant="outline"><Link to="/capacidad/$id" params={{ id: cap }}>{cap} · {n} guardadas · ver</Link></Button>
                ))}
                <Button size="sm" variant="ghost" onClick={() => setUltimo(null)}>Cerrar</Button>
              </CardContent>
            </Card>
          )}

          {d.proposals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">3 · Confirmar respuestas propuestas</CardTitle>
                <CardDescription>Revisa por capacidad: cada grupo reúne las citas que responderían preguntas de esa capacidad. Confirma solo las que realmente responden; las demás quedan pendientes y se te preguntarán en la capacidad. Nada se confirma automáticamente.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm"><Checkbox checked={soloAlta} onCheckedChange={(v) => setSoloAlta(Boolean(v))} /> Solo coincidencia alta</label>
                  <label className="flex items-center gap-2 text-sm">Agrupar por
                    <select aria-label="Agrupar propuestas" value={agrupar} onChange={(e) => setAgrupar(e.target.value as typeof agrupar)} className="rounded-md border border-input bg-background px-2 py-1 text-sm">
                      <option value="capacidad">Capacidad</option>
                      <option value="seccion">Tema del documento</option>
                      <option value="documento">Documento</option>
                    </select>
                  </label>
                  <Button variant="outline" size="sm" onClick={() => marcarTodas(visibles, true)}>Seleccionar visibles ({visibles.length})</Button>
                  <Button variant="ghost" size="sm" onClick={() => setSeleccion(new Set())}>Limpiar</Button>
                  <Button size="sm" disabled={!seleccion.size || confirmarSel.isPending}
                    onClick={() => confirmarSel.mutate(d.proposals.filter((p) => seleccion.has(clave(p))))}>
                    {confirmarSel.isPending ? `Confirmando ${avance.done}/${avance.total}…` : `Confirmar ${seleccion.size} seleccionadas`}
                  </Button>
                </div>
                {[...porDominio.entries()].map(([id, lista]) => {
                  const cap = d.capabilities.find((c) => c.capabilityId === id);
                  const nombre = agrupar === "documento" ? lista[0]?.documentTitle : agrupar === "seccion" ? id : `${id} · ${cap?.name ?? ""} — ${cap?.answered ?? 0}/${cap?.total ?? 0} respondidos`;
                  return (
                    <details key={id} className="rounded-lg border border-border" open={agrupar !== "capacidad"}>
                      <summary className="flex cursor-pointer items-center justify-between gap-2 p-3 text-sm font-medium">
                        <span>{nombre} · {lista.length} propuestas</span>
                        <Button variant="link" size="sm" onClick={(e) => { e.preventDefault(); marcarTodas(lista, true); }}>Seleccionar grupo</Button>
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
                      {c.pending.map((a) => <li key={a.acquisitionId}><span className="text-muted-foreground">{a.acquisitionId} · </span>{a.label}{a.closedOptions ? " (elegir opción)" : ""}</li>)}
                    </ul>
                    <Button asChild size="sm" variant="outline"><Link to="/capacidad/$id" params={{ id: c.capabilityId }}>Completar en {c.capabilityId}</Link></Button>
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
