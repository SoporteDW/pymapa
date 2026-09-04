import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useSesion } from "@/hooks/use-sesion";
import { useEstadoDiagnostico } from "@/hooks/use-estado-diagnostico";
import { useActuar } from "@/hooks/use-actuar";
import { useSiguientePaso } from "@/hooks/use-siguiente-paso";
import {
  avanceModulos,
  etiquetaEstadoModulo,
  moduloAnterior,
  moduloPorId,
  secuenciaRecorrido,
  type ModuloId,
} from "@/lib/recorrido-modulos";
import { etapasJourney } from "@/lib/journey/etapas";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CheckCircle2, Save } from "lucide-react";

/** Métricas de ejecución del Plan tal como las espera `avanceModulos`. */
function metricasActuar(plan: {
  total: number;
  validadas: number;
  enEjecucion: number;
  entregadas: number;
  requierenAjustes: number;
  cerrado: boolean;
}) {
  return {
    total: plan.total,
    validadas: plan.validadas,
    enCurso: plan.enEjecucion + plan.entregadas + plan.requierenAjustes,
    cerrado: plan.cerrado,
  };
}

const tonoEstado = {
  no_iniciada: "border-border bg-muted text-muted-foreground",
  en_progreso: "border-primary/40 bg-primary/10 text-primary",
  completada: "border-success/50 bg-success/10 text-success",
} as const;

/**
 * Indicador permanente de avance de la etapa actual.
 *
 * `ocultarPorcentaje` se usa donde la pantalla ya muestra un progreso propio y
 * más literal (por ejemplo "0 de 3 Actividades validadas" en el Plan de
 * Acción): el porcentaje de módulo competiría semánticamente y podría leerse
 * como ejecución del Plan. La lógica de módulos no cambia, solo su visibilidad.
 */
export function EtapaProgreso({
  modulo,
  className,
  ocultarPorcentaje = false,
  estadoTexto,
}: {
  modulo: ModuloId;
  className?: string;
  ocultarPorcentaje?: boolean;
  estadoTexto?: string | undefined;
}) {
  const { sesion, isHydrated } = useSesion();
  const info = moduloPorId(modulo);
  const { journey } = useEstadoDiagnostico();
  const { plan } = useActuar();
  const avance = avanceModulos(sesion, journey, metricasActuar(plan))[modulo];
  const etapa = etapasJourney.find((e) => e.id === info.etapa);

  if (!isHydrated) return null;

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 shadow-suave", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            {ocultarPorcentaje
              ? info.label
              : `Módulo ${info.numero} de ${secuenciaRecorrido.length} · ${info.label}`}
          </p>
          {etapa && (
            <p className="text-xs text-muted-foreground">
              Etapa {etapa.numero} del recorrido: {etapa.titulo}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn("rounded-full", tonoEstado[avance.estado])}>
            {estadoTexto ??
              (modulo === "diagnostico" ? journey.etiqueta : etiquetaEstadoModulo[avance.estado])}
          </Badge>
          {!ocultarPorcentaje && (
            <span className="text-sm font-semibold text-foreground">{avance.porcentaje}%</span>
          )}
        </div>
      </div>
      {!ocultarPorcentaje && (
        <Progress
          value={avance.porcentaje}
          className="mt-3"
          aria-label={`Avance de la etapa ${info.label}`}
        />
      )}
    </div>
  );
}

/**
 * Cierre de cada módulo. El único CTA de AVANZAR es el siguiente paso oficial
 * del Journey Maestro (orquestador), nunca la secuencia legacy de módulos: al
 * cerrar el Plan de Acción el avance es Seguir, no "Indicadores".
 */
export function EtapaFooter({ modulo, className }: { modulo: ModuloId; className?: string }) {
  const { sesion, isHydrated, registrarActividad, updatePreferencias } = useSesion();
  const info = moduloPorId(modulo);
  const anterior = moduloAnterior(modulo);
  const { journey } = useEstadoDiagnostico();
  const { plan } = useActuar();
  const { paso, hidratado } = useSiguientePaso();
  const avance = isHydrated ? avanceModulos(sesion, journey, metricasActuar(plan))[modulo] : null;
  const completado = avance?.estado === "completada";
  const etapaPaso = etapasJourney.find((e) => e.id === paso.etapa);
  // Si el siguiente paso oficial es esta misma pantalla, no hay nada que ofrecer.
  const avanzar = hidratado && paso.ruta !== info.ruta ? paso : null;

  const guardar = () => {
    updatePreferencias({ ultimaRuta: info.ruta });
    registrarActividad("sistema", `Se guardó el progreso en ${info.label}.`);
    toast.success("Progreso guardado.", {
      description: "Puedes salir y continuar después desde donde quedaste.",
    });
  };

  return (
    <nav
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-4 shadow-suave sm:flex-row sm:items-center sm:justify-between",
        completado ? "border-primary/25 bg-primary/5" : "border-border bg-card",
        className
      )}
      aria-label="Navegación del recorrido"
    >
      <div className="min-w-0">
        {avanzar ? (
          <>
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              {completado && <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />}
              Tu siguiente paso
              {etapaPaso ? ` · Etapa ${etapaPaso.numero} · ${etapaPaso.titulo}` : ""}:{" "}
              {avanzar.titulo}
            </p>
            <p className="text-sm text-muted-foreground">{avanzar.descripcion}</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Esta pantalla es de consulta: tu recorrido continúa desde el inicio, donde pymapa
            mantiene un único siguiente paso.
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" onClick={guardar}>
          <Save className="mr-2 h-4 w-4" aria-hidden="true" />
          Guardar progreso
        </Button>
        <Button variant="outline" asChild>
          <Link to={anterior ? anterior.ruta : "/inicio"}>
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            {anterior ? anterior.label : "Volver al inicio"}
          </Link>
        </Button>
        {avanzar && (
          <Button asChild>
            <Link to={avanzar.ruta}>
              {avanzar.label}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        )}
      </div>
    </nav>
  );
}


