/**
 * SPRINT-04-FIX · Ayuda del journey productivo. Ruta productiva: usa el shell
 * de producción. Solo describe funcionalidad implementada.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PageHeader } from "@/components/layout/page-header";

export const Route = createFileRoute("/ayuda")({
  head: () => ({
    meta: [
      { title: "Ayuda — cómo funciona tu diagnóstico pymapa" },
      { name: "description", content: "Cómo registrar tu empresa, responder capacidades, aportar evidencias y colaborar en pymapa." },
      { property: "og:title", content: "Ayuda — cómo funciona tu diagnóstico pymapa" },
      { property: "og:description", content: "Empresa, diagnóstico por capacidades, evidencias, colaboración y resultados preliminares." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AyudaPage,
});

export const SECCIONES_AYUDA = [
  {
    q: "¿Cómo registro mi empresa?",
    a: "Crea tu cuenta o inicia sesión y escribe el nombre de tu empresa. Se crea una sola organización para tu cuenta, con su caso de diagnóstico; al volver a entrar recuperas la misma.",
  },
  {
    q: "¿Cómo está organizado el diagnóstico?",
    a: "En seis dominios con 31 capacidades. Puedes entrar a cualquier capacidad desde el diagnóstico y avanzar en el orden que prefieras; el orden no altera el resultado.",
  },
  {
    q: "¿Qué son las respuestas y las evidencias?",
    a: "En cada capacidad respondes preguntas o requerimientos de información; también puedes indicar que no lo sabes o que no aplica. Las evidencias son documentos o referencias que respaldan una respuesta; los archivos se guardan de forma privada para tu organización.",
  },
  {
    q: "¿Puedo invitar a otras personas?",
    a: "Sí. Desde una capacidad puedes invitar a alguien con un alcance concreto (la capacidad, su dominio o un requerimiento). Esa persona solo puede responder dentro del alcance asignado y no pasa a ser miembro de tu organización.",
  },
  {
    q: "¿Se guarda mi progreso?",
    a: "Sí. Tus respuestas y evidencias se guardan en tu cuenta, no en este navegador. Puedes cerrar sesión y continuar desde otro dispositivo.",
  },
  {
    q: "¿Qué muestran los resultados?",
    a: "Por ahora los resultados son preliminares: muestran el estado de avance real de tus capacidades. El informe ejecutivo completo aún no está disponible.",
  },
] as const;

function AyudaPage() {
  return (
    <div className="space-y-6">
      <PageHeader titulo="Ayuda" subtitulo="Cómo funciona tu diagnóstico en pymapa." />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preguntas frecuentes</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible>
            {SECCIONES_AYUDA.map((s, i) => (
              <AccordionItem key={s.q} value={`p-${i}`}>
                <AccordionTrigger>{s.q}</AccordionTrigger>
                <AccordionContent>{s.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
      <div className="flex flex-wrap gap-2">
        <Button asChild><Link to="/diagnostico-productivo">Ir a mi diagnóstico</Link></Button>
        <Button asChild variant="outline"><Link to="/demostracion">Ver la demostración (Moda Origen)</Link></Button>
      </div>
    </div>
  );
}
