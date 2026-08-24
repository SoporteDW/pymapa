import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { DemoNote } from "@/components/ui/demo-note";
import { PageHeader } from "@/components/layout/page-header";
import { EtapasJourney } from "@/components/journey/etapas-journey";
import { TarjetaSiguientePaso } from "@/components/recorrido/tarjeta-siguiente-paso";
import { useSesion } from "@/hooks/use-sesion";
import { useSiguientePaso } from "@/hooks/use-siguiente-paso";
import { UserRound } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const Route = createFileRoute("/inicio")({
  head: () => ({
    meta: [
      { title: "Inicio — pymapa" },
      {
        name: "description",
        content:
          "Tu punto de partida: revisa el estado de tu empresa y descubre cuál es tu siguiente paso.",
      },
      { property: "og:title", content: "Inicio — pymapa" },
      {
        property: "og:description",
        content:
          "Tu punto de partida: revisa el estado de tu empresa y descubre cuál es tu siguiente paso.",
      },
    ],
  }),
  component: InicioPage,
});

/**
 * Home gobernado por el estado central.
 *
 * Fuente única de etapas: `journey/etapas.ts` (Preparar → Diagnosticar →
 * Actuar → Seguir), pintada por `EtapasJourney`. El único CTA operativo es el
 * paso que devuelve el orquestador; el trabajo de etapas futuras aparece como
 * "Más adelante" dentro del mapa, sin acción disponible.
 */
function InicioPage() {
  const { sesion, isHydrated } = useSesion();
  const { hidratado: pasoHidratado, paso, otrosPendientes } = useSiguientePaso();

  if (!isHydrated) {
    return <LoadingState fullPage />;
  }

  const perfilIncompleto = !sesion.perfilCompletado || !sesion.empresa.nombre.trim();
  const nombreEmpresa = sesion.empresa.nombre.trim();

  return (
    <div className="space-y-8">
      <PageHeader
        titulo={nombreEmpresa ? `Hola, ${nombreEmpresa}` : "Bienvenido a pymapa"}
        subtitulo={
          nombreEmpresa
            ? "Este es el estado de tu recorrido de transformación digital."
            : "Te acompañamos paso a paso para ordenar y avanzar en tu transformación digital."
        }
      />

      {pasoHidratado ? (
        <TarjetaSiguientePaso paso={paso} otrosPendientes={otrosPendientes} />
      ) : (
        <LoadingState />
      )}

      <EtapasJourney />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">¿Para qué sirve pymapa?</CardTitle>
          <CardDescription>
            pymapa es un modelo de transformación digital autogestionado: con un diagnóstico guiado
            entendemos el punto de partida de tu empresa, traducimos ese resultado en prioridades
            claras y lo convertimos en un plan de acción con seguimiento. Avanzas a tu ritmo y
            puedes guardar y retomar el recorrido en cualquier momento.
          </CardDescription>
        </CardHeader>
      </Card>

      {perfilIncompleto && (
        <div className="flex flex-col gap-3 rounded-xl border border-warning/25 bg-warning/5 p-4 text-sm text-warning-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            Tu perfil de empresa está incompleto. Con esos datos el recorrido resulta más claro.
          </span>
          <Button variant="outline" size="sm" asChild>
            <Link to="/perfil">
              <UserRound className="mr-2 h-4 w-4" aria-hidden="true" />
              Completar perfil
            </Link>
          </Button>
        </div>
      )}

      <section aria-labelledby="actividad-reciente" className="space-y-3">
        <h2 id="actividad-reciente" className="text-lg font-semibold text-foreground">
          Actividad reciente
        </h2>
        {sesion.actividad.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
            Todavía no hay actividad. Cuando guardes tu perfil o avances en el diagnóstico, verás
            aquí un registro de tus cambios.
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {sesion.actividad.slice(0, 4).map((act) => (
              <li key={act.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:justify-between">
                <span className="text-sm text-foreground">{act.descripcion}</span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(act.fecha), "d MMM yyyy · HH:mm", { locale: es })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <DemoNote>
        Estás usando el MVP Alfa. Los resultados, prioridades y acciones son ilustrativos y sirven
        para validar el recorrido; la lógica definitiva de diagnóstico se incorporará en etapas
        posteriores.
      </DemoNote>
    </div>
  );
}
