import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { AlertCard } from "@/components/dashboard/alert-card";
import { DashboardEmptyState, DashboardErrorState } from "@/components/dashboard/dashboard-states";
import { useDashboard } from "@/hooks/use-dashboard";
import { etiquetaSeveridad } from "@/lib/dashboard/alertas";
import { registrarEvento } from "@/lib/analytics";
import type { SeveridadAlerta } from "@/lib/roadmap/alertas";

export const Route = createFileRoute("/dashboard/alertas")({
  head: () => ({
    meta: [
      { title: "Centro de alertas — Pyme Digital" },
      {
        name: "description",
        content:
          "Alertas operativas de tu plan digital con causa, consecuencia y la acción recomendada para resolverlas.",
      },
      { property: "og:title", content: "Centro de alertas — Pyme Digital" },
      {
        property: "og:description",
        content:
          "Alertas operativas de tu plan digital con causa, consecuencia y la acción recomendada para resolverlas.",
      },
    ],
  }),
  component: AlertasPage,
});

const SEVERIDADES: SeveridadAlerta[] = ["critica", "advertencia", "informativa"];

function AlertasPage() {
  const { estado, snapshot, errorCalculo, restablecerFiltros, cargarDemo } = useDashboard();
  const [severidad, setSeveridad] = useState<SeveridadAlerta | "todas">("todas");

  useEffect(() => {
    if (estado === "listo") registrarEvento("dashboard_alerts_viewed", {});
  }, [estado]);

  const alertas = useMemo(() => {
    const todas = snapshot?.alertas ?? [];
    return severidad === "todas" ? todas : todas.filter((a) => a.severity === severidad);
  }, [snapshot, severidad]);

  const cabecera = (
    <PageHeader
      titulo="Centro de alertas"
      subtitulo="Qué está en riesgo, por qué importa y qué conviene hacer ahora."
      migas={[
        { label: "Inicio", to: "/inicio" },
        { label: "Indicadores", to: "/dashboard" },
        { label: "Alertas" },
      ]}
      acciones={
        <Button variant="outline" asChild>
          <Link to="/dashboard">Volver al tablero</Link>
        </Button>
      }
    />
  );

  if (estado === "cargando") {
    return (
      <div className="space-y-6">
        {cabecera}
        <LoadingState />
      </div>
    );
  }

  if (estado === "sin_diagnostico" || estado === "sin_roadmap") {
    return (
      <div className="space-y-6">
        {cabecera}
        <DashboardEmptyState
          variante={estado}
          {...(estado === "sin_diagnostico" ? { onCargarDemo: cargarDemo } : {})}
        />
      </div>
    );
  }

  if (estado === "error" || !snapshot) {
    return (
      <div className="space-y-6">
        {cabecera}
        <DashboardErrorState codigo={errorCalculo} onReintentar={restablecerFiltros} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {cabecera}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Alertas abiertas</CardTitle>
          <CardDescription>
            {snapshot.alertas.length === 0
              ? "No hay alertas abiertas. Tu plan avanza sin desvíos detectados."
              : `${snapshot.alertas.length} alerta(s) abiertas en el periodo ${snapshot.periodo.etiqueta}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={severidad === "todas" ? "default" : "outline"}
            onClick={() => setSeveridad("todas")}
          >
            Todas
            <Badge variant="secondary" className="ml-2">
              {snapshot.alertas.length}
            </Badge>
          </Button>
          {SEVERIDADES.map((nivel) => {
            const total = snapshot.alertas.filter((a) => a.severity === nivel).length;
            return (
              <Button
                key={nivel}
                size="sm"
                variant={severidad === nivel ? "default" : "outline"}
                onClick={() => setSeveridad(nivel)}
                disabled={total === 0}
              >
                {etiquetaSeveridad[nivel]}
                <Badge variant="secondary" className="ml-2">
                  {total}
                </Badge>
              </Button>
            );
          })}
        </CardContent>
      </Card>

      {alertas.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No hay alertas con esta severidad. Prueba otra categoría o vuelve al tablero.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {alertas.map((alerta) => (
            <AlertCard key={alerta.id} alerta={alerta} />
          ))}
        </div>
      )}
    </div>
  );
}
