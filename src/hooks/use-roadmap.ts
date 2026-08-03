import { useCallback, useEffect, useMemo, useState } from "react";
import { registrarEvento, type EventoInteraccion } from "@/lib/analytics";
import { useResultados } from "@/hooks/use-resultados";
import { alertasDelRoadmap } from "@/lib/roadmap/alertas";
import { proximaAccion, resumirRoadmap } from "@/lib/roadmap/avance";
import { construirCronograma } from "@/lib/roadmap/cronograma";
import { construirRoadmapDemo, EXECUTION_ID_DEMO } from "@/lib/roadmap/demo";
import { generarRoadmap } from "@/lib/roadmap/generador";
import {
  borrarRoadmap,
  guardarRoadmap,
  leerRoadmap,
} from "@/lib/roadmap/repositorio";
import {
  filtrarAccionesRoadmap,
  filtrosRoadmapIniciales,
  type FiltrosRoadmap,
} from "@/lib/roadmap/filtros";
import {
  actualizarAvance,
  actualizarPlanificacion,
  agregarEvidencia,
  agregarNota,
  alternarPaso,
  bloquearAccion,
  buscarAccion,
  cambiarEstado,
  descartarAccion,
  eliminarEvidencia,
  historialDe,
  moverAFase,
  type ResultadoOperacion,
} from "@/lib/roadmap/operaciones";
import type {
  AccionRoadmap,
  EstadoAccionRoadmap,
  FaseId,
  Roadmap,
  TipoBloqueo,
  TipoEvidencia,
} from "@/lib/roadmap/tipos";
import type { NivelPrioridad } from "@/lib/resultados/tipos";

export type EstadoRoadmap = "cargando" | "vacio" | "error" | "listo";

export interface MensajeRoadmap {
  tono: "ok" | "aviso";
  texto: string;
}

/**
 * Servicio de Roadmap del POC-06: coordina generación, persistencia y
 * operaciones sobre el plan. La lógica de negocio vive en src/lib/roadmap.
 */
