import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { BadgeSuficiencia } from "@/components/evidencias/badge-suficiencia";
import { TarjetaNecesidad } from "@/components/evidencias/tarjeta-necesidad";
import { useEvidencias } from "@/hooks/use-evidencias";
import { CheckCircle2, Info } from "lucide-react";

export const Route = createFileRoute("/diagnostico/cierre")({
  head: () => ({
    meta: [
      { title: "Cierre del diagnóstico: suficiencia y evidencias — pymapa" },
      {
        name: "description",
        content:
          "Pymapa revisa si la información declarada alcanza para concluir y te solicita las evidencias o aclaraciones que faltan.",
      },
      {
        property: "og:title",
        content: "Cierre del diagnóstico: suficiencia y evidencias — pymapa",
      },
      {
        property: "og:description",
        content:
          "Revisa por dominio si la información es suficiente, adjunta evidencias y responde las aclaraciones necesarias.",
      },
    ],
  }),
  component: CierrePage,
});

function CierrePage() {
  const {
    hidratado,
    suficiencia,
    solicitar,
    cargarArchivo,
    responderAclaracion,
    evidenciaDeSolicitud,
  } = useEvidencias();

  if (!hidratado) return <LoadingState fullPage />;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="¿Podemos concluir tu diagnóstico?"
        subtitulo="Antes de interpretar los resultados, Pymapa revisa dominio por dominio si la información declarada alcanza."
        migas={[
          { label: "Inicio", to: "/inicio" },
          { label: "Diagnóstico", to: "/diagnostico" },
          { label: "Cierre del diagnóstico" },
        ]}
      />

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="space-y-2">
          <BadgeSuficiencia estado={suficiencia.estadoGeneral} />
          <CardTitle className="text-xl leading-snug">{suficiencia.mensajeGeneral}</CardTitle>
          <CardDescription>
            Esta revisión es cualitativa: indica si podemos concluir, no un puntaje.
          </CardDescription>
        </CardHeader>
      </Card>

      <section aria-labelledby="dominios-suficiencia" className="space-y-3">
        <h2 id="dominios-suficiencia" className="text-lg font-semibold text-foreground">
          Suficiencia por dominio
        </h2>
        <div className="space-y-3">
          {suficiencia.dominios.map((dominio) => (
            <Card key={dominio.dominioId}>
              <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">{dominio.nombre}</CardTitle>
                  <BadgeSuficiencia estado={dominio.estado} />
                </div>
                <CardDescription>{dominio.mensaje}</CardDescription>
                <p className="text-xs text-muted-foreground">
                  {dominio.respondidas} de {dominio.total} preguntas respondidas
                </p>
              </CardHeader>
              {dominio.necesidades.length > 0 && (
                <CardContent className="space-y-3">
                  {dominio.necesidades.map((necesidad) => (
                    <TarjetaNecesidad
                      key={necesidad.reglaId}
                      necesidad={necesidad}
                      evidencia={
                        necesidad.tipo === "evidencia"
                          ? evidenciaDeSolicitud(necesidad.referenciaId)
                          : undefined
                      }
                      onSolicitar={solicitar}
                      onCargar={(evidenciaId, archivo) =>
                        cargarArchivo(evidenciaId, {
                          nombre: archivo.name,
                          tipoMime: archivo.type || "application/octet-stream",
                          tamañoBytes: archivo.size,
                          ubicacion: null,
                        })
                      }
                      onResponder={responderAclaracion}
                    />
                  ))}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </section>

      <div className="flex items-start gap-3 rounded-xl border border-info/30 bg-info/5 p-4 text-sm text-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
        <p>
          El análisis de documentos es simulado en esta versión: Pymapa registra el archivo y sus
          señales esperadas, pero todavía no lee su contenido.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <Button variant="outline" asChild>
          <Link to="/diagnostico/revision">Revisar mis respuestas</Link>
        </Button>
        {suficiencia.puedeCerrar ? (
          <Button size="lg" asChild>
            <Link to="/diagnostico/listo">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Cerrar mi diagnóstico
            </Link>

          </Button>
        ) : (
          <Button size="lg" variant="secondary" asChild>
            <Link to="/diagnostico">Volver al diagnóstico</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
