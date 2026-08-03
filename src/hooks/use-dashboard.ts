import { useCallback, useEffect, useMemo, useState } from "react";
import { useRoadmap } from "@/hooks/use-roadmap";
import { construirDashboard } from "@/lib/dashboard/servicio";
import {
  filtrosDashboardIniciales,
  filtrosActivos,
  responsablesDelDashboard,
} from "@/lib/dashboard/filtros";
import { registrarEvento } from "@/lib/analytics";
import type { DashboardFilters, DashboardSnapshot } from "@/lib/dashboard/tipos";

export type EstadoDashboard =
  | "cargando"
  | "sin_diagnostico"
  | "sin_roadmap"
  | "error"
  | "listo";

const CLAVE_FILTROS = "pyme-digital:dashboard:filtros";

function leerFiltros(): DashboardFilters {
  if (typeof window === "undefined") return filtrosDashboardIniciales;
  try {
    const guardado = window.sessionStorage.getItem(CLAVE_FILTROS);
    if (!guardado) return filtrosDashboardIniciales;
    return { ...filtrosDashboardIniciales, ...(JSON.parse(guardado) as DashboardFilters) };
  } catch {
    return filtrosDashboardIniciales;
  }
}

/**
 * Servicio de dashboard del POC-07: coordina los insumos de resultados y
 * Roadmap con las reglas de cálculo de src/lib/dashboard. La lógica de negocio
 * no vive aquí; este hook solo orquesta estado de interfaz y filtros.
 */
export function useDashboard() {
  const {
    roadmap,
    estado: estadoRoadmap,
    resultado,
    estadoResultados,
    modoDemo,
    escenarios,
    aplicarEscenario,
  } = useRoadmap();

  const [filtros, setFiltros] = useState<DashboardFilters>(filtrosDashboardIniciales);
  const [hidratado, setHidratado] = useState(false);
  const [errorCalculo, setErrorCalculo] = useState<string | null>(null);

  useEffect(() => {
    setFiltros(leerFiltros());
    setHidratado(true);
  }, []);

  const actualizarFiltros = useCallback((cambios: Partial<DashboardFilters>) => {
    setFiltros((previos) => {
      const siguientes = { ...previos, ...cambios };
      try {
        window.sessionStorage.setItem(CLAVE_FILTROS, JSON.stringify(siguientes));
      } catch {
        /* los filtros siguen vigentes en memoria */
      }
      registrarEvento("dashboard_filters_changed", {
        period: siguientes.period,
        dimensionId: siguientes.dimensionId,
      });
      return siguientes;
    });
  }, []);

  /**
   * Demostración del tablero: aplica un escenario de resultados del POC-05 para
   * que existan diagnóstico y Roadmap derivados del mismo insumo.
   */
  const cargarDemo = useCallback(() => {
    const primero = escenarios[0];
    if (primero) aplicarEscenario(primero.id);
  }, [escenarios, aplicarEscenario]);

  const restablecerFiltros = useCallback(() => {
    setFiltros(filtrosDashboardIniciales);
    try {
      window.sessionStorage.removeItem(CLAVE_FILTROS);
    } catch {
      /* sin efecto */
    }
    registrarEvento("dashboard_filters_reset", {});
  }, []);

  const snapshot = useMemo<DashboardSnapshot | null>(() => {
    if (!resultado) return null;
    try {
      const salida = construirDashboard({ resultado, roadmap, filtros });
      setErrorCalculo(null);
      return salida;
    } catch (error) {
      console.warn("No se pudo construir el dashboard:", error);
      setErrorCalculo("DB-500");
      return null;
    }
  }, [resultado, roadmap, filtros]);

  const estado: EstadoDashboard = useMemo(() => {
    if (!hidratado || estadoResultados === "cargando" || estadoRoadmap === "cargando") {
      return "cargando";
    }
    if (errorCalculo || estadoResultados === "error") return "error";
    if (!resultado) return "sin_diagnostico";
    if (!roadmap) return "sin_roadmap";
    return snapshot ? "listo" : "error";
  }, [hidratado, estadoResultados, estadoRoadmap, errorCalculo, resultado, roadmap, snapshot]);

  const responsables = useMemo(
    () => (roadmap ? responsablesDelDashboard(roadmap) : []),
    [roadmap]
  );

  return {
    estado,
    snapshot,
    resultado,
    roadmap,
    filtros,
    actualizarFiltros,
    restablecerFiltros,
    filtrosActivos: filtrosActivos(filtros),
    responsables,
    dimensiones: resultado?.dimensions ?? [],
    errorCalculo,
    modoDemo,
    cargarDemo,
  };
}
