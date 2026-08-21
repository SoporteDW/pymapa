import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { BadgeResultadoSeguimiento } from "@/components/seguimiento/badge-resultado";
import { TarjetaHito } from "@/components/seguimiento/tarjeta-hito";
import { useSeguimiento } from "@/hooks/use-seguimiento";
import { etiquetaDecisionSeguimiento } from "@/lib/seguimiento/servicio";
import { toast } from "sonner";
import { LineChart, Sparkles } from "lucide-react";

export const Route = createFileRoute("/seguimiento/$actividad")({
  head: () => ({
    meta: [
      { title: "Seguimiento de la actividad — pymapa" },
      {
        name: "description",
        content:
          "Registra las mediciones de 30, 60 y 90 días y obtén la conclusión cualitativa con la decisión que corresponde.",
      },
      { property: "og:title", content: "Seguimiento de la actividad — pymapa" },
      {
        property: "og:description",
        content:
          "Mediciones, conclusión explicada y decisión: validar impacto, reabrir, complementar o pedir apoyo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SeguimientoActividadPage,
});

function SeguimientoActividadPage() {
  const { actividad: actividadId } = useParams({ from: "/seguimiento/$actividad" });
  const navigate = useNavigate();
  const { hidratado, seguimiento, medir, evaluar, aplicarDecision } = useSeguimiento(actividadId);

  if (!hidratado) return <LoadingState fullPage />;

  if (!seguimiento) {
    return (
      <div className="space-y-6">
        <PageHeader
          titulo="Seguimiento de la actividad"
          subtitulo="El seguimiento se abre cuando la actividad queda validada en su workspace."
          migas={[
            { label: "Inicio", to: "/inicio" },
            { label: "Seguimiento", to: "/seguimiento" },
            { label: "Actividad" },
          ]}
        />
        <EmptyState
          title="Esta actividad todavía no tiene seguimiento"
          description="Primero entrega el resultado en el workspace y consigue que la revisión la valide."
          icon={LineChart}
          actionLabel="Ir al workspace"
          onAction={() =>
            navigate({
              to: "/plan-de-accion/workspace/$actividad",
              params: { actividad: actividadId },
            })
          }
        />
      </div>
    );
  }

  const evaluacion = seguimiento.evaluacion;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo={`Seguimiento · ${seguimiento.actividadTitulo}`}
        subtitulo="Qué se mide, cómo evolucionó y qué corresponde hacer con ese resultado."
        migas={[
          { label: "Inicio", to: "/inicio" },
          { label: "Seguimiento", to: "/seguimiento" },
          { label: "Actividad" },
        ]}
        acciones={
          <Button variant="outline" asChild>
            <Link
              to="/plan-de-accion/workspace/$actividad"
              params={{ actividad: seguimiento.actividadId }}
            >
              Ver la actividad
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{seguimiento.dominioNombre}</Badge>
            <Badge variant="outline">Evaluación simulada</Badge>
            {evaluacion && <BadgeResultadoSeguimiento resultado={evaluacion.resultado} />}
          </div>
          <CardTitle className="text-lg">{seguimiento.indicador.nombre}</CardTitle>
          <CardDescription>{seguimiento.indicador.descripcion}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid gap-2 sm:grid-cols-3">
            <p className="text-muted-foreground">
              Línea base:{" "}
              <span className="font-semibold text-foreground">
                {seguimiento.indicador.lineaBase ?? "sin declarar"}
                {seguimiento.indicador.unidad}
              </span>
            </p>
            <p className="text-muted-foreground">
              Meta:{" "}
              <span className="font-semibold text-foreground">
                {seguimiento.indicador.meta ?? "sin declarar"}
                {seguimiento.indicador.unidad}
              </span>
            </p>
            <p className="text-muted-foreground">
              Dirección:{" "}
              <span className="font-semibold text-foreground">
                {seguimiento.indicador.direccion === "menor_mejor"
                  ? "mejora al bajar"
                  : "mejora al subir"}
              </span>
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Fuente del indicador: {seguimiento.indicador.fuente} · {seguimiento.catalogoVersion}
          </p>
          <p className="text-xs text-muted-foreground">{seguimiento.origen.porQue}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {seguimiento.hitos.map((hito) => (
          <TarjetaHito
            key={hito.id}
            hito={hito}
            indicador={seguimiento.indicador}
            onRegistrar={(entrada) => {
              medir(seguimiento.id, hito.id, entrada);
              toast.success("Medición registrada", { description: hito.etiqueta });
            }}
          />
        ))}
      </div>

      <Card>
        <CardHeader className="space-y-1.5">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
            Conclusión del seguimiento
          </CardTitle>
          <CardDescription>
            pymapa concluye de forma cualitativa: mejoró, sin cambio relevante, empeoró o
            información insuficiente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {evaluacion ? (
            <>
              <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-4">
                <BadgeResultadoSeguimiento resultado={evaluacion.resultado} />
                <p className="text-sm text-foreground">{evaluacion.mensaje}</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {evaluacion.porQue.map((razon) => (
                    <li key={razon}>· {razon}</li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline" className="border-primary/40 text-primary">
                  {etiquetaDecisionSeguimiento[evaluacion.decision]}
                </Badge>
                <Button
                  onClick={() => {
                    const decision = aplicarDecision(seguimiento);
                    if (!decision) return;
                    toast.success("Decisión aplicada al recorrido", {
                      description: etiquetaDecisionSeguimiento[decision],
                    });
                  }}
                >
                  Aplicar esta decisión
                </Button>
              </div>
              {seguimiento.derivaciones.length > 0 && (
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {seguimiento.derivaciones.map((derivacion) => (
                    <li key={`${derivacion.tipo}-${derivacion.referenciaId}`}>
                      Registrado: {etiquetaDecisionSeguimiento[derivacion.tipo]} →{" "}
                      {derivacion.referenciaId}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <Button onClick={() => evaluar(seguimiento.id)}>Evaluar el resultado</Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
