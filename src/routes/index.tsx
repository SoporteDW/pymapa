import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Building2, PlayCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "pymapa — El recorrido que ordena la transformación de tu pyme" },
      {
        name: "description",
        content:
          "Pymapa te acompaña en ocho pasos: preparar, diagnosticar, profundizar, recomendar, actuar, validar, seguir y ajustar. Empieza con tu empresa o recorre un caso ya avanzado.",
      },
      {
        property: "og:title",
        content: "pymapa — El recorrido que ordena la transformación de tu pyme",
      },
      {
        property: "og:description",
        content:
          "Ocho pasos para pasar del diagnóstico a resultados verificables: evidencias, plan de acción, validación y seguimiento a 30, 60 y 90 días.",
      },
    ],
  }),
  component: EntradaPage,
});

const pasos = [
  {
    numero: 1,
    titulo: "Preparar",
    descripcion: "Registramos el contexto de tu empresa para interpretar todo lo demás.",
  },
  {
    numero: 2,
    titulo: "Diagnosticar",
    descripcion: "Respondes un cuestionario guiado y obtienes un resultado preliminar.",
  },
  {
    numero: 3,
    titulo: "Profundizar",
    descripcion: "Pedimos evidencias y aclaraciones donde la información no alcanza.",
  },
  {
    numero: 4,
    titulo: "Recomendar",
    descripcion: "Explicamos qué encontramos y qué conviene hacer primero, y por qué.",
  },
  {
    numero: 5,
    titulo: "Actuar",
    descripcion: "Cada recomendación se convierte en una actividad con instrucciones claras.",
  },
  {
    numero: 6,
    titulo: "Validar",
    descripcion: "Revisamos tu entregable y confirmamos si cumple los criterios acordados.",
  },
  {
    numero: 7,
    titulo: "Seguir",
    descripcion: "Medimos a 30, 60 y 90 días si la acción produjo el resultado esperado.",
  },
  {
    numero: 8,
    titulo: "Ajustar",
    descripcion: "Con lo aprendido decidimos si continuar, corregir o abrir un nuevo ciclo.",
  },
];

function EntradaPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <header className="space-y-4 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-primary">
          Modelo de transformación digital para pymes
        </p>
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
          Un asesor que te acompaña del diagnóstico a los resultados
        </h1>
        <p className="mx-auto max-w-3xl text-base text-muted-foreground">
          Pymapa no es un test ni un tablero de indicadores: es un recorrido guiado en ocho pasos.
          En cada paso sabes qué acabas de hacer, por qué te lo pedimos y qué viene después.
        </p>
      </header>

      <section aria-labelledby="recorrido" className="space-y-4">
        <h2 id="recorrido" className="text-lg font-semibold text-foreground">
          Así funciona el recorrido
        </h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {pasos.map((paso) => (
            <li
              key={paso.numero}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {paso.numero}
              </span>
              <p className="mt-3 text-sm font-semibold text-foreground">{paso.titulo}</p>
              <p className="mt-1 text-sm text-muted-foreground">{paso.descripcion}</p>
            </li>
          ))}
        </ol>
        <p className="text-sm text-muted-foreground">
          Al final del recorrido tendrás tres documentos: el Informe de Diagnóstico, el Plan de
          Acción y el Plan de Seguimiento.
        </p>
      </section>

      <section aria-labelledby="como-empezar" className="space-y-4">
        <h2 id="como-empezar" className="text-lg font-semibold text-foreground">
          ¿Cómo quieres empezar?
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="flex flex-col border-primary/40">
            <CardHeader className="space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <Building2 className="size-5" aria-hidden="true" />
                <span className="text-xs font-medium uppercase tracking-wide">Tu empresa</span>
              </div>
              <CardTitle className="text-xl">Comenzar desde cero</CardTitle>
              <CardDescription>
                Ideal si quieres recorrer el modelo con la información real de tu pyme. Empiezas por
                el perfil y avanzas paso a paso; puedes guardar y continuar después.
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button asChild size="lg" className="w-full">
                <Link to="/perfil">
                  Iniciar mi recorrido
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <PlayCircle className="size-5" aria-hidden="true" />
                <span className="text-xs font-medium uppercase tracking-wide">
                  Caso demostrativo
                </span>
              </div>
              <CardTitle className="text-xl">Continuar con Moda Origen</CardTitle>
              <CardDescription>
                Una tienda de ropa que ya hizo su diagnóstico, entregó evidencias, ejecutó una
                acción y está midiendo resultados. Verás el modelo completo en pocos minutos, con
                datos simulados.
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto space-y-2">
              <Button asChild size="lg" variant="outline" className="w-full">
                <Link to="/moda-origen">
                  Ver qué ya pasó en Moda Origen
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground">
                Tu información real queda respaldada y se restaura al salir de la demostración.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
