import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/page-header";
import { PreguntaKb } from "@/components/kb/pregunta-kb";
import { HallazgoKb } from "@/components/kb/hallazgo-kb";
import { PanelConversacionalKb } from "@/components/kb/panel-conversacional";
import { useKbEcommerce } from "@/hooks/use-kb-ecommerce";
import { registrarEvento } from "@/lib/analytics";
import { TEXTO_INSUFICIENTE, type HallazgoDetectadoKB } from "@/lib/kb/tipos";
import { ArrowRight, FlaskConical, RotateCcw, Sparkles } from "lucide-react";

export const Route = createFileRoute("/diagnostico/especializados/ecommerce")({
  head: () => ({
    meta: [
      { title: "Diagnóstico Inteligente · E-commerce — pymapa" },
      {
        name: "description",
        content:
          "Diagnóstico especializado de canal digital, perfil tecnológico, social selling y experiencia de compra, con hallazgos explicables y trazables.",
      },
      { property: "og:title", content: "Diagnóstico Inteligente · E-commerce — pymapa" },
      {
        property: "og:description",
        content:
          "Diagnóstico especializado de canal digital, perfil tecnológico, social selling y experiencia de compra, con hallazgos explicables y trazables.",
      },
    ],
  }),
  component: DiagnosticoEcommerce,
});

