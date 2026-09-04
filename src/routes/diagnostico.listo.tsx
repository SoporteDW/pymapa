import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { TarjetaEntregable } from "@/components/entregables/tarjeta-entregable";
import { entregablePorId } from "@/lib/entregables/catalogo";
import { useEstadoDiagnostico } from "@/hooks/use-estado-diagnostico";

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

/**
 * Cierre formal del diagnóstico como hito explícito del Journey:
 * Profundización completada → Confirmación → Procesando → Diagnóstico final.
 *
 * El cierre nunca ocurre en silencio: lo confirma la empresa. A partir de ese
 * momento el diagnóstico queda en solo lectura y se habilita la Etapa 3.
 */
function DiagnosticoListoPage() {
  const informe = entregablePorId("diagnostico");
  const { hidratado, journey, cerrado, cerrarDiagnostico } = useEstadoDiagnostico();
  const [emitiendo, setEmitiendo] = useState(false);

  useEffect(() => {
    if (!emitiendo) return;
    const temporizador = setTimeout(() => {
      cerrarDiagnostico();
      setEmitiendo(false);
    }, 1200);
    return () => clearTimeout(temporizador);
  }, [emitiendo, cerrarDiagnostico]);

  if (!hidratado) return <LoadingState fullPage />;

  const listoParaCerrar = journey.profundizacion.pendientes === 0;

  const cabecera = (
    <PageHeader
      titulo={cerrado ? "Tu diagnóstico está listo" : "Confirma el cierre de tu diagnóstico"}
      subtitulo={
        cerrado
          ? "Esta es la primera conclusión formal del recorrido: sabemos en qué estado está tu empresa y por dónde conviene empezar."
          : "Al confirmar, emitimos tu diagnóstico final y tus respuestas quedan en solo lectura."
      }
      migas={[
        { label: "Inicio", to: "/inicio" },
        { label: "Diagnóstico", to: "/diagnostico" },
        { label: cerrado ? "Diagnóstico listo" : "Cierre formal" },
      ]}
    />
  );

  // Estado A · faltan aspectos por resolver: no se puede cerrar todavía.
  if (!cerrado && !listoParaCerrar) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        {cabecera}
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle className="text-base">Todavía no podemos concluir</CardTitle>
            <CardDescription>
              Te falta resolver {journey.profundizacion.pendientes}{" "}
              {journey.profundizacion.pendientes === 1 ? "aspecto" : "aspectos"} para poder emitir tu
              diagnóstico final. Puedes aclararlo, adjuntar un documento, pedírselo a alguien de tu
              equipo o solicitar apoyo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/diagnostico/cierre">Resolver lo que falta</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Estado B · procesando la emisión del diagnóstico final.
  if (emitiendo) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        {cabecera}
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-center gap-4 rounded-[20px] border border-border bg-card p-10 text-center"
        >
          <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">
            Estamos consolidando tu diagnóstico final…
          </p>
          <p className="max-w-md text-sm text-muted-foreground">
            Integramos tus respuestas, las evidencias y las aclaraciones para emitir el Informe de
            Diagnóstico.
          </p>
        </div>
      </div>
    );
  }

  // Estado C · confirmación explícita del cierre.
  if (!cerrado) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        {cabecera}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="size-5" aria-hidden="true" />
              <span className="text-xs font-medium uppercase tracking-wide">
                Profundización completada
              </span>
            </div>
            <CardTitle className="text-xl leading-snug">
              Ya tenemos todo lo necesario para concluir
            </CardTitle>
            <CardDescription>
              Al cerrar el diagnóstico emitimos tu Informe de Diagnóstico y habilitamos la Etapa 3 ·
              Actuar. Tus respuestas y evidencias quedarán en solo lectura como registro de esta
              conclusión.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button size="lg" onClick={() => setEmitiendo(true)}>
              Cerrar y emitir mi diagnóstico final
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/diagnostico/revision">Ver respuestas del diagnóstico</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Estado D · diagnóstico final emitido.
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {cabecera}

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <CheckCircle2 className="size-5" aria-hidden="true" />
            <span className="text-xs font-medium uppercase tracking-wide">
              Diagnóstico completado
            </span>
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
            El diagnóstico dice dónde estás. Los resultados y prioridades dicen qué atender primero
            y por qué, y desde ahí se arma tu Plan de Acción.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild size="lg">
            <Link to="/resultados">
              Ver resultados y prioridades
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link to="/plan-de-accion">
              Construir mi Plan de Acción
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
