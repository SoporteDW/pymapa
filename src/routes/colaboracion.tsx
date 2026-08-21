import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormularioDelegacion } from "@/components/delegacion/formulario-delegacion";
import { TarjetaDelegacion } from "@/components/delegacion/tarjeta-delegacion";
import { useDelegacion } from "@/hooks/use-delegacion";
import { useWorkspace } from "@/hooks/use-workspace";
import { areaSugerida } from "@/lib/delegacion/areas";
import type { OrigenDelegacion } from "@/lib/delegacion/tipos";
import { toast } from "sonner";
import { Users } from "lucide-react";

export const Route = createFileRoute("/colaboracion")({
  head: () => ({
    meta: [
      { title: "Colaboración y delegación interna — pymapa" },
      {
        name: "description",
        content:
          "Involucra a otras personas de tu empresa: delega una tarea o una evidencia, sigue su estado e incorpora la respuesta al diagnóstico.",
      },
      { property: "og:title", content: "Colaboración y delegación interna — pymapa" },
      {
        property: "og:description",
        content:
          "Delegaciones con mensaje preparado y estados pendiente tercero, recibido e incorporado.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ColaboracionPage,
});

function ColaboracionPage() {
  const { hidratado, delegaciones, crear, recibir, incorporar } = useDelegacion();
  const workspace = useWorkspace();
  const [actividadId, setActividadId] = useState("");

  const actividades = workspace.actividades;
  const actividad = useMemo(
    () => actividades.find((a) => a.id === actividadId) ?? actividades[0],
    [actividades, actividadId]
  );

  if (!hidratado || !workspace.hidratado) return <LoadingState fullPage />;

  const origen: OrigenDelegacion | null = actividad
    ? {
        tipo: "actividad",
        referenciaId: actividad.id,
        referenciaTitulo: actividad.titulo,
        dominioId: actividad.origen.dominioId,
        dominioNombre: actividad.origen.dominioNombre,
        rutaRetorno: `/plan-de-accion/workspace/${actividad.id}`,
      }
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Colaboración y delegación"
        subtitulo="Pymapa acompaña a la empresa, no solo a una persona: puedes pedir a un colega el dato, el documento o la tarea que falta."
        migas={[{ label: "Inicio", to: "/inicio" }, { label: "Colaboración" }]}
      />

      {origen ? (
        <>
          <Card>
            <CardHeader className="space-y-1.5">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-5 w-5 text-primary" aria-hidden="true" />
                Sobre qué actividad quieres delegar
              </CardTitle>
              <CardDescription>
                El área sugerida se deduce del dominio de la actividad.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={actividad.id} onValueChange={setActividadId}>
                <SelectTrigger className="max-w-xl">
                  <SelectValue placeholder="Elegir actividad" />
                </SelectTrigger>
                <SelectContent>
                  {actividades.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <FormularioDelegacion
            origen={origen}
            areaSugerida={areaSugerida(origen.dominioId).nombre}
            tareaSugerida={`Apoyar con: ${actividad.entregable.titulo}`}
            onDelegar={(entrada) => {
              const delegacion = crear(entrada);
              if (delegacion) {
                toast.success("Solicitud preparada", {
                  description: `Queda pendiente de ${delegacion.nombre}.`,
                });
              }
            }}
          />
        </>
      ) : (
        <Card>
          <CardHeader className="space-y-1.5">
            <CardTitle className="text-base">Aún no hay actividades abiertas</CardTitle>
            <CardDescription>
              Abre una actividad en su workspace y desde aquí podrás delegar parte del trabajo.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <section aria-labelledby="delegaciones" className="space-y-3">
        <h2 id="delegaciones" className="text-lg font-semibold text-foreground">
          Solicitudes registradas
        </h2>
        {delegaciones.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
            Todavía no delegaste nada. Cuando lo hagas, verás aquí el estado de cada solicitud.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {delegaciones.map((delegacion) => (
              <TarjetaDelegacion
                key={delegacion.id}
                delegacion={delegacion}
                onRecibir={(respuesta) => {
                  recibir(delegacion.id, respuesta);
                  toast.success("Respuesta registrada");
                }}
                onIncorporar={() => {
                  incorporar(delegacion.id);
                  toast.success("Respuesta incorporada al conocimiento de la empresa");
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
