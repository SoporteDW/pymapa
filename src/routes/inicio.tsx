import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, BarChart3, ClipboardList, Sparkles } from "lucide-react";

export const Route = createFileRoute("/inicio")({
  head: () => ({
    meta: [
      { title: "Inicio — Pyme Digital" },
      { name: "description", content: "Bienvenida a Pyme Digital. Conoce tu situación digital y prioriza acciones concretas." },
      { property: "og:title", content: "Inicio — Pyme Digital" },
      { property: "og:description", content: "Bienvenida a Pyme Digital. Conoce tu situación digital y prioriza acciones concretas." },
    ],
  }),
  component: InicioPage,
});

function InicioPage() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-primary/5 p-6 sm:p-10">
        <div className="max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span>MVP Alfa</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Transforma tu pyme paso a paso
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Descubre el estado digital de tu empresa, identifica prioridades y construye un plan de acción simple y concreto.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/diagnostico">
                Comenzar diagnóstico
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button variant="outline" asChild size="lg">
              <Link to="/resultados">Ver resultados de ejemplo</Link>
            </Button>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-foreground">¿Qué puedes hacer aquí?</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <ClipboardList className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <CardTitle className="text-base">Diagnóstico guiado</CardTitle>
              <CardDescription>
                Responde preguntas simples sobre tu empresa y obtén una visión clara de tu situación digital.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="link" asChild className="px-0">
                <Link to="/diagnostico">Iniciar diagnóstico</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <CardTitle className="text-base">Resultados claros</CardTitle>
              <CardDescription>
                Visualiza fortalezas y oportunidades organizadas por áreas clave de tu negocio.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="link" asChild className="px-0">
                <Link to="/resultados">Ver resultados</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <CardTitle className="text-base">Plan de acción</CardTitle>
              <CardDescription>
                Convierte las prioridades en acciones concretas con impacto, esfuerzo y estado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="link" asChild className="px-0">
                <Link to="/plan-de-accion">Ver plan</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="rounded-lg border border-info/20 bg-info/5 p-4 text-sm text-info-foreground">
        <p>
          <strong>Nota:</strong> Los datos mostrados en este MVP Alfa son ilustrativos. El motor de diagnóstico y recomendaciones personalizadas se habilitará en etapas posteriores.
        </p>
      </div>
    </div>
  );
}
