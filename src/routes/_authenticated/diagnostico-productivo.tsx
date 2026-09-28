import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { CatalogoCapacidades } from "@/components/diagnostico/catalogo-capacidades";
import { getDiagnosticHub } from "@/lib/production/capabilities.functions";

export const Route = createFileRoute("/_authenticated/diagnostico-productivo")({
  head: () => ({
    meta: [
      { title: "Tu diagnóstico — pymapa" },
      { name: "description", content: "Las 31 capacidades del diagnóstico pymapa organizadas en 6 dominios, con su estado real." },
      { property: "og:title", content: "Tu diagnóstico — pymapa" },
      { property: "og:description", content: "Las 31 capacidades del diagnóstico pymapa en 6 dominios." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HubDiagnostico,
});

function HubDiagnostico() {
  const cargar = useServerFn(getDiagnosticHub);
  const hub = useQuery({ queryKey: ["hub-diagnostico"], queryFn: () => cargar() });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <PageHeader
        titulo="Tu diagnóstico"
        subtitulo="Elige cualquier capacidad para avanzar. El estado de cada una refleja lo que realmente se ha respondido."
        acciones={
          <Button asChild variant="outline">
            <Link to="/resultados-productivos">Resultados</Link>
          </Button>
        }
      />
      {hub.isLoading && <LoadingState message="Cargando tus capacidades…" />}
      {hub.error && <p className="text-sm text-destructive">No pudimos cargar el diagnóstico. Intenta de nuevo.</p>}
      {hub.data && <CatalogoCapacidades capacidades={hub.data.capabilities} />}
    </div>
  );
}
