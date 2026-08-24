import { useMemo } from "react";

import { useSesion } from "./use-sesion";
import { useEstadoDiagnostico } from "./use-estado-diagnostico";
import { useWorkspace } from "./use-workspace";
import { useSeguimiento } from "./use-seguimiento";
import { journeyMaestro, resumenEjecucion, type EtapaJourneyId } from "@/lib/journey/etapas";

/**
 * Macroentrega 5 · Estado de las cuatro etapas visibles del Journey Maestro.
 *
 * Reúne el estado real de las capas ya construidas (perfil, diagnóstico,
 * workspace, seguimiento) y delega la decisión en una función pura. La interfaz
 * solo pinta etapas, bloqueos y el único CTA que corresponde.
 */
export function useJourney() {
  const { sesion, isHydrated } = useSesion();
  const diagnostico = useEstadoDiagnostico();
  const workspace = useWorkspace();
  const seguimiento = useSeguimiento();

  const journey = useMemo(
    () =>
      journeyMaestro({
        perfilCompletado:
          sesion.perfilCompletado && sesion.empresa.nombre.trim().length > 0,
        estadoDiagnostico: diagnostico.journey.estado,
        actividades: workspace.actividades.map((a) => a.estado),
        seguimientos: seguimiento.seguimientos.map((s) => ({
          cerrado: s.estado === "cerrado",
          conMedicion: s.hitos.some((h) => h.medicion !== null),
        })),
      }),
    [
      sesion.perfilCompletado,
      sesion.empresa.nombre,
      diagnostico.journey.estado,
      workspace.actividades,
      seguimiento.seguimientos,
    ]
  );

  const ejecucion = useMemo(
    () => resumenEjecucion(workspace.actividades.map((a) => a.estado)),
    [workspace.actividades]
  );

  return {
    hidratado: isHydrated && diagnostico.hidratado && workspace.hidratado,
    journey,
    etapas: journey.etapas,
    activa: journey.activa,
    ejecucion,
    /** null cuando la etapa ya se puede trabajar. */
    bloqueoDe: (id: EtapaJourneyId) => journey.bloqueo(id),
    diagnostico,
  };
}
