import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, ClipboardList, FileSearch, Route as RouteIcon, Target } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { useModoDemo } from "@/hooks/use-modo-demo";
import { useIntegracion } from "@/hooks/use-integracion";
import {
  HERO_PERFIL_ID,
  HERO_RESPUESTAS,
  sembrarPuntoEntradaHero,
} from "@/lib/demo/punto-entrada-hero";

/** Perfil simulado del caso demostrativo (tienda de ropa con canal digital). */
const PERFIL_ID = HERO_PERFIL_ID;

export const Route = createFileRoute("/moda-origen")({
  head: () => ({
    meta: [
      { title: "Moda Origen: qué ya pasó en su recorrido — pymapa" },
      {
        name: "description",
        content:
          "Contexto del caso demostrativo: la tienda Moda Origen ya respondió su cuestionario completo y ahora debe profundizar y cerrar su diagnóstico.",
      },
      { property: "og:title", content: "Moda Origen: qué ya pasó en su recorrido — pymapa" },
      {
        property: "og:description",
        content:
          "Retoma el recorrido de una pyme que ya respondió su diagnóstico y está a un paso de cerrarlo.",
      },
    ],
  }),
  component: ModaOrigenPage,
});

const antecedentes = [
  {
    icono: ClipboardList,
    titulo: "Respondió todo el cuestionario",
    descripcion:
      "Completó las 28 preguntas del diagnóstico guiado sobre los seis dominios del modelo. No tendrás que volver a responderlas.",
  },
  {
    icono: FileSearch,
    titulo: "Le faltan aspectos por precisar",
    descripcion:
      "Al revisar sus respuestas quedaron aspectos que no se pueden interpretar todavía: ahí decides cómo resolverlos (aclarar, adjuntar, delegar o pedir apoyo).",
  },
  {
    icono: Target,
    titulo: "Su hipótesis a comprobar",
    descripcion:
      "Su preocupación declarada es que muchas personas abandonan la compra justo al pagar. El diagnóstico debe confirmarlo antes de proponer acciones.",
  },
  {
    icono: RouteIcon,
    titulo: "Todavía no tiene plan ni seguimiento",
    descripcion:
      "El plan de acción, la ejecución y la medición aparecerán cuando cierre formalmente su diagnóstico. Nada de eso viene precargado.",
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
    // El caso Hero entra con el cuestionario completo (28 de 28).
    cargarPerfil(perfil.id, { respuestas: HERO_RESPUESTAS });
    // Progresivo: solo la etapa de diagnóstico. Las etapas siguientes se
    // construyen con el propio recorrido.
    sembrarPuntoEntradaHero({
      empresaId: perfil.empresa.id,
      empresaNombre: perfil.nombre,
      reiniciar: true,
    });
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
            más por el canal digital, y su principal sospecha es que muchas personas abandonan la
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
            resolver los aspectos que faltan y cerrar el diagnóstico para habilitar el plan de
            acción.
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
