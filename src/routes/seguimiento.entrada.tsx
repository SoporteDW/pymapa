import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, Bell, CalendarClock, LineChart, MessageCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { LoadingState } from "@/components/ui/loading-state";
import { BloqueoEtapa } from "@/components/journey/bloqueo-etapa";
import { TarjetaEntregable } from "@/components/entregables/tarjeta-entregable";
import { entregablePorId } from "@/lib/entregables/catalogo";
import { useJourney } from "@/hooks/use-journey";
import { useHitosJourney } from "@/hooks/use-hitos-journey";
import { useSeguimiento } from "@/hooks/use-seguimiento";

export const Route = createFileRoute("/seguimiento/entrada")({
  head: () => ({
    meta: [
      { title: "Etapa 4 · Seguir — pymapa" },
      {
        name: "description",
        content:
          "Plan de Seguimiento con hitos de 30, 60 y 90 días para comprobar si lo ejecutado produjo resultados.",
      },
      { property: "og:title", content: "Etapa 4 · Seguir — pymapa" },
      {
        property: "og:description",
        content:
          "Plan de Seguimiento con hitos de 30, 60 y 90 días para comprobar si lo ejecutado produjo resultados.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EntradaSeguirPage,
});

function EntradaSeguirPage() {
  const { hidratado, bloqueoDe } = useJourney();
  const { seguimientos } = useSeguimiento();
  const { marcar } = useHitosJourney();
  const bloqueo = bloqueoDe("seguir");
  const entregable = entregablePorId("plan-de-seguimiento");

  useEffect(() => {
    if (hidratado && !bloqueo) marcar("entradaSeguir");
  }, [hidratado, bloqueo, marcar]);

  if (!hidratado) return <LoadingState fullPage />;

  if (bloqueo) {
    return (
      <div className="space-y-6">
        <PageHeader
          titulo="Etapa 4 · Seguir"
          subtitulo="Comprobamos si lo ejecutado produjo resultados."
          migas={[{ label: "Inicio", to: "/inicio" }, { label: "Seguir" }]}
        />
        <BloqueoEtapa bloqueo={bloqueo} titulo="Todavía no hay nada que medir" />
      </div>
    );
  }

  const primero = seguimientos[0] ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Etapa 4 · Seguir"
        subtitulo="Empieza una dinámica distinta: ya no ejecutamos, ahora comprobamos."
        migas={[{ label: "Inicio", to: "/inicio" }, { label: "Seguir" }]}
      />

      <Card className="border-primary/25 bg-primary/5">
        <CardHeader className="space-y-2">
          <Badge variant="secondary" className="w-fit rounded-full">
            Cambia el tipo de trabajo
          </Badge>
          <CardTitle className="text-xl leading-snug">
            Lo que hiciste ahora tiene que demostrar resultados
          </CardTitle>
          <CardDescription>
            En las etapas anteriores respondiste y ejecutaste. En esta etapa el trabajo es corto pero
            constante: en tres momentos revisamos qué pasó con lo que cambiaste y decidimos si hay
            que ajustar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="lg" asChild>
            <Link to="/seguimiento">
              Ver mi Plan de Seguimiento
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="size-4 text-primary" aria-hidden="true" />
            Tus tres momentos de revisión
          </CardTitle>
          <CardDescription>
            {primero
              ? `Indicador que seguiremos: ${primero.indicador.nombre}.`
              : "Cuando validemos tu primera actividad, aquí aparecerán sus hitos."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {(primero?.hitos ?? []).map((hito) => (
            <div key={hito.id} className="rounded-[16px] border border-border bg-card p-4">
              <p className="text-sm font-semibold text-foreground">{hito.etiqueta}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {hito.solicitudes[0]?.titulo ?? `Revisión prevista: ${hito.fechaPrevista}`}
              </p>
            </div>
          ))}
          {!primero && (
            <>
              <Placeholder label="Día 30" detalle="Primera lectura: ¿se movió algo?" />
              <Placeholder label="Día 60" detalle="Confirmación: ¿el cambio se sostiene?" />
              <Placeholder label="Día 90" detalle="Decisión: ¿consolidamos o ajustamos?" />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Entre un momento y el siguiente no desaparecemos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p className="flex gap-2">
            <Bell className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            Te recordamos cuándo toca la próxima revisión y qué debes tener listo.
          </p>
          <p className="flex gap-2">
            <LineChart className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            Puedes registrar novedades en cualquier momento, no solo en los hitos.
          </p>
          <p className="flex gap-2">
            <MessageCircle className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            El asistente sigue disponible para explicarte qué significa cada resultado.
          </p>
        </CardContent>
      </Card>

      {entregable && <TarjetaEntregable entregable={entregable} />}
    </div>
  );
}

function Placeholder({ label, detalle }: { label: string; detalle: string }) {
  return (
    <div className="rounded-[16px] border border-dashed border-border p-4">
      <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detalle}</p>
    </div>
  );
}
