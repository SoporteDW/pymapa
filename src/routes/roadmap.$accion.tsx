import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { RoadmapDetail } from "@/components/roadmap/roadmap-detail";
import { useRoadmap } from "@/hooks/use-roadmap";
import { registrarEvento } from "@/lib/analytics";
import { ListTodo } from "lucide-react";

export const Route = createFileRoute("/roadmap/$accion")({
  head: () => ({
    meta: [
      { title: "Seguimiento de la acción — Pyme Digital" },
      {
        name: "description",
        content: "Registra avance, evidencias y bloqueos de una acción de tu roadmap.",
      },
      { property: "og:title", content: "Seguimiento de la acción — Pyme Digital" },
      {
        property: "og:description",
        content: "Registra avance, evidencias y bloqueos de una acción de tu roadmap.",
      },
    ],
  }),
  component: RoadmapAccionPage,
});

function RoadmapAccionPage() {
  const { accion: accionId } = useParams({ from: "/roadmap/$accion" });
  const navigate = useNavigate();
  const { estado, roadmap, obtenerAccion, obtenerHistorial, acciones, mensaje } = useRoadmap();

  useEffect(() => {
    registrarEvento("roadmap_action_opened", { accionId });
  }, [accionId]);

  const accion = obtenerAccion(accionId);

  return (
    <div className="space-y-6">
      <PageHeader
        titulo={accion?.titulo ?? "Seguimiento de la acción"}
        subtitulo="Actualiza el estado, el avance y la evidencia de esta acción."
        migas={[
          { label: "Inicio", to: "/inicio" },
          { label: "Roadmap", to: "/roadmap" },
          { label: "Acción" },
        ]}
        acciones={
          <Button variant="outline" asChild>
            <Link to="/roadmap">Volver al roadmap</Link>
          </Button>
        }
      />

      {mensaje && (
        <Alert variant={mensaje.tono === "aviso" ? "destructive" : "default"}>
          <AlertDescription>{mensaje.texto}</AlertDescription>
        </Alert>
      )}

      {estado === "cargando" && <LoadingState message="Cargando la acción…" />}

      {estado !== "cargando" && (!roadmap || !accion) && (
        <EmptyState
          title="No encontramos esta acción"
          description="Puede que el plan se haya regenerado. Vuelve al roadmap para elegir otra acción."
          icon={ListTodo}
          actionLabel="Ir al roadmap"
          onAction={() => navigate({ to: "/roadmap" })}
        />
      )}

      {roadmap && accion && (
        <RoadmapDetail
          roadmap={roadmap}
          accion={accion}
          historial={obtenerHistorial(accionId)}
          operaciones={acciones}
        />
      )}
    </div>
  );
}
