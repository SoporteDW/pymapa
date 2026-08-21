import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { TarjetaEntregable } from "@/components/entregables/tarjeta-entregable";
import { entregablePorId } from "@/lib/entregables/catalogo";

export const Route = createFileRoute("/diagnostico/listo")({
  head: () => ({
    meta: [
      { title: "Tu diagnóstico está listo — pymapa" },
      {
        name: "description",
        content:
          "Cerramos el diagnóstico: revisa qué hicimos, descarga tu Informe de Diagnóstico y pasa a las recomendaciones priorizadas.",
      },
      { property: "og:title", content: "Tu diagnóstico está listo — pymapa" },
      {
        property: "og:description",
        content:
          "Informe de Diagnóstico disponible y camino claro hacia las recomendaciones y el plan de acción.",
      },
    ],
  }),
  component: DiagnosticoListoPage,
});

const recorrido = [
  "Registramos el contexto de tu empresa para poder interpretar cada respuesta.",
  "Respondiste el cuestionario guiado sobre los seis dominios del modelo.",
  "Revisamos si la información alcanzaba y pedimos evidencias o aclaraciones donde faltaba.",
  "Profundizamos en la experiencia de compra de tu tienda en línea.",
  "Con todo eso construimos tu diagnóstico y ordenamos las prioridades.",
];

function DiagnosticoListoPage() {
  const informe = entregablePorId("diagnostico");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        titulo="Tu diagnóstico está listo"
        subtitulo="Esta es la primera conclusión formal del recorrido: sabemos en qué estado está tu empresa y por dónde conviene empezar."
        migas={[
          { label: "Inicio", to: "/inicio" },
          { label: "Diagnóstico", to: "/diagnostico" },
          { label: "Diagnóstico listo" },
        ]}
      />

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <CheckCircle2 className="size-5" aria-hidden="true" />
            <span className="text-xs font-medium uppercase tracking-wide">Etapa completada</span>
          </div>
          <CardTitle className="text-xl leading-snug">Qué hicimos para llegar aquí</CardTitle>
          <CardDescription>
            Nada de esto es automático a ciegas: cada conclusión viene de lo que declaraste y de las
            evidencias que aportaste.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm text-muted-foreground">
            {recorrido.map((linea, indice) => (
              <li key={linea} className="flex gap-3">
                <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {indice + 1}
                </span>
                <span>{linea}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {informe ? <TarjetaEntregable entregable={informe} /> : null}

      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="text-base">Lo que sigue</CardTitle>
          <CardDescription>
            El diagnóstico dice dónde estás. Las recomendaciones dicen qué hacer primero y por qué,
            y desde ahí se arma tu plan de acción.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild size="lg">
            <Link to="/resultados">
              Ver mis recomendaciones
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/diagnostico/cierre">Revisar evidencias y aclaraciones</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
