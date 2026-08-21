import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { BadgeResultadoSeguimiento } from "@/components/seguimiento/badge-resultado";
import { useSeguimiento } from "@/hooks/use-seguimiento";
import { proximoHitoPendiente } from "@/lib/seguimiento/servicio";
import { LineChart } from "lucide-react";

export const Route = createFileRoute("/seguimiento/")({
  head: () => ({
    meta: [
      { title: "Seguimiento 30 / 60 / 90 días — pymapa" },
      {
        name: "description",
        content:
          "Comprueba si las actividades validadas produjeron resultados: mide el indicador en 30, 60 y 90 días y decide el siguiente paso.",
      },
      { property: "og:title", content: "Seguimiento 30 / 60 / 90 días — pymapa" },
      {
        property: "og:description",
        content:
          "Auditoría continua de tus actividades validadas con conclusión cualitativa y decisión de continuidad.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SeguimientoIndexPage,
});

function SeguimientoIndexPage() {
  const navigate = useNavigate();
  const { hidratado, seguimientos } = useSeguimiento();

  if (!hidratado) return <LoadingState fullPage />;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Seguimiento y auditoría continua"
        subtitulo="Ejecutar no es lo mismo que lograr resultados: aquí se mide qué pasó después de validar cada actividad."
        migas={[{ label: "Inicio", to: "/inicio" }, { label: "Seguimiento" }]}
      />

      {seguimientos.length === 0 ? (
        <EmptyState
          title="Todavía no hay seguimientos abiertos"
          description="El seguimiento se abre automáticamente cuando una actividad queda validada en su workspace."
          icon={LineChart}
          actionLabel="Ver plan de acción"
          onAction={() => navigate({ to: "/plan-de-accion" })}
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {seguimientos.map((seguimiento) => {
            const hito = proximoHitoPendiente(seguimiento);
            return (
              <li key={seguimiento.id}>
                <Card className="h-full">
                  <CardHeader className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{seguimiento.dominioNombre}</Badge>
                      {seguimiento.evaluacion && (
                        <BadgeResultadoSeguimiento
                          resultado={seguimiento.evaluacion.resultado}
                        />
                      )}
                    </div>
                    <CardTitle className="text-base">{seguimiento.actividadTitulo}</CardTitle>
                    <CardDescription>
                      Indicador: {seguimiento.indicador.nombre} ({seguimiento.indicador.unidad}) ·
                      línea base {seguimiento.indicador.lineaBase ?? "sin declarar"} · meta{" "}
                      {seguimiento.indicador.meta ?? "sin declarar"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {hito
                        ? `Próxima medición: ${hito.etiqueta}.`
                        : "Todas las mediciones están registradas."}
                    </p>
                    <Button variant="outline" asChild>
                      <Link
                        to="/seguimiento/$actividad"
                        params={{ actividad: seguimiento.actividadId }}
                      >
                        Abrir seguimiento
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
