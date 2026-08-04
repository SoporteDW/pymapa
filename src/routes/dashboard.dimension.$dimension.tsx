import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { StateBadge } from "@/components/roadmap/state-badge";
import { AlertCard } from "@/components/dashboard/alert-card";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { DateComplianceCard } from "@/components/dashboard/action-status-chart";
import { DashboardEmptyState, DashboardErrorState } from "@/components/dashboard/dashboard-states";
import { useDashboard } from "@/hooks/use-dashboard";
import { cumplimientoFechas } from "@/lib/dashboard/metricas";
import { calcularAvance } from "@/lib/roadmap/avance";
import { formatearFecha } from "@/lib/roadmap/fechas";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/dashboard/dimension/$dimension")({
  head: () => ({
    meta: [
      { title: "Detalle por dimensión — pymapa" },
      {
        name: "description",
        content:
          "Madurez, acciones asociadas y alertas de una dimensión específica de tu transformación digital.",
      },
      { property: "og:title", content: "Detalle por dimensión — pymapa" },
      {
        property: "og:description",
        content:
          "Madurez, acciones asociadas y alertas de una dimensión específica de tu transformación digital.",
      },
    ],
  }),
  component: DimensionDetailPage,
});

function DimensionDetailPage() {
  const { dimension: dimensionId } = Route.useParams();
  const { estado, snapshot, errorCalculo, restablecerFiltros, cargarDemo } = useDashboard();

  const item = useMemo(
    () => snapshot?.dimensiones.find((d) => d.dimensionId === dimensionId) ?? null,
    [snapshot, dimensionId]
  );

  const acciones = useMemo(
    () =>
      (snapshot?.accionesFiltradas ?? []).filter((a) => a.origen.dimensionId === dimensionId),
    [snapshot, dimensionId]
  );

  const alertas = useMemo(
    () => (snapshot?.alertas ?? []).filter((a) => a.dimensionId === dimensionId),
    [snapshot, dimensionId]
  );

  const actividad = useMemo(() => {
    const ids = new Set(acciones.map((a) => a.id));
    return (snapshot?.actividad ?? []).filter(
      (evento) => evento.relatedEntityType !== "accion" || ids.has(evento.relatedEntityId)
    );
  }, [snapshot, acciones]);

  const cabecera = (
    <PageHeader
      titulo={item ? item.nombre : "Detalle por dimensión"}
      subtitulo="Cómo se compone el indicador de esta dimensión y qué acciones lo mueven."
      migas={[
        { label: "Inicio", to: "/inicio" },
        { label: "Indicadores", to: "/dashboard" },
        { label: item ? item.nombre : "Dimensión" },
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

  if (!item) {
    return (
      <div className="space-y-6">
        {cabecera}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No encontramos esta dimensión</CardTitle>
            <CardDescription>
              La dimensión solicitada no forma parte del diagnóstico vigente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/dashboard">Volver al tablero</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {cabecera}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">Madurez de la dimensión</CardTitle>
              <Badge variant="secondary">{item.nivelLabel}</Badge>
            </div>
            <CardDescription>{item.interpretacion}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Progress
                value={item.madurez}
                aria-label={`Madurez de ${item.nombre}: ${item.madurez} de 100`}
              />
              <span className="text-sm font-semibold tabular-nums">{item.madurez}/100</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {item.hallazgos} hallazgo(s) y {item.prioridades} prioridad(es) provienen de esta
              dimensión.
              {item.parcial && " La lectura es parcial: faltan respuestas por completar."}
            </p>
            <Button variant="link" className="h-auto px-0" asChild>
              <Link to="/resultados/$dimension" params={{ dimension: item.dimensionId }}>
                Ver resultados de la dimensión
                <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Avance de las acciones</CardTitle>
            <CardDescription>
              {item.totalAcciones === 0
                ? "Sin acciones asociadas en el Roadmap."
                : `${item.completadas} de ${item.totalAcciones} acciones completadas.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {item.avanceAcciones === null ? (
              <p className="text-sm text-muted-foreground">Sin información disponible</p>
            ) : (
              <div className="flex items-center gap-3">
                <Progress
                  value={item.avanceAcciones}
                  aria-label={`Avance de acciones de ${item.nombre}: ${item.avanceAcciones} por ciento`}
                />
                <span className="text-sm font-semibold tabular-nums">{item.avanceAcciones}%</span>
              </div>
            )}
            <ul className="grid grid-cols-2 gap-3 text-sm">
              <li className="rounded-lg border border-border p-3">
                <p className="text-muted-foreground">Bloqueadas</p>
                <p className="text-lg font-semibold tabular-nums">{item.bloqueadas}</p>
              </li>
              <li className="rounded-lg border border-border p-3">
                <p className="text-muted-foreground">Vencidas</p>
                <p className="text-lg font-semibold tabular-nums">{item.vencidas}</p>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <DateComplianceCard cumplimiento={cumplimientoFechas(acciones)} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Acciones de esta dimensión</CardTitle>
          <CardDescription>
            Cada acción conserva su trazabilidad hasta el hallazgo que la originó.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {acciones.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay acciones asociadas con los filtros actuales.
            </p>
          ) : (
            <ul className="space-y-3">
              {acciones.map((accion) => (
                <li
                  key={accion.id}
                  className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">{accion.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      Prioridad {accion.prioridadOrigenLabel} ·{" "}
                      {accion.fechaObjetivo
                        ? `Fecha objetivo ${formatearFecha(accion.fechaObjetivo)}`
                        : "Sin fecha objetivo"}{" "}
                      · Avance {calcularAvance(accion)}%
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

      {alertas.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Alertas de la dimensión</h2>
          {alertas.map((alerta) => (
            <AlertCard key={alerta.id} alerta={alerta} />
          ))}
        </div>
      )}

      <ActivityTimeline
        eventos={actividad}
        titulo="Actividad de esta dimensión"
        limite={8}
      />
    </div>
  );
}
