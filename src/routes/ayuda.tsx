import { createFileRoute } from "@tanstack/react-router";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle, Info, Sparkles } from "lucide-react";

export const Route = createFileRoute("/ayuda")({
  head: () => ({
    meta: [
      { title: "Ayuda — Pyme Digital" },
      { name: "description", content: "Guía de uso del prototipo Pyme Digital." },
      { property: "og:title", content: "Ayuda — Pyme Digital" },
      { property: "og:description", content: "Guía de uso del prototipo Pyme Digital." },
    ],
  }),
  component: AyudaPage,
});

const faqs = [
  {
    id: "q1",
    question: "¿Qué es Pyme Digital?",
    answer:
      "Pyme Digital es una plataforma autogestionada que acompaña a pequeñas y medianas empresas en su transformación digital, desde el diagnóstico hasta la ejecución de acciones concretas.",
  },
  {
    id: "q2",
    question: "¿Los resultados son definitivos?",
    answer:
      "No. En esta versión Alfa los resultados son ilustrativos. El motor de diagnóstico, ponderaciones y recomendaciones personalizadas se activarán en etapas posteriores.",
  },
  {
    id: "q3",
    question: "¿Dónde se guarda mi información?",
    answer:
      "Por ahora, la información se guarda localmente en tu navegador. No enviamos datos a servidores externos ni requerimos autenticación real.",
  },
  {
    id: "q4",
    question: "¿Qué puedo hacer en el MVP Alfa?",
    answer:
      "Puedes explorar el recorrido completo: Inicio, Diagnóstico estructural, Resultados simulados, Plan de acción simulado, Dashboard, Perfil y Ayuda. También puedes editar y guardar localmente los datos de tu empresa.",
  },
  {
    id: "q5",
    question: "¿Cómo reporto un problema?",
    answer:
      "En esta etapa puedes usar el feedback de la plataforma o compartir tus observaciones con el equipo de producto. La funcionalidad de soporte formal llegará más adelante.",
  },
];

function AyudaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ayuda</h1>
        <p className="text-sm text-muted-foreground">Orientación sobre el prototipo y el recorrido.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
            Sobre el MVP Alfa
          </CardTitle>
          <CardDescription>
            Esta versión construye la estructura base de la plataforma. La inteligencia artificial, el motor de conocimiento y la personalización de recomendaciones se integrarán en los próximos paquetes.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HelpCircle className="h-5 w-5 text-primary" aria-hidden="true" />
            Preguntas frecuentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq) => (
              <AccordionItem key={faq.id} value={faq.id}>
                <AccordionTrigger className="text-left text-sm font-medium">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <div className="rounded-lg border border-info/20 bg-info/5 p-4 text-sm text-info-foreground">
        <p className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Si encuentras enlaces rotos, botones sin respuesta o textos que no se entienden, anótalo. En el MVP Alfa buscamos una experiencia clara y sin fricciones.
          </span>
        </p>
      </div>
    </div>
  );
}
