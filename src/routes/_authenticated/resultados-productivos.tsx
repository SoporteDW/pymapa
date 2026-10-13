/**
 * UX-PROD-FIX-02 · Avance real del diagnóstico (no es PKG-03).
 * Solo métricas contables desde registros persistidos: sin porcentajes de
 * madurez ni de completitud, sin ranking ni prioridad.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { DOMINIOS, ETIQUETA_ESTADO } from "@/components/diagnostico/catalogo-capacidades";
import { getCapabilityCollaboration, getDiagnosticHub } from "@/lib/production/capabilities.functions";

export const Route = createFileRoute("/_authenticated/resultados-productivos")({
  head: () => ({
    meta: [
      { title: "Avance del diagnóstico — pymapa" },
      { name: "description", content: "Avance real de tu diagnóstico pymapa por dominio y capacidad, con respuestas, aclaraciones y evidencias." },
      { property: "og:title", content: "Avance del diagnóstico — pymapa" },
      { property: "og:description", content: "Respuestas, aclaraciones y evidencias registradas en tu diagnóstico." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResultadosProductivos,
});

type Filtro = "actividad" | "respuestas" | "preguntas" | "requerimientos" | "aclarar" | "documentos" | "vinculados" | "hallazgos";

function Dato({ valor, etiqueta, activo, onClick }: { valor: number; etiqueta: string; activo: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`rounded-xl border p-3 text-left transition-colors hover:border-primary/50 ${activo ? "border-primary bg-primary/5" : "border-border"}`}
    >
      <p className="text-2xl font-semibold">{valor}</p>
      <p className="text-xs text-muted-foreground">{etiqueta}</p>
      <p className="mt-1 text-[11px] text-primary">{activo ? "Ocultar detalle" : "Ver detalle"}</p>
    </button>
  );
}

function DetalleDocumentos({ soloVinculados }: { soloVinculados: boolean }) {
  const cargar = useServerFn(getCapabilityCollaboration);
  // La colaboración de cualquier capacidad lista todos los documentos de la organización con su procedencia.
  const q = useQuery({ queryKey: ["documentos-organizacion"], queryFn: () => cargar({ data: { capabilityId: "DG-01" } }) });
  if (q.isLoading) return <p className="text-sm text-muted-foreground">Cargando documentos…</p>;
  if (!q.data) return <p className="text-sm text-destructive">No pudimos cargar los documentos.</p>;
  const docs = q.data.evidence.filter((e) => !soloVinculados || e.links.length > 0);
  if (docs.length === 0) return <p className="text-sm text-muted-foreground">No hay documentos en esta categoría.</p>;
  return (
    <ul className="space-y-2 text-sm">
      {docs.map((e) => (
        <li key={e.id} className="rounded-lg border border-border px-3 py-2">
          <span className="font-medium">{e.title ?? e.evidenceType}</span>
          <p className="text-xs text-muted-foreground">
            Cargado el {new Date(e.createdAt).toLocaleDateString("es")}
            {e.uploadedBy ? ` por ${e.uploadedBy}` : ""} · {e.uploadContextCapabilityId ? `desde ${e.uploadContextCapabilityId}` : "lugar de carga no registrado"}
          </p>
          <p className="text-xs text-muted-foreground">
            {e.links.length === 0
              ? "Sin asociar a ninguna respuesta"
              : `Asociado a respuestas de: ${[...new Set(e.links.map((l) => l.capabilityId))].join(", ")}`}
            {" · cargado no significa validado"}
          </p>
        </li>
      ))}
    </ul>
  );
}

function ResultadosProductivos() {
  const [filtro, setFiltro] = useState<Filtro | null>(null);
  const cargar = useServerFn(getDiagnosticHub);
  const hub = useQuery({ queryKey: ["hub-diagnostico"], queryFn: () => cargar() });

  if (hub.isLoading) return <LoadingState message="Calculando tu avance…" />;
  if (hub.error || !hub.data) return <p className="p-6 text-sm text-destructive">No pudimos cargar tu avance. Intenta de nuevo.</p>;

  const caps = hub.data.capabilities;
  const suma = (f: (c: (typeof caps)[number]) => number) => caps.reduce((n, c) => n + f(c), 0);
  const iniciadas = caps.filter((c) => (c.counts?.answered ?? 0) > 0);
  const aclarar = caps.filter((c) => c.interactionState === "NEEDS_CLARIFICATION");
  const t = hub.data.totals;
  const pct = caps.length ? Math.round((iniciadas.length / caps.length) * 100) : 0;
  const listas: Partial<Record<Filtro, { titulo: string; lista: typeof caps }>> = {
    actividad: { titulo: "Capacidades con actividad", lista: iniciadas },
    respuestas: { titulo: "Capacidades con respuestas vigentes", lista: iniciadas },
    preguntas: { titulo: "Capacidades con preguntas disponibles", lista: caps.filter((c) => (c.counts?.eligibleQuestions ?? 0) > 0) },
    requerimientos: { titulo: "Capacidades con requerimientos pendientes", lista: caps.filter((c) => (c.counts?.pendingInformationTasks ?? 0) > 0) },
    aclarar: { titulo: "Capacidades con aclaraciones pendientes", lista: caps.filter((c) => (c.counts?.contradictions ?? 0) > 0) },
    hallazgos: { titulo: "Capacidades con hallazgos preliminares", lista: caps.filter((c) => c.findingsCount > 0) },
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <PageHeader
        titulo="Avance del diagnóstico"
        subtitulo="Lo que realmente se ha registrado hasta hoy. No es una calificación ni un porcentaje de madurez."
        acciones={<Button asChild variant="outline"><Link to="/diagnostico-productivo">Ir al diagnóstico</Link></Button>}
      />

      <Card>
        <CardContent className="space-y-2 py-4">
          <p className="text-sm font-medium" data-testid="exploracion">
            {iniciadas.length} de {caps.length} capacidades abordadas · {pct} % del catálogo explorado
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Catálogo explorado">
            <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">Exploración del catálogo: capacidades con al menos una respuesta. No es el avance ni el cierre del diagnóstico.</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([
          ["actividad", iniciadas.length, `capacidades con actividad (de ${caps.length})`],
          ["respuestas", t.responsesActive, "respuestas vigentes"],
          ["preguntas", suma((c) => c.counts?.eligibleQuestions ?? 0), "preguntas disponibles ahora"],
          ["requerimientos", suma((c) => c.counts?.pendingInformationTasks ?? 0), "requerimientos de información pendientes"],
          ["aclarar", suma((c) => c.counts?.contradictions ?? 0), "puntos por aclarar"],
          ["documentos", t.evidenceUploaded, "documentos cargados"],
          ["vinculados", t.evidenceLinked, "documentos asociados a respuestas"],
          ["hallazgos", suma((c) => c.findingsCount), "hallazgos preliminares (por revisar)"],
        ] as [Filtro, number, string][]).map(([f, v, e]) => (
          <Dato key={f} valor={v} etiqueta={e} activo={filtro === f} onClick={() => setFiltro(filtro === f ? null : f)} />
        ))}
      </div>

      {filtro && (
        <Card data-testid="detalle-metrica">
          <CardHeader>
            <CardTitle className="text-base">
              {filtro === "documentos" ? "Documentos cargados" : filtro === "vinculados" ? "Documentos asociados a respuestas" : listas[filtro]!.titulo}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filtro === "documentos" || filtro === "vinculados" ? (
              <DetalleDocumentos soloVinculados={filtro === "vinculados"} />
            ) : listas[filtro]!.lista.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ninguna capacidad en esta categoría.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {listas[filtro]!.lista.map((c) => (
                  <li key={c.capabilityId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <Link to="/capacidad/$id" params={{ id: c.capabilityId }} className="min-w-0 flex-1 hover:text-primary">
                      <span className="text-xs text-muted-foreground">{c.capabilityId}</span> {c.name}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {c.counts ? `${c.counts.answered} resp. · ${c.counts.eligibleQuestions ?? 0} preg. · ${c.counts.pendingInformationTasks} req. · ${c.counts.contradictions ?? 0} aclar.` : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {aclarar.length > 0 && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Para continuar</CardTitle>
            <CardDescription>Sugerencia de navegación, no una prioridad del negocio: estas capacidades tienen información por aclarar.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {aclarar.map((c) => (
              <Button key={c.capabilityId} asChild size="sm" variant="outline">
                <Link to="/capacidad/$id" params={{ id: c.capabilityId }}>{c.capabilityId} · {c.name}</Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {DOMINIOS.map((d) => {
        const del = caps.filter((c) => c.domainId === d.id);
        if (del.length === 0) return null;
        return (
          <Card key={d.id}>
            <CardHeader>
              <CardTitle className="text-base">{d.id} · {d.nombre}</CardTitle>
              <CardDescription>
                {del.filter((c) => (c.counts?.answered ?? 0) > 0).length} de {del.length} capacidades con actividad
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border text-sm">
                {del.map((c) => (
                  <li key={c.capabilityId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <Link to="/capacidad/$id" params={{ id: c.capabilityId }} className="min-w-0 flex-1 hover:text-primary">
                      <span className="text-xs text-muted-foreground">{c.capabilityId}</span> {c.name}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {c.counts
                        ? `${c.counts.answered} resp. · ${c.counts.eligibleQuestions} preg. · ${c.counts.pendingInformationTasks} req.`
                        : "—"}
                    </span>
                    <Badge variant="outline" className="rounded-full text-[11px]">{ETIQUETA_ESTADO[c.interactionState] ?? c.interactionState}</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardContent className="space-y-1 py-4 text-xs text-muted-foreground">
          <p>Avance de respuestas, cobertura de evidencias, suficiencia del diagnóstico y cierre formal son cosas distintas; aquí solo se muestra lo primero y lo que hay registrado de evidencias.</p>
          <p>El informe ejecutivo y el plan de transformación todavía no están disponibles.</p>
        </CardContent>
      </Card>
    </div>
  );
}
