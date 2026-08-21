import { useMemo } from "react";
import { useSesion } from "./use-sesion";
import { useWorkspace } from "./use-workspace";
import { useEvidencias } from "./use-evidencias";
import { useSeguimiento } from "./use-seguimiento";
import { useDelegacion } from "./use-delegacion";
import { useApoyoHumano } from "./use-apoyo-humano";
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
  const evidencias = useEvidencias();
  const seguimiento = useSeguimiento();
  const delegacion = useDelegacion();
  const apoyo = useApoyoHumano();

  const contexto = useMemo(
    () => ({
      sesion,
      necesidades: evidencias.suficiencia.necesidadesPendientes ?? [],
      actividades: workspace.actividades,
      seguimientos: seguimiento.seguimientos,
      delegaciones: delegacion.delegaciones,
      apoyos: apoyo.recomendaciones,
    }),
    [
      sesion,
      evidencias.suficiencia,
      workspace.actividades,
      seguimiento.seguimientos,
      delegacion.delegaciones,
      apoyo.recomendaciones,
    ]
  );

  const pendientes = useMemo(() => pendientesDelRecorrido(contexto), [contexto]);
  const paso = useMemo(() => siguientePasoOrquestado(contexto), [contexto]);

  return {
    hidratado: isHydrated && workspace.hidratado,
    paso,
    pendientes,
    /** Pendientes distintos del paso principal, para la lista del Home. */
    otrosPendientes: pendientes.slice(1),
  };
}