function DiagnosticoEcommerce() {
  const navigate = useNavigate();
  const {
    pack,
    isHydrated,
    empresa,
    respuestas,
    preguntasVisibles,
    resultado,
    esDemo,
    responder,
    cargarDatasetDemo,
    limpiar,
    convertirEnIniciativa,
    iniciativaDe,
  } = useKbEcommerce();
  const [pestana, setPestana] = useState("instrumento");

  useEffect(() => {
    registrarEvento("kb_diagnosis_opened", { packId: pack.id, version: pack.version });
  }, [pack.id, pack.version]);

  if (!isHydrated) return <LoadingState fullPage />;

  const { progreso } = resultado;

  const handleConvertir = (detectado: HallazgoDetectadoKB) => {
    const iniciativa = convertirEnIniciativa(detectado);
    toast.success("Iniciativa creada en tu Plan de Acción", {
      description: iniciativa.accion.titulo,
      action: {
        label: "Ver plan",
        onClick: () => void navigate({ to: "/plan-de-accion" }),
      },
    });
  };

  const handleDemo = () => {
    const total = cargarDatasetDemo();
    toast.success(`Dataset de demostración aplicado (${total} preguntas)`, {
      description: `${pack.datasetDemo.nombreEmpresa} · datos ficticios para explorar el recorrido.`,
    });
    setPestana("resultados");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Diagnóstico Inteligente · E-commerce"
        subtitulo="Instrumento especializado del canal digital. Independiente del diagnóstico general de madurez."
        migas={[
          { label: "Inicio", to: "/inicio" },
          { label: "Diagnóstico", to: "/diagnostico" },
          { label: "Especializados", to: "/diagnostico/especializados" },
          { label: "E-commerce" },
        ]}
      />

      <Card>
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{pack.version}</Badge>
            <Badge variant="secondary">Conocimiento experimental</Badge>
            {esDemo && (
              <Badge variant="secondary">
                <FlaskConical className="mr-1 h-3 w-3" aria-hidden="true" />
                Datos de demostración
              </Badge>
            )}
          </div>
          <CardTitle className="text-base">
            {empresa.nombre} · {progreso.respondidas} de {progreso.visibles} preguntas aplicables
          </CardTitle>
          <CardDescription>
            Las preguntas se abren o cierran según lo que declares: solo verás lo que aplica a tu
            situación. Tus respuestas quedan asociadas a la empresa y se reutilizan sin volver a
            preguntarlas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progreso.porcentaje} aria-label="Avance del instrumento" />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleDemo}>
              <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
              Recorrer con datos de demostración
            </Button>
            {progreso.respondidas > 0 && (
              <Button variant="ghost" size="sm" onClick={limpiar}>
                <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                Limpiar respuestas de este diagnóstico
              </Button>
            )}
          </div>
          {esDemo && (
            <p className="text-xs text-muted-foreground">
              Modo demostración · datos simulados de {pack.datasetDemo.nombreEmpresa}. No
              corresponden a tu empresa real.
            </p>
          )}
        </CardContent>
      </Card>

      <Tabs value={pestana} onValueChange={setPestana} className="space-y-4">
        <TabsList>
          <TabsTrigger value="instrumento">Instrumento</TabsTrigger>
          <TabsTrigger value="resultados">Resultados</TabsTrigger>
        </TabsList>

        <TabsContent value="instrumento" className="space-y-4">
          {preguntasVisibles.map((pregunta, indice) => (
            <Card key={pregunta.id}>
              <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{pregunta.id}</Badge>
                  <Badge variant="secondary">{pregunta.tema}</Badge>
                  {pregunta.condicionalId && (
                    <span className="text-xs text-muted-foreground">
                      Pregunta condicional {pregunta.condicionalId}
                    </span>
                  )}
                </div>
                <CardTitle className="text-base">
                  {indice + 1}. {pregunta.texto}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PreguntaKb
                  pregunta={pregunta}
                  valor={respuestas[pregunta.id]}
                  onChange={(valor) => {
                    responder(pregunta.id, valor);
                    registrarEvento("kb_question_answered", { preguntaId: pregunta.id });
                  }}
                />
              </CardContent>
            </Card>
          ))}

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setPestana("resultados")}>
              Ver resultados del diagnóstico
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
            <Button variant="outline" asChild>
              <Link to="/diagnostico/especializados">Volver a especializados</Link>
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="resultados" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumen del análisis</CardTitle>
              <CardDescription>{resultado.resumen}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="grid gap-3 sm:grid-cols-2">
                {resultado.estados.map((estado) => (
                  <li key={estado.dominio} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">{estado.etiqueta}</p>
                      <Badge variant={estado.estado === "preliminar" ? "outline" : "secondary"}>
                        {estado.estado === "preliminar"
                          ? `${estado.hallazgos} hallazgo(s)`
                          : estado.estado === "sin_alcance"
                            ? "Fuera de alcance"
                            : "Sin evidencia"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{estado.mensaje}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Perfil tecnológico requerido</CardTitle>
              <CardDescription>
                Pymapa describe el tipo de solución que necesitas, no una marca ni una plataforma
                concreta.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-semibold text-foreground">{resultado.perfilTecnologico.perfil}</p>
              {resultado.perfilTecnologico.razones.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                  {resultado.perfilTecnologico.razones.map((razon) => (
                    <li key={razon}>{razon}</li>
                  ))}
                </ul>
              )}
              {resultado.perfilTecnologico.tension && (
                <p className="rounded-lg border border-border bg-muted/40 p-3 text-muted-foreground">
                  Se detecta una tensión entre la complejidad requerida y la capacidad técnica
                  interna declarada: conviene resolver el modelo de soporte antes de avanzar.
                </p>
              )}
              {resultado.perfilTecnologico.pendientes.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Para precisar el perfil falta declarar: {resultado.perfilTecnologico.pendientes.join(", ")}.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Conclusión preliminar basada solo en la información declarada.
              </p>
            </CardContent>
          </Card>

          <section aria-labelledby="hallazgos-kb" className="space-y-4">
            <h2 id="hallazgos-kb" className="text-lg font-semibold text-foreground">
              Hallazgos prioritarios y acciones
            </h2>
            {resultado.hallazgos.length === 0 ? (
              <Card>
                <CardContent className="py-6 text-sm text-muted-foreground">
                  {progreso.respondidas === 0
                    ? TEXTO_INSUFICIENTE
                    : "Con la información declarada no se identificaron hallazgos. Es una conclusión preliminar."}
                </CardContent>
              </Card>
            ) : (
              resultado.hallazgos.map((detectado) => (
                <HallazgoKb
                  key={detectado.hallazgo.id}
                  detectado={detectado}
                  iniciativa={iniciativaDe(detectado.recomendacion.id)}
                  onConvertir={handleConvertir}
                />
              ))
            )}
          </section>

          {resultado.faltantes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Información que falta</CardTitle>
                <CardDescription>
                  {TEXTO_INSUFICIENTE} Completar estas preguntas mejora la precisión del análisis.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {resultado.faltantes.map((faltante) => (
                    <li key={faltante.preguntaId}>
                      {faltante.preguntaId} · {faltante.pregunta}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <PanelConversacionalKb resultado={resultado} />

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setPestana("instrumento")}>
              Volver al instrumento
            </Button>
            <Button asChild>
              <Link to="/plan-de-accion">
                Ver mi Plan de Acción
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
