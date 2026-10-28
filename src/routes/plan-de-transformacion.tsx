/**
 * PYM-NOV-MVP31 · Plan de Transformación integral 6D/31C.
 * Consolida hallazgos institucionales CONFIRMED (OP-01/OP-02) y análisis
 * asistidos provisionales (DEC-053) con autoridad explícita y decisiones
 * empresariales trazables (aceptar, modificar, descartar).
 */
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { decidirPropuestaTransformacion, getTransformationPlan } from "@/lib/production/transformation-plan.functions";
import { ETIQUETA_CATEGORIA, type Categoria } from "@/lib/ia/analisis-asistido";
import type { PropuestaTransformacion } from "@/lib/production/transformation-plan";

const ETIQUETA_DOMINIO: Record<string, string> = {
  DG: "Dirección y Gobierno",
  OP: "Operaciones",
  PC: "Personas y Conocimiento",
  DT: "Datos y Tecnología",
  CM: "Comercial y Mercado",
  EC: "Economía y Finanzas",
};

const ETIQUETA_DECISION: Record<string, string> = {
  ACCEPTED: "Aceptada",
  MODIFIED: "Modificada",
  DISCARDED: "Descartada",
};

export const Route = createFileRoute("/plan-de-transformacion")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/acceso" });
  },
  head: () => ({
    meta: [
      { title: "Plan de Transformación — pymapa" },
      { name: "description", content: "Propuestas de acción trazables de las 31 capacidades, con autoridad explícita y decisión empresarial." },
      { property: "og:title", content: "Plan de Transformación — pymapa" },
      { property: "og:description", content: "Consolidación 6D/31C de hallazgos institucionales y análisis asistidos provisionales." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlanDeTransformacion,
});

function TarjetaPropuesta({ p, canDecide }: { p: PropuestaTransformacion; canDecide: boolean }) {
  const qc = useQueryClient();
  const decidir = useServerFn(decidirPropuestaTransformacion);
  const [nota, setNota] = useState("");
  const [modificada, setModificada] = useState("");
  const [editando, setEditando] = useState(false);
  const mut = useMutation({
    mutationFn: (decision: "ACCEPTED" | "MODIFIED" | "DISCARDED") =>
      decidir({ data: { proposalKey: p.key, decision, note, modifiedAction: decision === "MODIFIED" ? modificada : null } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plan-transformacion"] }),
  });

  return (
    <li>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{p.capabilityId}</Badge>
            {p.autoridad === "INSTITUTIONAL_FINDING" ? (
              <Badge>Hallazgo institucional</Badge>
            ) : (
              <Badge variant="secondary">Análisis asistido · provisional</Badge>
            )}
            {p.categoria && <Badge variant="outline">{ETIQUETA_CATEGORIA[p.categoria as Categoria] ?? p.categoria}</Badge>}
            {p.revisionHumana && <Badge variant="outline">Revisión: {p.revisionHumana}</Badge>}
            {p.decision && <Badge variant={p.decision.decision === "DISCARDED" ? "destructive" : "default"}>{ETIQUETA_DECISION[p.decision.decision]}</Badge>}
          </div>
          <CardTitle className="text-base">{p.titulo}</CardTitle>
          <CardDescription>
            {p.autoridad === "INSTITUTIONAL_FINDING"
              ? `Fuente: hallazgo ${p.fuente.findingRef} confirmado por el motor de conocimiento.`
              : `Fuente: análisis asistido ${p.fuente.contractVersion} · ${p.fuente.model}. No es un hallazgo institucional.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>{p.decision?.decision === "MODIFIED" && p.decision.modifiedAction ? p.decision.modifiedAction : p.accionPropuesta}</p>
          {p.cita && <p className="text-xs italic text-muted-foreground">“{p.cita}”</p>}
          {p.decision && <p className="text-xs text-muted-foreground">Decisión empresarial: {p.decision.note}</p>}
          {canDecide && !p.decision && (
            <div className="space-y-2 pt-1">
              <input
                aria-label="Nota de decisión"
                className="w-full rounded border bg-background px-2 py-1 text-xs"
                placeholder="Nota obligatoria de la decisión"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
              />
              {editando && (
                <textarea
                  aria-label="Acción modificada"
                  className="w-full rounded border bg-background px-2 py-1 text-xs"
                  placeholder="Texto de la acción modificada"
                  value={modificada}
                  onChange={(e) => setModificada(e.target.value)}
                />
              )}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={nota.trim().length < 3 || mut.isPending} onClick={() => mut.mutate("ACCEPTED")}>Aceptar</Button>
                <Button size="sm" variant="outline" disabled={nota.trim().length < 3 || mut.isPending || (editando && modificada.trim().length < 3)} onClick={() => (editando ? mut.mutate("MODIFIED") : setEditando(true))}>
                  Modificar
                </Button>
                <Button size="sm" variant="outline" disabled={nota.trim().length < 3 || mut.isPending} onClick={() => mut.mutate("DISCARDED")}>Descartar</Button>
              </div>
              {mut.isError && <p className="text-xs text-destructive">No pudimos registrar la decisión. Inténtalo de nuevo.</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </li>
  );
}

function PlanDeTransformacion() {
  const cargar = useServerFn(getTransformationPlan);
  const q = useQuery({ queryKey: ["plan-transformacion"], queryFn: () => cargar() });

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Plan de Transformación"
        subtitulo="Propuestas de acción de las 31 capacidades. Los hallazgos institucionales provienen del motor de conocimiento; los análisis asistidos son provisionales y siempre requieren tu decisión."
      />
      {q.isLoading && <LoadingState message="Cargando tu Plan de Transformación…" />}
      {q.isError && (
        <Card role="alert">
          <CardContent className="space-y-3 p-6">
            <p className="text-sm text-destructive">No pudimos cargar tu Plan de Transformación. Revisa tu conexión e inténtalo de nuevo.</p>
            <Button variant="outline" onClick={() => q.refetch()}>Reintentar</Button>
          </CardContent>
        </Card>
      )}
      {q.data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="plan-transformacion-resumen">
            <Card><CardContent className="p-4"><p className="text-2xl font-bold">{q.data.resumen.total}</p><p className="text-xs text-muted-foreground">Propuestas trazables</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-2xl font-bold">{q.data.resumen.institucionales}</p><p className="text-xs text-muted-foreground">Hallazgos institucionales</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-2xl font-bold">{q.data.resumen.asistidas}</p><p className="text-xs text-muted-foreground">Análisis asistidos (provisional)</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-2xl font-bold">{q.data.resumen.decididas}</p><p className="text-xs text-muted-foreground">Con decisión empresarial</p></CardContent></Card>
          </div>
          {q.data.resumen.total === 0 && (
            <Card data-testid="plan-transformacion-vacio">
              <CardContent className="space-y-3 p-6">
                <p className="font-medium">Todavía no hay propuestas de transformación.</p>
                <p className="text-sm text-muted-foreground">
                  Aparecen cuando el motor confirma hallazgos institucionales o cuando ejecutas el análisis asistido dentro de cada capacidad.
                </p>
                <Button asChild><Link to="/diagnostico-productivo">Ir al diagnóstico</Link></Button>
              </CardContent>
            </Card>
          )}
          {q.data.dominios.map((d) => {
            const total = d.capacidades.reduce((n, c) => n + c.propuestas.length, 0);
            if (!total) return null;
            return (
              <section key={d.domainId} className="space-y-3" data-testid={`dominio-${d.domainId}`}>
                <h2 className="text-lg font-semibold">{ETIQUETA_DOMINIO[d.domainId] ?? d.domainId} <Badge variant="outline">{total}</Badge></h2>
                {d.capacidades.filter((c) => c.propuestas.length > 0).map((c) => (
                  <div key={c.capabilityId} className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">{c.capabilityId} · {c.name}</h3>
                    <ul className="space-y-3">
                      {c.propuestas.map((p) => <TarjetaPropuesta key={p.key} p={p} canDecide={q.data.canDecide} />)}
                    </ul>
                  </div>
                ))}
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
