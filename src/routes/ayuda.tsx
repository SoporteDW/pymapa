import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DemoNote } from "@/components/ui/demo-note";
import { PageHeader } from "@/components/layout/page-header";
import { etapas } from "@/lib/recorrido";

export const Route = createFileRoute("/ayuda")({
  head: () => ({
    meta: [
      { title: "Ayuda y guía del recorrido — Pyme Digital" },
      {
        name: "description",
        content: "Entiende las cinco etapas del recorrido y qué esperar del MVP Alfa.",
      },
      { property: "og:title", content: "Ayuda y guía del recorrido — Pyme Digital" },
      {
        property: "og:description",
        content: "Entiende las cinco etapas del recorrido y qué esperar del MVP Alfa.",
      },
    ],
  }),
  component: AyudaPage,
});

const preguntas = [
  {
    q: "¿Cuánto tiempo toma el diagnóstico?",
    a: "Entre 10 y 15 minutos. Puedes pausar en cualquier momento: tus respuestas se guardan automáticamente en este navegador y podrás continuar donde quedaste.",
  },
  {
    q: "¿Necesito conocimientos técnicos?",
    a: "No. Todas las preguntas están escritas en lenguaje de negocio y cada una incluye una ayuda breve con ejemplos.",
  },
  {
    q: "¿Qué pasa si no sé responder una pregunta?",
    a: "Puedes elegir la opción que más se acerque a tu realidad o dejarla para el final. En la etapa de revisión verás qué preguntas quedaron pendientes.",
  },
  {
    q: "¿Dónde se guarda mi información?",
    a: "En esta versión Alfa, toda la información se guarda únicamente en el almacenamiento local de tu navegador. No se envía a ningún servidor y no se comparte con terceros.",
  },
  {
    q: "¿Los resultados son definitivos?",
    a: "No. Los resultados, niveles y acciones que ves son ilustrativos y sirven para validar el recorrido. El motor de evaluación real se incorporará en paquetes posteriores del MVP.",
  },
  {
    q: "¿Puedo repetir el diagnóstico?",
    a: "Sí. Puedes revisar y modificar tus respuestas antes de generar resultados, y reiniciar todo el progreso desde tu perfil.",
  },
];

function AyudaPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Ayuda"
        subtitulo="Cómo funciona el recorrido y qué esperar de esta versión."
        migas={[{ label: "Inicio", to: "/inicio" }, { label: "Ayuda" }]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Las cinco etapas del recorrido</CardTitle>
          <CardDescription>
            El modelo avanza de forma ordenada: cada etapa habilita la siguiente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            {etapas.map((etapa, index) => (
              <li key={etapa.id} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{etapa.titulo}</p>
                  <p className="text-sm text-muted-foreground">{etapa.descripcion}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preguntas frecuentes</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible>
            {preguntas.map((item, index) => (
              <AccordionItem key={item.q} value={`faq-${index}`}>
                <AccordionTrigger className="text-left text-sm font-medium">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sobre esta versión (MVP Alfa)</CardTitle>
          <CardDescription>
            Esta es una versión de validación: el recorrido completo es navegable, pero los
            contenidos, cálculos y recomendaciones son demostrativos. No la uses como asesoría
            definitiva para decisiones de inversión.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row">
          <Button asChild>
            <Link to="/diagnostico">Ir al diagnóstico</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/perfil">Revisar mi perfil</Link>
          </Button>
        </CardContent>
      </Card>

      <DemoNote>
        Los canales de soporte, la documentación ampliada y los materiales de acompañamiento se
        incorporarán en paquetes posteriores.
      </DemoNote>
    </div>
  );
}
