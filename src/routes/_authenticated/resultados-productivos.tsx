import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";

export const Route = createFileRoute("/_authenticated/resultados-productivos")({
  head: () => ({
    meta: [
      { title: "Resultados — pymapa" },
      { name: "description", content: "Los resultados consolidados del diagnóstico pymapa son el siguiente módulo." },
      { property: "og:title", content: "Resultados — pymapa" },
      { property: "og:description", content: "Resultados consolidados del diagnóstico pymapa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResultadosProductivos,
});

function ResultadosProductivos() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <PageHeader titulo="Resultados" subtitulo="Resumen consolidado de tu diagnóstico." />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Próximamente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            El resumen consolidado de las 31 capacidades es el siguiente módulo en construcción. Mientras tanto,
            los hallazgos reales de cada capacidad se muestran dentro de ella.
          </p>
          <Button asChild>
            <Link to="/diagnostico-productivo">Volver al diagnóstico</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
