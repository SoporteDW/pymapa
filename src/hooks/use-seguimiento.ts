import { useCallback, useEffect, useMemo, useState } from "react";
import { useSesion } from "./use-sesion";
import { useWorkspace } from "./use-workspace";
import { useApoyoHumano } from "./use-apoyo-humano";
import {
  guardarRegistro,
  leerRegistro,
  registroVacio,
} from "@/lib/seguimiento/repositorio";
import {
  asegurarSeguimiento,
  obtenerSeguimiento,
  proximoHitoPendiente,
  registrarDerivacion,
  registrarEvaluacion,
  registrarMedicion,
  type EntradaMedicion,
} from "@/lib/seguimiento/servicio";
import {
  idActividadComplementaria,
  motivoReapertura,
  plantillaComplementaria,
} from "@/lib/seguimiento/derivaciones";
import { registrarEvento } from "@/lib/analytics";
import type {
  HitoSeguimientoId,
  RegistroSeguimientoEmpresa,
  SeguimientoActividad,
} from "@/lib/seguimiento/tipos";

/**
 * B7 · Seguimiento y auditoría continua. Abre seguimiento sobre las actividades
 * ya validadas del workspace (nunca sobre actividades inventadas) y aplica la
 * decisión resultante volviendo al recorrido: reabrir, complementar o pedir apoyo.
 */
export function useSeguimiento(actividadId?: string) {
  const { sesion, isHydrated } = useSesion();
  const workspace = useWorkspace();
  const apoyo = useApoyoHumano();

  const empresaId = sesion.empresa.id || "empresa-local";
  const empresaNombre = sesion.empresa.nombre.trim() || "Tu empresa";

  const [registro, setRegistro] = useState<RegistroSeguimientoEmpresa>(() =>
    registroVacio(empresaId, empresaNombre)
  );
  const [hidratado, setHidratado] = useState(false);

  useEffect(() => {
    if (!isHydrated) return;
    setRegistro(leerRegistro(empresaId, empresaNombre));
    setHidratado(true);
  }, [isHydrated, empresaId, empresaNombre]);

  const persistir = useCallback((siguiente: RegistroSeguimientoEmpresa) => {
    setRegistro(guardarRegistro(siguiente));
    return siguiente;
  }, []);

  /** Abre seguimiento de todas las actividades validadas (idempotente). */
  useEffect(() => {
    if (!hidratado || !workspace.hidratado) return;
    const validadas = workspace.actividades.filter((a) => a.estado === "validado");
    if (validadas.length === 0) return;
    let actual = leerRegistro(empresaId, empresaNombre);
    let cambio = false;
    for (const actividad of validadas) {
      const resultado = asegurarSeguimiento(actual, { actividad, empresaId });
      if (resultado.registro !== actual) {
        cambio = true;
        registrarEvento("seguimiento_created", {
          actividadId: actividad.id,
          indicador: resultado.seguimiento?.indicador.id ?? "",
        });
      }
      actual = resultado.registro;
    }
    if (cambio) persistir(actual);
  }, [hidratado, workspace.hidratado, workspace.actividades, empresaId, empresaNombre, persistir]);

  const seguimiento = actividadId ? (obtenerSeguimiento(registro, actividadId) ?? null) : null;

  const medir = useCallback(
    (seguimientoId: string, hitoId: HitoSeguimientoId, entrada: EntradaMedicion) => {
      const { registro: siguiente } = registrarMedicion(
        leerRegistro(empresaId, empresaNombre),
        seguimientoId,
        hitoId,
        entrada
      );
      persistir(siguiente);
      registrarEvento("seguimiento_milestone_recorded", { seguimientoId, hito: hitoId });
    },
    [empresaId, empresaNombre, persistir]
  );

  const evaluar = useCallback(
    (seguimientoId: string) => {
      const { registro: siguiente, evaluacion } = registrarEvaluacion(
        leerRegistro(empresaId, empresaNombre),
        seguimientoId
      );
      persistir(siguiente);
      if (evaluacion) {
        registrarEvento("seguimiento_evaluated", {
          seguimientoId,
          resultado: evaluacion.resultado,
          decision: evaluacion.decision,
          simulada: true,
        });
      }
      return evaluacion;
    },
    [empresaId, empresaNombre, persistir]
  );

  /**
   * Aplica la decisión de la evaluación sobre el recorrido: reabre la actividad,
   * crea la complementaria o registra la salida a apoyo humano.
   */
  const aplicarDecision = useCallback(
    (objetivo: SeguimientoActividad) => {
      const evaluacion = objetivo.evaluacion;
      if (!evaluacion) return null;
      let referenciaId = objetivo.actividadId;

      if (evaluacion.decision === "reabrir_actividad") {
        workspace.reabrir(objetivo.actividadId, motivoReapertura(objetivo), objetivo.id);
      } else if (evaluacion.decision === "actividad_complementaria") {
        const creada = workspace.crearDerivada(plantillaComplementaria(objetivo));
        referenciaId = creada?.id ?? idActividadComplementaria(objetivo);
      } else if (evaluacion.decision === "apoyo_especializado") {
        const recomendaciones = apoyo.evaluar(
          { resultadoSeguimiento: evaluacion.resultado },
          {
            tipo: "seguimiento",
            referenciaId: objetivo.actividadId,
            referenciaTitulo: objetivo.actividadTitulo,
            dominioId: objetivo.dominioId,
            dominioNombre: objetivo.dominioNombre,
            rutaRetorno: `/seguimiento/${objetivo.actividadId}`,
          }
        );
        referenciaId = recomendaciones[0]?.id ?? objetivo.actividadId;
      }

      persistir(
        registrarDerivacion(
          leerRegistro(empresaId, empresaNombre),
          objetivo.id,
          evaluacion.decision,
          referenciaId
        )
      );
      registrarEvento("seguimiento_decision_applied", {
        seguimientoId: objetivo.id,
        decision: evaluacion.decision,
      });
      return evaluacion.decision;
    },
    [workspace, apoyo, empresaId, empresaNombre, persistir]
  );

  const conHitoPendiente = useMemo(
    () =>
      registro.seguimientos.filter(
        (s) => s.estado !== "cerrado" && proximoHitoPendiente(s) !== null
      ),
    [registro.seguimientos]
  );

  return {
    hidratado: hidratado && workspace.hidratado,
    seguimientos: registro.seguimientos,
    seguimiento,
    conHitoPendiente,
    proximoHito: seguimiento ? proximoHitoPendiente(seguimiento) : null,
    medir,
    evaluar,
    aplicarDecision,
  };
}
