import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, CheckCircle2, ClipboardList, LineChart, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { useModoDemo } from "@/hooks/use-modo-demo";
import { useIntegracion } from "@/hooks/use-integracion";
import { aplicarSembradoHero } from "@/lib/demo/sembrado-hero";

/** Perfil simulado del caso demostrativo (tienda de ropa con canal digital). */
const PERFIL_ID = "PYME-04";

export const Route = createFileRoute("/moda-origen")({
  head: () => ({
    meta: [
      { title: "Moda Origen: qué ya pasó en su recorrido — pymapa" },
      {
        name: "description",
        content:
          "Contexto del caso demostrativo: la tienda Moda Origen ya diagnosticó, entregó evidencias, ejecutó una acción validada y está midiendo resultados a 30 días.",
      },
      { property: "og:title", content: "Moda Origen: qué ya pasó en su recorrido — pymapa" },
      {
        property: "og:description",
        content:
          "Retoma el recorrido de una pyme que ya tiene diagnóstico, plan, una acción validada y seguimiento en curso.",
      },
    ],
  }),
  component: ModaOrigenPage,
});

const antecedentes = [
  {
    icono: ClipboardList,
    titulo: "Ya hizo su diagnóstico",
    descripcion:
      "Respondió el cuestionario guiado y aportó evidencias de su tienda en línea. El resultado señaló la experiencia de compra como su brecha más costosa.",
  },
  {
    icono: CheckCircle2,
    titulo: "Ejecutó y validamos una acción",
    descripcion:
      "Auditó la compra completa desde el celular, documentó los puntos de fricción del pago y entregó el informe. La revisión confirmó que cumplía los criterios.",
  },
  {
    icono: LineChart,
    titulo: "Está midiendo resultados",
    descripcion:
      "En el hito de 30 días el abandono en el pago bajó de 72 % a 64 %, todavía por encima de la meta de 55 %. Hay una decisión pendiente sobre cómo continuar.",
  },
  {
    icono: Users,
    titulo: "Tiene trabajo compartido",
    descripcion:
      "Pidió a una persona del equipo confirmar las tarifas de envío y, tras dos revisiones con ajustes en el carrito, Pymapa sugirió apoyo de un especialista.",
  },
];

function ModaOrigenPage() {
  const navigate = useNavigate();
  const { iniciarDemo } = useModoDemo();
  const { cargarPerfil } = useIntegracion();
  const [preparando, setPreparando] = useState(false);

  const retomar = () => {
    setPreparando(true);
    const perfil = iniciarDemo(PERFIL_ID, "completa");
    if (!perfil) {
      setPreparando(false);
      toast.error("No pudimos preparar el caso demostrativo. Intenta de nuevo.");
      return;
    }
    cargarPerfil(perfil.id);
    aplicarSembradoHero({ empresaId: perfil.empresa.id, empresaNombre: perfil.nombre });
    toast.success(
      "Retomamos el recorrido de Moda Origen. Te mostramos dónde está y qué sigue ahora."
    );
    navigate({ to: "/inicio" });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        titulo="Moda Origen: esto es lo que ya pasó"
        subtitulo="Antes de continuar, te contamos en qué punto del recorrido está esta empresa y por qué. Todos los datos son simulados."
        migas={[{ label: "Entrada", to: "/" }, { label: "Moda Origen" }]}
      />

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="space-y-2">
          <CardTitle className="text-xl leading-snug">
            Una tienda de ropa que vende en local, redes y tienda en línea
          </CardTitle>
          <CardDescription>
            Moda Origen diseña y vende prendas de producción local. Su objetivo declarado es vender
            más por el canal digital, y su principal problema era que muchas personas abandonaban la
            compra justo al pagar.
          </CardDescription>
        </CardHeader>
      </Card>

      <section aria-labelledby="antecedentes" className="space-y-3">
        <h2 id="antecedentes" className="text-lg font-semibold text-foreground">
          Lo que ya recorrió
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {antecedentes.map((item) => (
            <Card key={item.titulo}>
              <CardHeader className="space-y-2">
                <item.icono className="size-5 text-primary" aria-hidden="true" />
                <CardTitle className="text-base leading-snug">{item.titulo}</CardTitle>
                <CardDescription>{item.descripcion}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="text-base">Qué harás a continuación</CardTitle>
          <CardDescription>
            Al continuar, Pymapa carga este contexto y te ubica en el punto exacto del recorrido:
            revisar el resultado del seguimiento, resolver los ajustes del carrito y decidir el
            siguiente movimiento.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Button size="lg" onClick={retomar} disabled={preparando}>
            {preparando ? "Preparando el caso…" : "Continuar con Moda Origen"}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
          <Button size="lg" variant="ghost" asChild>
            <Link to="/">Volver a la entrada</Link>
          </Button>
          <p className="w-full text-xs text-muted-foreground">
            Tu información real se respalda automáticamente y se restaura cuando salgas de la
            demostración.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
