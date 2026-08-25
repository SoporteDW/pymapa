import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useSesion } from "@/hooks/use-sesion";
import { useEstadoDiagnostico } from "@/hooks/use-estado-diagnostico";
import { useActuar } from "@/hooks/use-actuar";
import {
  avanceModulos,
  etiquetaEstadoModulo,
  moduloAnterior,
  moduloPorId,
  moduloSiguiente,
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

/** Indicador permanente de avance de la etapa actual. */
export function EtapaProgreso({ modulo, className }: { modulo: ModuloId; className?: string }) {
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
            Módulo {info.numero} de {secuenciaRecorrido.length} · {info.label}
          </p>
          {etapa && (
            <p className="text-xs text-muted-foreground">
              Etapa {etapa.numero} del recorrido: {etapa.titulo}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn("rounded-full", tonoEstado[avance.estado])}>
            {modulo === "diagnostico" ? journey.etiqueta : etiquetaEstadoModulo[avance.estado]}
          </Badge>
          <span className="text-sm font-semibold text-foreground">{avance.porcentaje}%</span>
        </div>
      </div>
      <Progress
        value={avance.porcentaje}
        className="mt-3"
        aria-label={`Avance de la etapa ${info.label}`}
      />
    </div>
  );
}

/**
 * Navegación única al cierre de cada módulo: guardar progreso, módulo anterior
 * y un solo llamado de continuidad hacia el siguiente módulo (antes existían
 * "Continuar" y "Siguiente etapa" haciendo exactamente lo mismo).
 */
export function EtapaFooter({ modulo, className }: { modulo: ModuloId; className?: string }) {
  const { sesion, isHydrated, registrarActividad, updatePreferencias } = useSesion();
  const info = moduloPorId(modulo);
  const anterior = moduloAnterior(modulo);
  const siguiente = moduloSiguiente(modulo);
  const { journey } = useEstadoDiagnostico();
  const { plan } = useActuar();
  const avance = isHydrated ? avanceModulos(sesion, journey, metricasActuar(plan))[modulo] : null;
  const completado = avance?.estado === "completada";

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
      aria-label="Navegación entre etapas del recorrido"
    >
      <div className="min-w-0">
        {siguiente ? (
          <>
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              {completado && (
                <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
              )}
              {completado
                ? `${info.label} completado · continúa con ${siguiente.label}`
                : `Después de ${info.label} continúas con ${siguiente.label}`}
            </p>
            <p className="text-sm text-muted-foreground">{siguiente.descripcion}</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Este es el último módulo del recorrido: aquí revisas tu avance y defines el siguiente
            ciclo.
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
        {siguiente && (
          <Button asChild>
            <Link to={siguiente.ruta}>
              Continuar: {siguiente.label}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        )}
      </div>
    </nav>
  );
}

