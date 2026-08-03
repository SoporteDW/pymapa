import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LoadingState } from "@/components/ui/loading-state";
import { DemoNote, DemoTag } from "@/components/ui/demo-note";
import { PageHeader } from "@/components/layout/page-header";
import { useSesion } from "@/hooks/use-sesion";
import { ArrowRight, Sparkles, Target, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/resultados/")({
  head: () => ({
    meta: [
      { title: "Resultados — Pyme Digital" },
      {
        name: "description",
        content: "Interpreta el estado digital de tu empresa y conoce tus prioridades.",
      },
      { property: "og:title", content: "Resultados — Pyme Digital" },
      {
        property: "og:description",
        content: "Interpreta el estado digital de tu empresa y conoce tus prioridades.",
      },
    ],
  }),
  component: ResultadosPage,
});

function ResultadosPage() {
  const navigate = useNavigate();
  const { sesion, isHydrated, cargarDatosDemostrativos } = useSesion();

  if (!isHydrated) {
    return <LoadingState fullPage />;
  }

  if (sesion.resultados.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          titulo="Resultados"
          subtitulo="Aquí interpretaremos tu estado digital cuando completes el diagnóstico."
          migas={[{ label: "Inicio", to: "/inicio" }, { label: "Resultados" }]}
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Todavía no hay resultados</CardTitle>
            <CardDescription>
              Los resultados se construyen a partir de tus respuestas. Puedes completar el
              diagnóstico o cargar datos demostrativos para conocer el recorrido.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => navigate({ to: "/diagnostico" })}>Iniciar diagnóstico</Button>
            <Button variant="outline" onClick={cargarDatosDemostrativos}>
              Cargar datos demostrativos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const global = Math.round(
    sesion.resultados.reduce((sum, r) => sum + r.puntajeDemostrativo, 0) / sesion.resultados.length
  );
  const fortalezas = sesion.resultados.flatMap((r) => r.fortalezas).slice(0, 3);
  const oportunidades = sesion.resultados.flatMap((r) => r.oportunidades).slice(0, 3);

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Tus resultados"
        subtitulo="Primero el significado, después el número: así puedes decidir con claridad."
        migas={[{ label: "Inicio", to: "/inicio" }, { label: "Resultados" }]}
        acciones={
          <Button variant="outline" asChild>
            <Link to="/diagnostico/revision">Revisar respuestas</Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumen ejecutivo</CardTitle>
          <CardDescription>
            Tu empresa ya tiene bases digitales visibles, sobre todo en la forma de llegar a los
            clientes. El mayor avance disponible está en ordenar la operación interna y en usar la
            información que ya generas para tomar decisiones.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">Nivel digital general</p>
                <DemoTag />
              </div>
              <p className="text-3xl font-bold text-foreground">{global} de 100</p>
              <p className="text-sm text-muted-foreground">Indicador ilustrativo</p>
            </div>
            <div className="flex-1 sm:max-w-sm">
              <Progress value={global} aria-label="Nivel digital general ilustrativo" />
            </div>
          </div>
        </CardContent>
      </Card>

      <section aria-labelledby="dimensiones" className="space-y-3">
        <h2 id="dimensiones" className="text-lg font-semibold text-foreground">
          Resultados por área
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sesion.resultados.map((resultado) => (
            <Card key={resultado.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{resultado.dimension}</CardTitle>
                  <Badge variant="secondary">{resultado.nivel}</Badge>
                </div>
                <CardDescription>{resultado.mensaje}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress
                  value={resultado.puntajeDemostrativo}
                  aria-label={`Nivel ilustrativo de ${resultado.dimension}`}
                />
                <Button variant="link" className="px-0" asChild>
                  <Link to="/resultados/$dimension" params={{ dimension: resultado.id }}>
                    Ver detalle
                    <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5 text-success" aria-hidden="true" />
              Lo que ya funciona
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {fortalezas.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-primary" aria-hidden="true" />
              Oportunidades de mejora
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {oportunidades.map((o) => (
                <li key={o} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  {o}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-5 w-5 text-primary" aria-hidden="true" />
            Tus tres prioridades
          </CardTitle>
          <CardDescription>Ordenadas por el efecto que pueden tener hoy.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {sesion.prioridades.map((prioridad, index) => (
              <li
                key={prioridad.id}
                className="flex items-start gap-3 rounded-lg border border-border p-3"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{prioridad.titulo}</p>
                  <p className="text-sm text-muted-foreground">{prioridad.razon}</p>
                  <Button variant="link" className="h-auto px-0 text-sm" asChild>
                    <Link to="/resultados/$dimension" params={{ dimension: prioridad.dimensionId }}>
                      Ver el área relacionada
                    </Link>
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Accordion type="single" collapsible className="rounded-xl border border-border bg-card px-4">
        <AccordionItem value="como-leer" className="border-none">
          <AccordionTrigger className="text-sm font-medium">
            Cómo leer estos resultados
          </AccordionTrigger>
          <AccordionContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Cada área describe una capacidad de tu empresa, no una calificación de tu trabajo. Un
              nivel bajo indica una oportunidad concreta, no un problema.
            </p>
            <p>
              El indicador general resume las cinco áreas y sirve para comparar tu avance contigo
              mismo en el tiempo, no con otras empresas.
            </p>
            <p>
              Las prioridades combinan el efecto esperado y el esfuerzo necesario. En esta versión
              son ilustrativas y se calcularán con reglas propias en un paquete posterior.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <DemoNote>
        Resultado ilustrativo para validar el recorrido. Las ponderaciones, niveles y
        recomendaciones definitivas se incorporarán en paquetes posteriores del MVP.
      </DemoNote>

      <div className="flex justify-end">
        <Button size="lg" asChild>
          <Link to="/plan-de-accion">
            Ver plan de acción
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
