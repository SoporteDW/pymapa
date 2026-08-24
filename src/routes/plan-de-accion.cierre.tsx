import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, CheckCircle2, FileCheck2, LifeBuoy, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { LoadingState } from "@/components/ui/loading-state";
import { BloqueoEtapa } from "@/components/journey/bloqueo-etapa";
import { TarjetaEntregable } from "@/components/entregables/tarjeta-entregable";
import { entregablePorId } from "@/lib/entregables/catalogo";
import { useJourney } from "@/hooks/use-journey";
import { useHitosJourney } from "@/hooks/use-hitos-journey";
import { useWorkspace } from "@/hooks/use-workspace";
import { useDelegacion } from "@/hooks/use-delegacion";
import { useApoyoHumano } from "@/hooks/use-apoyo-humano";

export const Route = createFileRoute("/plan-de-accion/cierre")({
  head: () => ({
    meta: [
      { title: "Cierre del Plan de Acción — pymapa" },
      {
        name: "description",
        content:
          "Resumen de lo ejecutado: actividades validadas, entregables producidos, colaboraciones y apoyo experto utilizado.",
      },
      { property: "og:title", content: "Cierre del Plan de Acción — pymapa" },
      {
        property: "og:description",
        content:
          "Resumen de lo ejecutado: actividades validadas, entregables producidos, colaboraciones y apoyo experto utilizado.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CierrePlanPage,
});

function CierrePlanPage() {
  const { hidratado, bloqueoDe, ejecucion } = useJourney();
  const { actividades } = useWorkspace();
  const { delegaciones } = useDelegacion();
  const { recomendaciones } = useApoyoHumano();
  const { marcar } = useHitosJourney();
  const bloqueo = bloqueoDe("actuar");
  const entregable = entregablePorId("plan-de-accion");

  const completo = ejecucion.total > 0 && ejecucion.completo;

  useEffect(() => {
    if (hidratado && completo) marcar("cierrePlan");
  }, [hidratado, completo, marcar]);

  if (!hidratado) return <LoadingState fullPage />;

  if (bloqueo) {
    return (
      <div className="space-y-6">
        <PageHeader
          titulo="Cierre del Plan de Acción"
          subtitulo="Resumen de lo ejecutado en la etapa Actuar."
          migas={[{ label: "Inicio", to: "/inicio" }, { label: "Cierre del plan" }]}
        />
        <BloqueoEtapa bloqueo={bloqueo} titulo="Todavía no hay ejecución que cerrar" />
      </div>
    );
  }

  const entregablesProducidos = actividades.flatMap((a) =>
    a.historial.filter((h) => h.revision.veredicto === "validado").map((h) => ({
      id: `${a.id}-${h.id}`,
      actividad: a.titulo,
      titulo: a.entregable.titulo,
      fecha: h.fecha,
    }))
  );

  const apoyosUsados = recomendaciones.filter((r) => r.estado !== "descartada");

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Cierre del Plan de Acción"
        subtitulo="Esto es lo que tu empresa ejecutó y validó en la etapa Actuar."
        migas={[
          { label: "Inicio", to: "/inicio" },
          { label: "Plan de Acción", to: "/plan-de-accion" },
          { label: "Cierre" },
        ]}
      />

      <Card className={completo ? "border-success/30 bg-success/5" : undefined}>
        <CardHeader className="space-y-2">
          <CardTitle className="flex items-center gap-2 text-xl leading-snug">
            <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
            {completo
              ? "Tus actividades iniciales quedaron validadas"
              : "Avance de tus actividades"}
          </CardTitle>
          <CardDescription>
            {completo
              ? "Cerraste el primer ciclo de ejecución. Ahora hay que comprobar en el tiempo si produjo resultados."
              : "Aún tienes actividades en curso. Puedes revisar este resumen en cualquier momento."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Dato valor={ejecucion.total} label="Actividades del plan" />
          <Dato valor={ejecucion.validadas} label="Validadas" />
          <Dato valor={entregablesProducidos.length} label="Entregables producidos" />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileCheck2 className="size-4 text-primary" aria-hidden="true" />
              Entregables producidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {entregablesProducidos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Todavía no hay entregables validados en este ciclo.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {entregablesProducidos.map((e) => (
                  <li key={e.id} className="rounded-[14px] border border-border p-3">
                    <p className="font-medium text-foreground">{e.titulo}</p>
                    <p className="text-xs text-muted-foreground">{e.actividad}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="size-4 text-primary" aria-hidden="true" />
                Colaboraciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              {delegaciones.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No pediste apoyo interno en este ciclo.
                </p>
              ) : (
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {delegaciones.map((d) => (
                    <li key={d.id}>
                      {d.nombre} · {d.tarea}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <LifeBuoy className="size-4 text-primary" aria-hidden="true" />
                Apoyo experto
              </CardTitle>
            </CardHeader>
            <CardContent>
              {apoyosUsados.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No fue necesario recurrir a un especialista.
                </p>
              ) : (
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {apoyosUsados.map((r) => (
                    <li key={r.id}>{r.origen.referenciaTitulo}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {entregable && <TarjetaEntregable entregable={entregable} />}

      <Card className="border-primary/25 bg-primary/5">
        <CardHeader className="space-y-1.5">
          <CardTitle className="text-lg">Lo ejecutado ahora debe medirse</CardTitle>
          <CardDescription>
            Comprobaremos en 30, 60 y 90 días si los cambios produjeron el resultado esperado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="lg" asChild>
            <Link to="/seguimiento/entrada">
              Crear Plan de Seguimiento
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Dato({ valor, label }: { valor: number; label: string }) {
  return (
    <div className="rounded-[16px] border border-border bg-card p-4">
      <p className="text-2xl font-bold text-foreground">{valor}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
