import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ClipboardCheck, Compass, ListChecks, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { BloqueoEtapa } from "@/components/journey/bloqueo-etapa";
import { LoadingState } from "@/components/ui/loading-state";
import { useJourney } from "@/hooks/use-journey";
import { useHitosJourney } from "@/hooks/use-hitos-journey";

export const Route = createFileRoute("/plan-de-accion/entrada")({
  head: () => ({
    meta: [
      { title: "Etapa 3 · Actuar — pymapa" },
      {
        name: "description",
        content:
          "Del diagnóstico a actividades concretas: cómo pymapa convierte los hallazgos en un plan priorizado de Actividades.",
      },
      { property: "og:title", content: "Etapa 3 · Actuar — pymapa" },
      {
        property: "og:description",
        content:
          "Del diagnóstico a actividades concretas: cómo pymapa convierte los hallazgos en un plan priorizado de Actividades.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EntradaActuarPage,
});

const mecanica = [
  {
    icono: Target,
    titulo: "Cada Actividad nace de un hallazgo",
    detalle:
      "No inventamos tareas: cada Actividad responde a algo que encontramos en tu diagnóstico y explica por qué importa.",
  },
  {
    icono: Compass,
    titulo: "Vienen ordenadas por prioridad",
    detalle:
      "Primero lo que produce resultado más rápido y habilita lo siguiente. Tú decides el ritmo, nosotros el orden sugerido.",
  },
  {
    icono: ClipboardCheck,
    titulo: "Se trabajan con un instrumento guiado",
    detalle:
      "Dentro de cada Actividad encontrarás la guía paso a paso y el entregable que debes producir.",
  },
  {
    icono: ListChecks,
    titulo: "Se cierran con una validación",
    detalle:
      "Cuando entregas, revisamos contra criterios claros. Si algo falta, te decimos exactamente qué ajustar.",
  },
];

function EntradaActuarPage() {
  const { hidratado, bloqueoDe } = useJourney();
  const { marcar } = useHitosJourney();
  const bloqueo = bloqueoDe("actuar");

  // Los hitos no se marcan por visitar la URL: solo cuando el usuario decide
  // entrar a su Plan de Acción.
  const entrarAlPlan = () => marcar("entradaActuar");

  if (!hidratado) return <LoadingState fullPage />;


  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Etapa 3 · Actuar"
        subtitulo="Del diagnóstico a actividades concretas."
        migas={[{ label: "Inicio", to: "/inicio" }, { label: "Actuar" }]}
      />

      {bloqueo ? (
        <BloqueoEtapa bloqueo={bloqueo} titulo="Todavía no podemos construir tu Plan de Acción" />
      ) : (
        <>
          <Card className="border-primary/25 bg-primary/5">
            <CardHeader className="space-y-2">
              <Badge variant="secondary" className="w-fit rounded-full">
                Tu diagnóstico está cerrado
              </Badge>
              <CardTitle className="text-xl leading-snug">
                Convertimos tus hallazgos en un conjunto priorizado de Actividades
              </CardTitle>
              <CardDescription>
                Hasta ahora entendimos dónde estás. A partir de aquí el trabajo cambia: dejamos de
                preguntar y empezamos a ejecutar, una Actividad a la vez.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="lg" asChild onClick={entrarAlPlan}>
                <Link to="/plan-de-accion">
                  Ver mi Plan de Acción
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            {mecanica.map(({ icono: Icono, titulo, detalle }) => (
              <Card key={titulo}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icono className="size-4 text-primary" aria-hidden="true" />
                    {titulo}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{detalle}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Dos palabras que usaremos siempre</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                <span className="font-semibold text-foreground">Actividad:</span> la unidad de
                trabajo que te recomendamos ejecutar.
              </p>
              <p>
                <span className="font-semibold text-foreground">Ficha de Actividad:</span> la guía
                con la que la comprendes y la ejecutas.
              </p>
              <p>
                El <span className="font-semibold text-foreground">Roadmap</span> muestra estas
                mismas Actividades en el tiempo: es una vista, no otro plan.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
