import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { DemoNote } from "@/components/ui/demo-note";
import { PageHeader } from "@/components/layout/page-header";
import { EtapaFooter, EtapaProgreso } from "@/components/recorrido/etapa-nav";
import { EtapasJourney } from "@/components/journey/etapas-journey";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { DashboardFiltersBar } from "@/components/dashboard/dashboard-filters";
import { DimensionProgressList } from "@/components/dashboard/dimension-progress-list";
import {
  ActionStatusChart,
  DateComplianceCard,
} from "@/components/dashboard/action-status-chart";
import { AlertSummaryCard } from "@/components/dashboard/alert-card";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { NextActionCard } from "@/components/dashboard/next-action-card";
import {
  DashboardEmptyState,
  DashboardErrorState,
  DashboardPartialWarning,
} from "@/components/dashboard/dashboard-states";
import { StateBadge } from "@/components/roadmap/state-badge";
import { useDashboard } from "@/hooks/use-dashboard";
import { useSesion } from "@/hooks/use-sesion";
import { formatearFechaHora } from "@/lib/roadmap/fechas";
import { registrarEvento } from "@/lib/analytics";
import { useEffect } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  Gauge,
  Layers,
  ListChecks,
  ShieldAlert,
  Target,
} from "lucide-react";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [
      { title: "Indicadores y seguimiento — pymapa" },
      {
        name: "description",
        content:
          "Tablero de indicadores del modelo de transformación digital: madurez, avance del plan, cumplimiento de fechas y próxima acción recomendada.",
      },
      { property: "og:title", content: "Indicadores y seguimiento — pymapa" },
      {
        property: "og:description",
        content:
          "Madurez digital, avance del Roadmap, alertas y próxima acción recomendada en una sola vista.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const {
    estado,
    snapshot,
    filtros,
    actualizarFiltros,
    restablecerFiltros,
    filtrosActivos,
    responsables,
    dimensiones,
    errorCalculo,
    modoDemo,
    cargarDemo,
  } = useDashboard();
  const { isHydrated } = useSesion();

  useEffect(() => {
    if (estado === "listo") registrarEvento("dashboard_viewed", { period: filtros.period });
    if (estado === "error") registrarEvento("dashboard_error", { errorCode: errorCalculo ?? "" });
  }, [estado, filtros.period, errorCalculo]);

  const cabecera = (
    <PageHeader
      titulo="Indicadores y seguimiento"
      subtitulo="Una lectura honesta de tu avance: qué mejoró, qué está detenido y qué sigue."
      migas={[{ label: "Inicio", to: "/inicio" }, { label: "Indicadores" }]}
      acciones={
        <Button variant="link" className="h-auto px-0" asChild>
          <Link to="/roadmap">Ver el Roadmap (consulta)</Link>
        </Button>
      }
    />
  );

  if (estado === "cargando" || !isHydrated) {
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
        <EtapasJourney />
        <DashboardEmptyState
          variante={estado}
          {...(estado === "sin_diagnostico" ? { onCargarDemo: cargarDemo } : {})}
        />

      <EtapaProgreso modulo="indicadores" />
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

  const m = snapshot.metricas;

  return (
    <div className="space-y-6">
      {cabecera}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">Estado general</CardTitle>
              <CardDescription>
                Diagnóstico del {formatearFechaHora(snapshot.diagnosticGeneratedAt)} ·{" "}
                {snapshot.roadmapUpdatedAt
                  ? `Roadmap actualizado el ${formatearFechaHora(snapshot.roadmapUpdatedAt)}`
                  : "Roadmap sin actualizaciones registradas"}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{snapshot.maturityLabel}</Badge>
              <Badge variant="outline">Periodo: {snapshot.periodo.etiqueta}</Badge>
              {snapshot.esDemo && <Badge variant="outline">Datos de demostración</Badge>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {snapshot.accionesFiltradas.length} acción(es) del Roadmap entran en el cálculo con los
          filtros actuales. Versión del tablero: {snapshot.version}.
        </CardContent>
      </Card>

      <DashboardFiltersBar
        filtros={filtros}
        dimensiones={dimensiones}
        responsables={responsables}
        activos={filtrosActivos}
        onCambiar={actualizarFiltros}
        onRestablecer={restablecerFiltros}
      />

      <DashboardPartialWarning modulos={snapshot.modulosConError} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard metrica={m["KPI-01"]} icono={Gauge} destacada />
        <KpiCard metrica={m["KPI-02"]} icono={Target} />
        <KpiCard metrica={m["KPI-07"]} icono={Layers} />
        <KpiCard metrica={m["KPI-05"]} icono={CalendarCheck} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <NextActionCard accion={snapshot.recomendacion} justificacion={m["KPI-10"].contexto} />
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          <KpiCard metrica={m["KPI-04"]} icono={AlertTriangle} />
          <KpiCard metrica={m["KPI-08"]} icono={ShieldAlert} />
          <KpiCard metrica={m["KPI-03"]} icono={ListChecks} />
          <KpiCard metrica={m["KPI-09"]} icono={Activity} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DimensionProgressList dimensiones={snapshot.dimensiones} />
        <div className="space-y-4">
          <ActionStatusChart
            distribucion={snapshot.distribucionEstados}
            total={snapshot.accionesFiltradas.length}
          />
          <DateComplianceCard cumplimiento={snapshot.cumplimiento} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {snapshot.tendencias.map((serie) => (
          <TrendChart key={serie.metricId} serie={serie} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AlertSummaryCard alertas={snapshot.alertas} />
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Prioridades críticas abiertas</CardTitle>
            <CardDescription>
              Acciones de mayor prioridad que aún no están completadas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {snapshot.prioridadesCriticas.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay prioridades críticas abiertas con los filtros actuales.
              </p>
            ) : (
              <ul className="space-y-3">
                {snapshot.prioridadesCriticas.slice(0, 5).map((accion) => (
                  <li
                    key={accion.id}
                    className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{accion.titulo}</p>
                      <p className="text-xs text-muted-foreground">
                        {accion.origen.dimensionNombre} · Prioridad {accion.prioridadOrigenLabel}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StateBadge estado={accion.estado} />
                      <Button size="sm" variant="outline" asChild>
                        <Link to="/roadmap/$accion" params={{ accion: accion.id }}>
                          Abrir
                        </Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <ActivityTimeline eventos={snapshot.actividad} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Explorar en detalle</CardTitle>
          <CardDescription>
            Cada indicador es trazable hasta su origen en el diagnóstico o en el Roadmap.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to="/dashboard/alertas">
              Centro de alertas
              <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/resultados">Resultados del diagnóstico</Link>
          </Button>
          <Button variant="link" className="h-auto px-0" asChild>
            <Link to="/roadmap">Roadmap de ejecución (consulta)</Link>
          </Button>
        </CardContent>
      </Card>

      {modoDemo && (
        <DemoNote>
          Estás viendo indicadores calculados sobre un Roadmap de demostración. Las tendencias
          históricas se limitan al diagnóstico vigente; la comparación entre diagnósticos llegará en
          paquetes posteriores.
        </DemoNote>
      )}
      <EtapaFooter modulo="indicadores" />
    </div>
  );
}
