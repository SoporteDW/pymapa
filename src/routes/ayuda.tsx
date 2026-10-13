/**
 * UX-PROD-FIX-02 · Ayuda práctica del journey productivo. Solo describe
 * funcionalidad implementada; no enlaza a la demo legacy.
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
      { name: "description", content: "Guía práctica: cómo empezar, responder, corregir, aclarar, aportar documentos, colaborar y leer tu avance en pymapa." },
      { property: "og:title", content: "Ayuda — cómo funciona tu diagnóstico pymapa" },
      { property: "og:description", content: "Guía práctica del diagnóstico pymapa para dueños y gerentes de pymes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AyudaPage,
});

export const SECCIONES_AYUDA = [
  {
    q: "¿Cómo empiezo?",
    a: "Crea tu cuenta, confirma tu correo y escribe el nombre de tu empresa. Después entras a «Diagnóstico». Tu cuenta tiene una sola empresa y siempre vuelves a la misma, desde cualquier dispositivo.",
  },
  {
    q: "¿Cómo me muevo por los seis dominios?",
    a: "El diagnóstico tiene 31 capacidades agrupadas en seis dominios: Dirección y Gobierno, Personas y Cultura, Operaciones y Procesos, Datos y Tecnología, Clientes y Mercado, y Ecosistema y Conexiones. Puedes entrar a cualquiera y en el orden que quieras.",
  },
  {
    q: "¿Por qué unas capacidades tienen preguntas y otras «requerimientos de información»?",
    a: "Cada capacidad viene de su propia metodología. Algunas tienen preguntas concretas que aparecen una a una. Otras piden información que describes con tus palabras («requerimientos de información») y que puedes atender en el orden que quieras. Por eso los contadores las muestran por separado.",
  },
  {
    q: "¿Cómo se guardan mis respuestas?",
    a: "Al pulsar «Guardar respuesta» queda registrada en tu cuenta, no en este navegador, y el estado se actualiza enseguida. Puedes responder que lo sabes, que no lo sabes por ahora o que no aplica (explicando por qué).",
  },
  {
    q: "¿Cómo reviso o corrijo una respuesta?",
    a: "Dentro de cada capacidad, en «Respuestas registradas», ves qué respondiste, cuándo y quién. Con «Corregir» registras la versión correcta. La respuesta anterior no se borra: queda marcada como corregida para que haya trazabilidad. Solo quien respondió o un administrador de la empresa puede corregir.",
  },
  {
    q: "¿Qué significa «Requiere aclaración»?",
    a: "Que hay información que se contradice: por ejemplo, una respuesta marcada como «hay versiones que se contradicen» o dos respuestas con valores distintos para el mismo dato. La capacidad te muestra exactamente cuáles son y te deja corregirlas. El estado cambia solo cuando el diagnóstico confirma que ya no hay contradicción.",
  },
  {
    q: "¿Cómo funcionan los documentos y evidencias?",
    a: "Puedes cargar documentos privados de tu empresa desde cualquier capacidad. Se ven en tres grupos: los vinculados a respuestas de esa capacidad, los cargados ahí que aún no vinculaste, y los demás documentos de la empresa que puedes reutilizar vinculándolos. Cargar o vincular un documento no lo valida ni da por cubierta la información: hoy pymapa no lee los documentos automáticamente.",
  },
  {
    q: "¿Cómo invito a alguien de mi equipo?",
    a: "Desde una capacidad puedes invitar a una persona a esa capacidad, a su dominio o a un requerimiento concreto. Solo podrá responder dentro de ese alcance y no podrá corregir respuestas de otros. El enlace de invitación lo compartes tú: hoy pymapa no envía correos de invitación.",
  },
  {
    q: "¿Qué significan los indicadores de avance?",
    a: "Son conteos reales: capacidades con actividad, respuestas, preguntas y requerimientos pendientes, puntos por aclarar y documentos. No son una nota de madurez ni un porcentaje de diagnóstico terminado. «Adquisiciones agotadas» significa que no quedan preguntas disponibles con lo que se sabe, no que la capacidad esté cerrada.",
  },
  {
    q: "¿Qué resultados hay disponibles hoy?",
    a: "En «Avance y resultados» ves tu avance por dominio y capacidad, y los hallazgos preliminares que el diagnóstico genere quedan pendientes de revisión humana. Todavía no están disponibles el informe ejecutivo, el plan de transformación ni la lectura automática de documentos.",
  },
] as const;

function AyudaPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <PageHeader titulo="Ayuda" subtitulo="Guía práctica para usar tu diagnóstico en pymapa." />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preguntas frecuentes</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible defaultValue="p-0">
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
        <Button asChild variant="outline"><Link to="/resultados-productivos">Ver mi avance</Link></Button>
      </div>
    </div>
  );
}
