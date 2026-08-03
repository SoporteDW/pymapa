import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { registrarEvento } from "@/lib/analytics";
import { ArrowRight, HelpCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { DestinoIndicador, MetricValue } from "@/lib/dashboard/tipos";

const SUFIJO: Record<MetricValue["unit"], string> = {
  puntos: "/100",
  porcentaje: "%",
  acciones: "",
  eventos: "",
  texto: "",
};

/** Traduce el destino declarado por el indicador en un enlace de la aplicación. */
export function EnlaceIndicador({
  detalle,
  etiqueta = "Ver origen",
  metricId,
}: {
  detalle: DestinoIndicador | null;
  etiqueta?: string;
  metricId?: string | undefined;
}) {
  if (!detalle) return null;
  const registrar = () =>
    registrarEvento("dashboard_kpi_opened", { metricId: metricId ?? "", destino: detalle.tipo });

  const contenido = (
    <>
      {etiqueta}
      <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
    </>
  );

  if (detalle.tipo === "resultados") {
    return (
      <Button variant="link" className="h-auto px-0" asChild onClick={registrar}>
        <Link to="/resultados">{contenido}</Link>
      </Button>
    );
  }
  if (detalle.tipo === "dimension") {
    return (
      <Button variant="link" className="h-auto px-0" asChild onClick={registrar}>
        <Link to="/dashboard/dimension/$dimension" params={{ dimension: detalle.dimensionId }}>
          {contenido}
        </Link>
      </Button>
    );
  }
  if (detalle.tipo === "accion") {
    return (
      <Button variant="link" className="h-auto px-0" asChild onClick={registrar}>
        <Link to="/roadmap/$accion" params={{ accion: detalle.accionId }}>
          {contenido}
        </Link>
      </Button>
    );
  }
  if (detalle.tipo === "alertas") {
    return (
      <Button variant="link" className="h-auto px-0" asChild onClick={registrar}>
        <Link to="/dashboard/alertas">{contenido}</Link>
      </Button>
    );
  }
  return (
    <Button variant="link" className="h-auto px-0" asChild onClick={registrar}>
      <Link to="/roadmap">{contenido}</Link>
    </Button>
  );
}

/** Tarjeta de indicador con valor, contexto, periodo y acceso al origen. */
export function KpiCard({
  metrica,
  icono: Icono,
  destacada = false,
  className,
}: {
  metrica: MetricValue;
  icono?: LucideIcon;
  destacada?: boolean;
  className?: string;
}) {
  const sinDatos = metrica.status === "sin_datos";

  return (
    <Card className={cn(destacada && "border-primary/40", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardDescription className="flex items-center gap-2">
            {Icono ? (
              <Icono className="h-4 w-4" aria-hidden="true" />
            ) : (
              <HelpCircle className="h-4 w-4" aria-hidden="true" />
            )}
            {metrica.titulo}
          </CardDescription>
          <Badge variant="outline" className="shrink-0 text-[10px]">
            {metrica.metricId}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {sinDatos ? (
          <p className="text-sm font-medium text-muted-foreground">Sin información disponible</p>
        ) : (
          <p className="text-3xl font-bold tabular-nums text-foreground">
            {metrica.texto ?? (
              <>
                {metrica.value}
                <span className="text-base font-medium text-muted-foreground">
                  {SUFIJO[metrica.unit]}
                </span>
              </>
            )}
          </p>
        )}
        <p className="text-sm text-muted-foreground">{metrica.contexto}</p>
        {(metrica.unit === "porcentaje" || metrica.unit === "puntos") && !sinDatos && (
          <Progress
            value={metrica.value ?? 0}
            aria-label={`${metrica.titulo}: ${metrica.value}${SUFIJO[metrica.unit]}`}
          />
        )}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            Periodo: {metrica.periodStart} a {metrica.periodEnd}
          </span>
          <EnlaceIndicador detalle={metrica.detalle} metricId={metrica.metricId} />
        </div>
      </CardContent>
    </Card>
  );
}

/** Tarjeta con título propio y barra de progreso reutilizable. */
export function ProgressCard({
  titulo,
  descripcion,
  valor,
  detalle,
  metricId,
}: {
  titulo: string;
  descripcion: string;
  valor: number | null;
  detalle?: DestinoIndicador | null;
  metricId?: string | undefined;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{titulo}</CardTitle>
        <CardDescription>{descripcion}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {valor === null ? (
          <p className="text-sm text-muted-foreground">Sin información disponible</p>
        ) : (
          <div className="flex items-center gap-3">
            <Progress value={valor} aria-label={`${titulo}: ${valor} por ciento`} />
            <span className="text-sm font-semibold tabular-nums">{valor}%</span>
          </div>
        )}
        <EnlaceIndicador detalle={detalle ?? null} metricId={metricId} />
      </CardContent>
    </Card>
  );
}
