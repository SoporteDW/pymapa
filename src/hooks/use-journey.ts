import { useMemo } from "react";

import { useSesion } from "./use-sesion";
import { useEstadoDiagnostico } from "./use-estado-diagnostico";
import { useActuar } from "./use-actuar";
import { useSeguimiento } from "./use-seguimiento";
import { useHitosJourney } from "./use-hitos-journey";
import { journeyMaestro, type EtapaJourneyId } from "@/lib/journey/etapas";

/**
 * Macroentrega 5 · Estado de las cuatro etapas visibles del Journey Maestro.
 *
 * Reúne el estado real de las capas ya construidas (perfil, diagnóstico, Plan
 * proyectado desde el Workspace, seguimiento) y delega la decisión en una
 * función pura. La interfaz solo pinta etapas, bloqueos y el único CTA que
 * corresponde.
 */
export function useJourney() {
  const { sesion, isHydrated } = useSesion();
  const diagnostico = useEstadoDiagnostico();
  const actuar = useActuar();
  const seguimiento = useSeguimiento();
  const { hitos } = useHitosJourney();

  const journey = useMemo(
    () =>
      journeyMaestro({
        perfilCompletado:
          sesion.perfilCompletado && sesion.empresa.nombre.trim().length > 0,
        estadoDiagnostico: diagnostico.journey.estado,
        plan: {
          construido: actuar.plan.construido,
          total: actuar.plan.total,
          validadas: actuar.plan.validadas,
          cerrado: actuar.plan.cerrado,
        },
        cierrePlanConfirmado: hitos.cierrePlan,
        seguimientos: seguimiento.seguimientos.map((s) => ({
          cerrado: s.estado === "cerrado",
          conMedicion: s.hitos.some((h) => h.medicion !== null),
        })),
      }),
    [
      sesion.perfilCompletado,
      sesion.empresa.nombre,
      diagnostico.journey.estado,
      actuar.plan,
      hitos.cierrePlan,
      seguimiento.seguimientos,
    ]
  );

  return {
    hidratado: isHydrated && diagnostico.hidratado && actuar.hidratado,
    journey,
    etapas: journey.etapas,
    activa: journey.activa,
    /** Estado del Plan proyectado desde el Workspace (fuente única de ejecución). */
    plan: actuar.plan,
    /** null cuando la etapa ya se puede trabajar. */
    bloqueoDe: (id: EtapaJourneyId) => journey.bloqueo(id),
    diagnostico,
  };
}
