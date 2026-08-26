import { useCallback, useEffect, useMemo, useState } from "react";
import { registrarEvento, type EventoInteraccion } from "@/lib/analytics";
import { useResultados } from "@/hooks/use-resultados";
import { useWorkspace } from "@/hooks/use-workspace";
import {
  actividadDeAccion,
  avanceDesdeEjecucion,
  estadoUnificado,
} from "@/lib/sincronizacion/estado-actividad";
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
import { buscarAccion, historialDe } from "@/lib/roadmap/operaciones";
import type { AccionRoadmap, Roadmap } from "@/lib/roadmap/tipos";

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
  const { actividades } = useWorkspace();
  const [roadmapBase, setRoadmap] = useState<Roadmap | null>(null);

  /**
   * Workspace es la única fuente de verdad de la ejecución: el Roadmap NO
   * guarda un estado propio que compita con ella, lo proyecta al leerlo.
   */
  const roadmap = useMemo<Roadmap | null>(() => {
    if (!roadmapBase) return null;
    return {
      ...roadmapBase,
      acciones: roadmapBase.acciones.map((accion) => {
        const actividad = actividadDeAccion(actividades, accion) ?? null;
        if (!actividad) return accion;
        return {
          ...accion,
          estado: estadoUnificado(accion.estado, actividad),
          // Sin Math.max: la ejecución del Workspace es el único avance válido.
          avance: avanceDesdeEjecucion(actividad.estado),
          // Los pasos también se proyectan: el Roadmap no guarda checklist propio.
          checklist: actividad.pasos.map((paso) => ({
            id: `${accion.id}-paso-${paso.orden}`,
            texto: paso.titulo,
            completado: actividad.estado === "validado" ? true : paso.hecho,
          })),
        };
      }),
    };
  }, [roadmapBase, actividades]);
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

  /**
   * Roadmap dejó de tener estado propio editable: no cambia estados, avances,
   * fechas, notas, bloqueos ni checklists. Toda la ejecución se registra en el
   * Workspace y aquí solo se proyecta para consulta.
   */

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
