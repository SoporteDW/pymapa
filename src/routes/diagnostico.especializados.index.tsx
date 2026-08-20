import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { knowledgePackEcommerce } from "@/lib/kb/ecommerce";
import { ArrowRight, Layers } from "lucide-react";

export const Route = createFileRoute("/diagnostico/especializados/")({
  head: () => ({
    meta: [
      { title: "Diagnósticos especializados — pymapa" },
      {
        name: "description",
        content:
          "Análisis especializados que profundizan un frente concreto del negocio digital, separados del diagnóstico general de madurez.",
      },
      { property: "og:title", content: "Diagnósticos especializados — pymapa" },
      {
        property: "og:description",
        content:
          "Análisis especializados que profundizan un frente concreto del negocio digital, separados del diagnóstico general de madurez.",
      },
    ],
  }),
  component: EspecializadosIndex,
});

const pack = knowledgePackEcommerce;

function EspecializadosIndex() {
  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Diagnósticos especializados"
        subtitulo="Profundizan un frente concreto del negocio digital. No modifican el puntaje del diagnóstico general de madurez."
        migas={[
          { label: "Inicio", to: "/inicio" },
          { label: "Diagnóstico", to: "/diagnostico" },
          { label: "Especializados" },
        ]}
      />

      <Card>
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{pack.version}</Badge>
            <Badge variant="secondary">Versión experimental</Badge>
          </div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Layers className="h-5 w-5 text-primary" aria-hidden="true" />
            {pack.nombre}
          </CardTitle>
          <CardDescription>
            Demuestra la cadena completa: pregunta → respuesta → variable → evaluación → hallazgo →
            recomendación → iniciativa. Cubre canal de venta digital, perfil tecnológico requerido,
            social selling y experiencia de compra.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="grid gap-3 sm:grid-cols-2">
            {pack.dominios.map((dominio) => (
              <li key={dominio.id} className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-semibold text-foreground">{dominio.etiqueta}</p>
                <p className="text-sm text-muted-foreground">{dominio.proposito}</p>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="lg">
              <Link to="/diagnostico/especializados/ecommerce">
                Abrir diagnóstico de E-commerce
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/diagnostico">Volver al diagnóstico general</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Las conclusiones son preliminares y se basan solo en la información declarada. Cuando la
            evidencia no alcanza, Pymapa lo indica en lugar de suponer.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
