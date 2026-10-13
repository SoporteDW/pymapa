/**
 * UX-PROD-FIX-02 · Avance real del diagnóstico (no es PKG-03).
 * Solo métricas contables desde registros persistidos: sin porcentajes de
 * madurez ni de completitud, sin ranking ni prioridad.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { DOMINIOS, ETIQUETA_ESTADO } from "@/components/diagnostico/catalogo-capacidades";
import { getDiagnosticHub } from "@/lib/production/capabilities.functions";

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

function Dato({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-2xl font-semibold">{valor}</p>
      <p className="text-xs text-muted-foreground">{etiqueta}</p>
    </div>
  );
}

function ResultadosProductivos() {
  const cargar = useServerFn(getDiagnosticHub);
  const hub = useQuery({ queryKey: ["hub-diagnostico"], queryFn: () => cargar() });

  if (hub.isLoading) return <LoadingState message="Calculando tu avance…" />;
  if (hub.error || !hub.data) return <p className="p-6 text-sm text-destructive">No pudimos cargar tu avance. Intenta de nuevo.</p>;

  const caps = hub.data.capabilities;
  const suma = (f: (c: (typeof caps)[number]) => number) => caps.reduce((n, c) => n + f(c), 0);
  const iniciadas = caps.filter((c) => (c.counts?.answered ?? 0) > 0);
  const aclarar = caps.filter((c) => c.interactionState === "NEEDS_CLARIFICATION");
  const t = hub.data.totals;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <PageHeader
        titulo="Avance del diagnóstico"
        subtitulo="Lo que realmente se ha registrado hasta hoy. No es una calificación ni un porcentaje de madurez."
        acciones={<Button asChild variant="outline"><Link to="/diagnostico-productivo">Ir al diagnóstico</Link></Button>}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Dato valor={iniciadas.length} etiqueta={`capacidades con actividad (de ${caps.length})`} />
        <Dato valor={t.responsesActive} etiqueta="respuestas vigentes" />
        <Dato valor={suma((c) => c.counts?.pendingQuestions ?? 0)} etiqueta="preguntas sin responder" />
        <Dato valor={suma((c) => c.counts?.pendingInformationTasks ?? 0)} etiqueta="requerimientos de información pendientes" />
        <Dato valor={suma((c) => c.counts?.contradictions ?? 0)} etiqueta="puntos por aclarar" />
        <Dato valor={t.evidenceUploaded} etiqueta="documentos cargados" />
        <Dato valor={t.evidenceLinked} etiqueta="documentos vinculados a respuestas" />
        <Dato valor={suma((c) => c.findingsCount)} etiqueta="hallazgos preliminares (por revisar)" />
      </div>

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
                        ? `${c.counts.answered} resp. · ${c.counts.pendingQuestions} preg. · ${c.counts.pendingInformationTasks} req.`
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
