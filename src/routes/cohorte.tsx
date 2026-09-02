import { createFileRoute } from "@tanstack/react-router";
import { Building2, Layers } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DemoNote } from "@/components/ui/demo-note";
import { PageHeader } from "@/components/layout/page-header";

export const Route = createFileRoute("/cohorte")({
  head: () => ({
    meta: [
      { title: "Lectura agregada de cohorte — pymapa" },
      {
        name: "description",
        content:
          "Vista simulada: principales brechas y necesidades de intervención de una cohorte de 100 mipymes diagnosticadas con Pymapa.",
      },
      { property: "og:title", content: "Lectura agregada de cohorte — pymapa" },
      {
        property: "og:description",
        content:
          "Cómo Pymapa permite entender y segmentar la demanda de intervención de un grupo de empresas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CohortePage,
});

/** Datos 100% simulados: no hay arquitectura multiempresa ni persistencia. */
const COHORTE = {
  empresas: 100,
  brechas: [
    { dominio: "Procesos y operaciones", porcentaje: 38 },
    { dominio: "Clientes y canales", porcentaje: 26 },
    { dominio: "Tecnología y datos", porcentaje: 21 },
    { dominio: "Personas y cultura", porcentaje: 15 },
  ],
  necesidades: [
    { tipo: "Autogestión", empresas: 22 },
    { tipo: "Formación", empresas: 31 },
    { tipo: "Asistencia técnica", empresas: 28 },
    { tipo: "Tecnología / proveedor", empresas: 17 },
    { tipo: "Posible necesidad de financiación", empresas: 14 },
  ],
} as const;

function CohortePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Lectura agregada de cohorte"
        subtitulo="Vista institucional simulada · fuera del recorrido individual de tu empresa."
        migas={[{ label: "Inicio", to: "/inicio" }, { label: "Cohorte" }]}
      />

      <DemoNote>
        Vista simulada · no corresponde a datos reales de empresas. Sirve para mostrar el tipo de
        lectura agregada que Pymapa puede producir cuando una entidad trabaja con muchas empresas.
      </DemoNote>

      <Card>
        <CardHeader className="space-y-1.5">
          <Badge variant="secondary" className="w-fit rounded-full">
            <Building2 className="size-3.5" aria-hidden="true" />
            Cohorte · {COHORTE.empresas} mipymes
          </Badge>
          <CardTitle className="text-lg">Principales brechas</CardTitle>
          <CardDescription>
            Dominio en el que se concentra la brecha prioritaria de cada empresa diagnosticada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {COHORTE.brechas.map((b) => (
            <div key={b.dominio} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground">{b.dominio}</span>
                <span className="font-semibold text-foreground">{b.porcentaje}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${b.porcentaje}%` }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1.5">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Layers className="size-4 text-primary" aria-hidden="true" />
            Necesidades de intervención
          </CardTitle>
          <CardDescription>
            Número de empresas por tipo de apoyo requerido. La financiación no es un tipo de
            intervención: es un posible habilitador que debe validarse con la entidad financiera.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {COHORTE.necesidades.map((n) => (
            <div key={n.tipo} className="rounded-[16px] border border-border bg-card p-4">
              <p className="text-2xl font-bold text-foreground">{n.empresas}</p>
              <p className="text-xs text-muted-foreground">{n.tipo}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
