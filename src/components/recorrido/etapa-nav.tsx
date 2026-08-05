import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useSesion } from "@/hooks/use-sesion";
import {
  avanceModulos,
  etiquetaEstadoModulo,
  moduloAnterior,
  moduloPorId,
  moduloSiguiente,
  type ModuloId,
} from "@/lib/recorrido-modulos";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";

const tonoEstado = {
  no_iniciada: "border-border bg-muted text-muted-foreground",
  en_progreso: "border-primary/40 bg-primary/10 text-primary",
  completada: "border-success/50 bg-success/10 text-success",
} as const;

/** Indicador permanente de avance de la etapa actual. */
export function EtapaProgreso({ modulo, className }: { modulo: ModuloId; className?: string }) {
  const { sesion, isHydrated } = useSesion();
  const info = moduloPorId(modulo);
  const avance = avanceModulos(sesion)[modulo];

  if (!isHydrated) return null;

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 shadow-suave", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          Etapa {info.numero} de 6 · {info.label}
        </p>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn("rounded-full", tonoEstado[avance.estado])}>
            {etiquetaEstadoModulo[avance.estado]}
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
 * Controles de navegación comunes a todas las etapas: guardar progreso,
 * etapa anterior y siguiente etapa. El avance se guarda automáticamente, así
 * que el usuario puede abandonar una etapa sin perder información.
 */
export function EtapaNav({ modulo, className }: { modulo: ModuloId; className?: string }) {
  const { registrarActividad, updatePreferencias } = useSesion();
  const info = moduloPorId(modulo);
  const anterior = moduloAnterior(modulo);
  const siguiente = moduloSiguiente(modulo);

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
        "flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-suave sm:flex-row sm:items-center sm:justify-between",
        className
      )}
      aria-label="Navegación entre etapas del recorrido"
    >
      <Button variant="ghost" onClick={guardar}>
        <Save className="mr-2 h-4 w-4" aria-hidden="true" />
        Guardar progreso
      </Button>
      <div className="flex flex-wrap gap-2">
        {anterior ? (
          <Button variant="outline" asChild>
            <Link to={anterior.ruta}>
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Etapa anterior: {anterior.label}
            </Link>
          </Button>
        ) : (
          <Button variant="outline" asChild>
            <Link to="/inicio">
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Volver al inicio
            </Link>
          </Button>
        )}
        {siguiente && (
          <Button asChild>
            <Link to={siguiente.ruta}>
              Siguiente etapa: {siguiente.label}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        )}
      </div>
    </nav>
  );
}

/** Sugerencia automática de continuar con la siguiente etapa del recorrido. */
export function SiguienteEtapaSugerida({ modulo }: { modulo: ModuloId }) {
  const siguiente = moduloSiguiente(modulo);
  if (!siguiente) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-foreground">
          Continúa con {siguiente.label}
        </p>
        <p className="text-sm text-muted-foreground">{siguiente.descripcion}</p>
      </div>
      <Button asChild>
        <Link to={siguiente.ruta}>
          Continuar
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Link>
      </Button>
    </div>
  );
}
