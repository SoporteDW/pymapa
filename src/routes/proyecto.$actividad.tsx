import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Banknote, Landmark } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DemoNote } from "@/components/ui/demo-note";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { useWorkspace } from "@/hooks/use-workspace";
import {
  clasificarIntervencion,
  entradaDeActividad,
  proyectoFinanciable,
} from "@/lib/intervencion/clasificacion";
import {
  ADVERTENCIA_INSTRUMENTOS,
  referenciasPara,
} from "@/lib/intervencion/instrumentos-financieros";

export const Route = createFileRoute("/proyecto/$actividad")({
  head: () => ({
    meta: [
      { title: "Proyecto potencialmente financiable — pymapa" },
      {
        name: "description",
        content:
          "Lectura de consulta: cómo una intervención diagnosticada puede estructurarse como proyecto de inversión para explorar instrumentos disponibles.",
      },
      { property: "og:title", content: "Proyecto potencialmente financiable — pymapa" },
      {
        property: "og:description",
        content:
          "Proyección de la información que Pymapa ya conoce sobre una intervención: problema, resultado, componentes, horizonte e indicadores.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProyectoFinanciablePage,
});

function ProyectoFinanciablePage() {
  const { actividad: actividadId } = Route.useParams();
  const { actividad, hidratado } = useWorkspace(actividadId);

  if (!hidratado) return <LoadingState fullPage />;

  const entrada = actividad ? entradaDeActividad(actividad) : null;
  const ruta = entrada ? clasificarIntervencion(entrada) : null;
  const proyecto = entrada && ruta ? proyectoFinanciable(entrada, ruta) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Proyecto potencialmente financiable"
        subtitulo="Vista de consulta · no modifica tu recorrido ni el estado de la Actividad."
        migas={[
          { label: "Inicio", to: "/inicio" },
          { label: "Plan de Acción", to: "/plan-de-accion" },
          { label: "Proyecto" },
        ]}
      />

      {!proyecto || !ruta ? (
        <EmptyState
          title="Esta Actividad no requiere estructurarse como proyecto"
          description="Puede ejecutarse con recursos internos y sin inversión prevista."
          icon={Banknote}
        />
      ) : (
        <>
          <Card>
            <CardHeader className="space-y-1.5">
              <Badge variant="secondary" className="w-fit rounded-full">
                Proyección · información ya existente en tu recorrido
              </Badge>
              <CardTitle className="text-xl leading-snug">{proyecto.proyecto}</CardTitle>
              <CardDescription>{proyecto.estado}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Bloque titulo="Problema que resuelve" texto={proyecto.problema} />
              <Bloque titulo="Resultado esperado" texto={proyecto.resultadoEsperado} />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Componentes
                </p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {proyecto.componentes.map((c) => (
                    <Badge key={c} variant="outline" className="rounded-full">
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Bloque titulo="Inversión" texto={proyecto.inversion} />
                <Bloque titulo="Horizonte" texto={proyecto.horizonte} />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Indicadores
                </p>
                <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                  {proyecto.indicadores.map((i) => (
                    <li key={i}>· {i}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Landmark className="size-4 text-primary" aria-hidden="true" />
                Instrumentos a explorar
              </CardTitle>
              <CardDescription>
                Por las características de esta intervención, la empresa podría explorar
                instrumentos orientados a productividad, transformación digital o modernización
                empresarial.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {referenciasPara(ruta.tipos).map((ref) => (
                <div key={ref.id} className="rounded-[14px] border border-border p-3">
                  <p className="text-sm font-semibold text-foreground">
                    {ref.entidad} — {ref.nombre}
                  </p>
                  <p className="text-sm text-muted-foreground">{ref.orientacion}</p>
                </div>
              ))}
              <DemoNote>{ADVERTENCIA_INSTRUMENTOS}</DemoNote>
            </CardContent>
          </Card>
        </>
      )}

      <Button variant="outline" asChild>
        <Link to="/plan-de-accion/workspace/$actividad" params={{ actividad: actividadId }}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver a la Actividad
        </Link>
      </Button>
    </div>
  );
}

function Bloque({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{titulo}</p>
      <p className="mt-0.5 text-sm text-foreground">{texto}</p>
    </div>
  );
}