export function useRoadmap() {
  const {
    estado: estadoResultados,
    resultado,
    escenarioId,
    escenarios,
    aplicarEscenario,
  } = useResultados();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [estado, setEstado] = useState<EstadoRoadmap>("cargando");
  const [mensaje, setMensaje] = useState<MensajeRoadmap | null>(null);
  const [filtros, setFiltros] = useState<FiltrosRoadmap>(filtrosRoadmapIniciales);
  const [modoDemo, setModoDemo] = useState(false);

  // Carga o generación inicial del plan a partir del resultado vigente.
  useEffect(() => {
    if (modoDemo) return;
    if (estadoResultados === "cargando") {
      setEstado("cargando");
      return;
    }
    if (estadoResultados === "error") {
      setEstado("error");
      return;
    }
    if (!resultado || resultado.actions.length === 0) {
      setRoadmap(null);
      setEstado("vacio");
      return;
    }

    try {
      const guardado = leerRoadmap(resultado.executionId);
      if (guardado) {
        setRoadmap(guardado);
        setEstado("listo");
        return;
      }
      const generado = generarRoadmap(resultado);
      guardarRoadmap(generado);
      setRoadmap(generado);
      setEstado("listo");
      registrarEvento("roadmap_generated", {
        executionId: generado.executionId,
        acciones: generado.acciones.length,
      });
    } catch (error) {
      console.warn("No se pudo preparar el Roadmap:", error);
      setEstado("error");
    }
  }, [estadoResultados, resultado, modoDemo]);

  /** Aplica una operación de negocio y persiste el resultado. */
  const aplicar = useCallback(
    (
      operacion: (actual: Roadmap) => ResultadoOperacion,
      evento?: EventoInteraccion
    ): ResultadoOperacion => {
      if (!roadmap) {
        return { ok: false, roadmap: null as unknown as Roadmap, mensaje: "No hay plan cargado." };
      }
      const salida = operacion(roadmap);
      if (salida.ok) {
        setRoadmap(salida.roadmap);
        guardarRoadmap(salida.roadmap);
        if (salida.mensaje) setMensaje({ tono: "ok", texto: salida.mensaje });
        if (evento) registrarEvento(evento, { executionId: salida.roadmap.executionId });
      } else if (salida.mensaje && !salida.requiereConfirmacion) {
        setMensaje({ tono: "aviso", texto: salida.mensaje });
      }
      return salida;
    },
    [roadmap]
  );

  const acciones = useMemo(
    () => ({
      cambiarEstado: (
        accionId: string,
        nuevoEstado: EstadoAccionRoadmap,
        opciones?: { comentario?: string; confirmado?: boolean }
      ) =>
        aplicar(
          (actual) => cambiarEstado(actual, accionId, nuevoEstado, opciones ?? {}),
          "roadmap_state_changed"
        ),
      alternarPaso: (accionId: string, pasoId: string) =>
        aplicar((actual) => alternarPaso(actual, accionId, pasoId), "roadmap_step_toggled"),
      actualizarAvance: (accionId: string, porcentaje: number) =>
        aplicar(
          (actual) => actualizarAvance(actual, accionId, porcentaje),
          "roadmap_progress_updated"
        ),
      bloquear: (accionId: string, tipo: TipoBloqueo, descripcion: string) =>
        aplicar(
          (actual) => bloquearAccion(actual, accionId, tipo, descripcion),
          "roadmap_action_blocked"
        ),
      desbloquear: (accionId: string, resolucion: string) =>
        aplicar(
          (actual) => cambiarEstado(actual, accionId, "EN_CURSO", { comentario: resolucion }),
          "roadmap_action_unblocked"
        ),
      descartar: (accionId: string, motivo: string) =>
        aplicar((actual) => descartarAccion(actual, accionId, motivo), "roadmap_action_discarded"),
      agregarNota: (accionId: string, texto: string) =>
        aplicar((actual) => agregarNota(actual, accionId, texto), "roadmap_note_added"),
      agregarEvidencia: (
        accionId: string,
        tipo: TipoEvidencia,
        descripcion: string,
        referencia: string
      ) =>
        aplicar(
          (actual) => agregarEvidencia(actual, accionId, tipo, descripcion, referencia),
          "roadmap_evidence_added"
        ),
      eliminarEvidencia: (accionId: string, evidenciaId: string) =>
        aplicar((actual) => eliminarEvidencia(actual, accionId, evidenciaId)),
      actualizarPlanificacion: (
        accionId: string,
        cambios: {
          responsable?: string;
          fechaInicio?: string | null;
          fechaObjetivo?: string | null;
          prioridadOperativa?: NivelPrioridad;
        }
      ) =>
        aplicar(
          (actual) => actualizarPlanificacion(actual, accionId, cambios),
          "roadmap_action_rescheduled"
        ),
      moverAFase: (accionId: string, fase: FaseId) =>
        aplicar((actual) => moverAFase(actual, accionId, fase), "roadmap_phase_changed"),
    }),
    [aplicar]
  );

  const cargarDemo = useCallback(() => {
    const demo = construirRoadmapDemo();
    guardarRoadmap(demo);
    setModoDemo(true);
    setRoadmap(demo);
    setEstado("listo");
    setMensaje({ tono: "ok", texto: "Plan de demostración cargado." });
    registrarEvento("roadmap_demo_loaded", { executionId: EXECUTION_ID_DEMO });
  }, []);

  const reiniciar = useCallback(() => {
    if (roadmap) borrarRoadmap(roadmap.executionId);
    setModoDemo(false);
    setRoadmap(null);
    setEstado("cargando");
    setMensaje({ tono: "ok", texto: "El plan se regeneró desde tus resultados." });
  }, [roadmap]);

  /**
   * POC-09 (D-02): distingue el vacío por falta de diagnóstico del vacío
   * legítimo de una pyme madura sin brechas ni riesgos accionables.
   */
  const sinAccionesPorMadurez = useMemo(
    () => Boolean(resultado) && resultado!.actions.length === 0,
    [resultado]
  );

  const resumen = useMemo(() => (roadmap ? resumirRoadmap(roadmap) : null), [roadmap]);
  const alertas = useMemo(() => (roadmap ? alertasDelRoadmap(roadmap) : []), [roadmap]);
  const cronograma = useMemo(() => (roadmap ? construirCronograma(roadmap) : null), [roadmap]);
  const siguiente = useMemo(() => (roadmap ? proximaAccion(roadmap) : null), [roadmap]);
  const accionesFiltradas = useMemo(
    () => (roadmap ? filtrarAccionesRoadmap(roadmap, filtros) : []),
    [roadmap, filtros]
  );

  const obtenerAccion = useCallback(
    (accionId: string): AccionRoadmap | null => (roadmap ? buscarAccion(roadmap, accionId) ?? null : null),
    [roadmap]
  );

  const obtenerHistorial = useCallback(
    (accionId: string) => (roadmap ? historialDe(roadmap, accionId) : []),
    [roadmap]
  );

  return {
    estado,
    sinAccionesPorMadurez,
    roadmap,
    resumen,
    alertas,
    cronograma,
    siguiente,
    filtros,
    setFiltros,
    accionesFiltradas,
    mensaje,
    limpiarMensaje: () => setMensaje(null),
    acciones,
    obtenerAccion,
    obtenerHistorial,
    cargarDemo,
    reiniciar,
    modoDemo,
    escenarioId,
    /** Insumos del POC-05 reexpuestos para el dashboard del POC-07. */
    resultado,
    estadoResultados,
    escenarios,
    aplicarEscenario,

  };
}
