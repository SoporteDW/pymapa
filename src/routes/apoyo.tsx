import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { TarjetaApoyo } from "@/components/apoyo-humano/tarjeta-apoyo";
import { useApoyoHumano } from "@/hooks/use-apoyo-humano";
import { toast } from "sonner";
import { LifeBuoy } from "lucide-react";

export const Route = createFileRoute("/apoyo")({
  head: () => ({
    meta: [
      { title: "Apoyo humano especializado — pymapa" },
      {
        name: "description",
        content:
          "Cuando la autogestión no alcanza, pymapa recomienda apoyo humano especializado y simula la reserva de una sesión.",
      },
      { property: "og:title", content: "Apoyo humano especializado — pymapa" },
      {
        property: "og:description",
        content:
          "Recomendaciones de apoyo con su motivo, reserva demostrativa y registro de la conclusión que vuelve al recorrido.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ApoyoPage,
});

function ApoyoPage() {
  const { hidratado, recomendaciones, reservar, cerrarSesion, descartar } = useApoyoHumano();

  if (!hidratado) return <LoadingState fullPage />;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Apoyo humano especializado"
        subtitulo="Pymapa reconoce sus propios límites: cuando el problema requiere una persona experta, te lo dice y te acompaña a salir y volver."
        migas={[{ label: "Inicio", to: "/inicio" }, { label: "Apoyo" }]}
      />

      {recomendaciones.length === 0 ? (
        <Card>
          <CardHeader className="space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-base">
              <LifeBuoy className="h-5 w-5 text-primary" aria-hidden="true" />
              Por ahora puedes seguir de forma autogestionada
            </CardTitle>
            <CardDescription>
              Aparecerá una recomendación de apoyo cuando la evidencia siga faltando, un entregable
              no logre validarse o un indicador empeore.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4">
          {recomendaciones.map((recomendacion) => (
            <TarjetaApoyo
              key={recomendacion.id}
              recomendacion={recomendacion}
              onReservar={(entrada) => {
                reservar(recomendacion.id, entrada);
                toast.success("Sesión reservada (demostrativa)");
              }}
              onCerrar={(conclusion, retorno) => {
                cerrarSesion(recomendacion.id, conclusion, retorno);
                toast.success("Conclusión registrada", {
                  description: "El aprendizaje vuelve a tu recorrido.",
                });
              }}
              onDescartar={() => {
                descartar(recomendacion.id);
                toast.info("Recomendación descartada");
              }}
            />
          ))}
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">
            Las sesiones, especialistas y horarios son demostrativos: no constituyen una cita real.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
