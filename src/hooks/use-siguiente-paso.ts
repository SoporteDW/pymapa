import { useMemo } from "react";
import { useSesion } from "./use-sesion";
import { useWorkspace } from "./use-workspace";
import { useEstadoDiagnostico } from "./use-estado-diagnostico";
import { useSeguimiento } from "./use-seguimiento";
import { useDelegacion } from "./use-delegacion";
import { useApoyoHumano } from "./use-apoyo-humano";
import { useHitosJourney } from "./use-hitos-journey";
import { useJourney } from "./use-journey";
import { useActuar } from "./use-actuar";
import {
  pendientesDelRecorrido,
  siguientePasoOrquestado,
} from "@/lib/siguiente-paso/orquestador";

/**
 * Home como orquestador: reúne el estado real de todas las capas y delega la
 * decisión en una función pura. La UI solo pinta el paso resultante.
 */
export function useSiguientePaso() {
  const { sesion, isHydrated } = useSesion();
  const workspace = useWorkspace();
  const seguimiento = useSeguimiento();
  const delegacion = useDelegacion();
  const apoyo = useApoyoHumano();
  const diagnostico = useEstadoDiagnostico();
  const { hitos } = useHitosJourney();
  // Etapa activa: fuente única del Journey. El Home solo ofrece trabajo de ella.
  const { activa } = useJourney();
  // Estado del Plan proyectado desde el Workspace (fuente única de ejecución).
  const { plan } = useActuar();

  const contexto = useMemo(
    () => ({
      sesion,
      necesidades: diagnostico.necesidades.filter((n) => !n.resuelta),
      profundizacion: diagnostico.journey.profundizacion,
      diagnosticoCerrado: diagnostico.cerrado,
      actividades: workspace.actividades,
      seguimientos: seguimiento.seguimientos,
      delegaciones: delegacion.delegaciones,
      apoyos: apoyo.recomendaciones,
      hitos: {
        entradaActuar: hitos.entradaActuar,
        cierrePlan: hitos.cierrePlan,
        entradaSeguir: hitos.entradaSeguir,
      },
      plan: {
        construido: plan.construido,
        total: plan.total,
        validadas: plan.validadas,
        cerrado: plan.cerrado,
      },
    }),
    [
      sesion,
      diagnostico.necesidades,
      diagnostico.journey.profundizacion,
      diagnostico.cerrado,
      workspace.actividades,
      seguimiento.seguimientos,
      delegacion.delegaciones,
      apoyo.recomendaciones,
      hitos.entradaActuar,
      hitos.cierrePlan,
      hitos.entradaSeguir,
      plan,
    ]
  );

  const pendientes = useMemo(
    () => pendientesDelRecorrido(contexto, { etapaActiva: activa }),
    [contexto, activa]
  );
  const paso = useMemo(
    () => siguientePasoOrquestado(contexto, { etapaActiva: activa }),
    [contexto, activa]
  );

  return {
    hidratado: isHydrated && workspace.hidratado && diagnostico.hidratado,
    paso,
    pendientes,
    /** Pendientes distintos del paso principal, para la lista del Home. */
    otrosPendientes: pendientes.slice(1),
  };
}
