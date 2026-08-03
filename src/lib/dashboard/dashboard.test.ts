/**
 * Pruebas del dashboard e indicadores (POC-07, sección 15).
 * Cubren TP-701 a TP-708 en la parte calculable (las visuales se validan en la
 * interfaz) sobre datos reales del generador de demostración del POC-06.
 */

import { describe, expect, it } from "vitest";
import { construirRoadmapDemo } from "@/lib/roadmap/demo";
import { cambiarEstado } from "@/lib/roadmap/operaciones";
import { hoyISO, sumarDias } from "@/lib/roadmap/fechas";
import {
  avanceRoadmap,
  cumplimientoFechas,
  distribucionEstados,
  esCritica,
  esProximaAVencer,
  esVencida,
  impactoAtendido,
  antiguedadBloqueo,
  prioridadesCriticas,
  proximaAccionRecomendada,
} from "./metricas";
import { construirAlertas } from "./alertas";
import { construirActividad } from "./actividad";
import { accionesSegunFiltros, filtrosDashboardIniciales, rangoDePeriodo } from "./filtros";
import { construirDashboard } from "./servicio";
import type { ResultadoPyme } from "@/lib/resultados/tipos";
import type { Roadmap } from "@/lib/roadmap/tipos";

const HOY = hoyISO();

function resultadoDe(roadmap: Roadmap): ResultadoPyme {
  const dimensiones = [...new Set(roadmap.acciones.map((a) => a.origen.dimensionId))];
  return {
    id: "res-demo",
    diagnosticId: "diag-demo",
    executionId: roadmap.executionId,
    generatedAt: new Date().toISOString(),
    overallScore: 48.4,
    maturityLevel: "basico",
    maturityLabel: "Básico",
    maturityInterpretation: "",
    summary: {
      mensajePrincipal: "",
      fortalezaDestacada: null,
      brechaPrincipal: null,
      siguientePaso: "",
    },
    completeness: "completo",
    cobertura: 1,
    confidence: 0.8,
    nivelConfianza: "alta",
    dimensions: dimensiones.map((id) => ({
      dimensionId: id,
      nombre: roadmap.acciones.find((a) => a.origen.dimensionId === id)!.origen.dimensionNombre,
      score: 50,
      maturityLevel: "basico",
      maturityLabel: "Básico",
      interpretation: "",
      confidence: 0.8,
      nivelConfianza: "alta",
      cobertura: 1,
      parcial: false,
      fortalezas: [],
      brechas: [],
      riesgos: [],
      oportunidades: [],
      notas: [],
    })),
    fortalezas: [],
    brechas: [],
    riesgos: [],
    oportunidades: [],
    priorities: [],
    topPriorities: [],
    actions: [],
    advertencias: [],
    dimensionesAfectadas: [],
    versions: {
      resultsVersion: "x",
      actionCatalogVersion: "x",
      ruleSetVersion: "x",
      catalogVersion: "x",
      engineVersion: "x",
    },
  };
}

describe("POC-07 · reglas de cálculo del dashboard", () => {
  it("TP-701 · calcula todos los indicadores con diagnóstico y Roadmap activos", () => {
    const roadmap = construirRoadmapDemo();
    const snapshot = construirDashboard({
      resultado: resultadoDe(roadmap),
      roadmap,
      filtros: filtrosDashboardIniciales,
    });
    const ids = Object.keys(snapshot.metricas);
    expect(ids).toHaveLength(10);
    expect(snapshot.metricas["KPI-01"].value).toBe(48);
    expect(snapshot.metricas["KPI-02"].status).toBe("disponible");
    expect(snapshot.dimensiones.length).toBeGreaterThan(0);
  });

  it("TP-702 · completar una acción actualiza avance e impacto atendido", () => {
    const roadmap = construirRoadmapDemo();
    const enCurso = roadmap.acciones.find((a) => a.estado === "EN_CURSO")!;
    const antes = { avance: avanceRoadmap(roadmap.acciones), impacto: impactoAtendido(roadmap.acciones) };
    const salida = cambiarEstado(roadmap, enCurso.id, "COMPLETADA", { confirmado: true });
    expect(salida.ok).toBe(true);
    const despues = {
      avance: avanceRoadmap(salida.roadmap.acciones),
      impacto: impactoAtendido(salida.roadmap.acciones),
    };
    expect(despues.avance!).toBeGreaterThan(antes.avance!);
    expect(despues.impacto!).toBeGreaterThan(antes.impacto!);
  });

  it("TP-703 · una acción vencida aparece en cumplimiento y alertas", () => {
    const roadmap = construirRoadmapDemo();
    const vencidas = roadmap.acciones.filter((a) => esVencida(a, HOY));
    expect(vencidas.length).toBeGreaterThan(0);
    const cumplimiento = cumplimientoFechas(roadmap.acciones, HOY);
    expect(cumplimiento.vencidas).toBe(vencidas.length);
    const alertas = construirAlertas(roadmap, roadmap.acciones, HOY);
    expect(alertas.some((a) => a.type === "vencida" && a.severity === "critica")).toBe(true);
  });

  it("clasifica próxima a vencer dentro de los siguientes 7 días", () => {
    const roadmap = construirRoadmapDemo();
    const base = roadmap.acciones.find((a) => a.estado === "EN_CURSO")!;
    const proxima = { ...base, fechaObjetivo: sumarDias(HOY, 5) };
    const lejana = { ...base, fechaObjetivo: sumarDias(HOY, 30) };
    expect(esProximaAVencer(proxima, HOY)).toBe(true);
    expect(esProximaAVencer(lejana, HOY)).toBe(false);
  });

  it("TP-704 · sin Roadmap los indicadores de ejecución quedan sin datos", () => {
    const roadmap = construirRoadmapDemo();
    const snapshot = construirDashboard({
      resultado: resultadoDe(roadmap),
      roadmap: null,
      filtros: filtrosDashboardIniciales,
    });
    expect(snapshot.metricas["KPI-02"].status).toBe("sin_datos");
    expect(snapshot.metricas["KPI-02"].value).toBeNull();
    expect(snapshot.metricas["KPI-01"].status).toBe("disponible");
  });

  it("TP-705 · el filtro por dimensión restringe acciones e indicadores", () => {
    const roadmap = construirRoadmapDemo();
    const dimensionId = roadmap.acciones[0]!.origen.dimensionId;
    const acciones = accionesSegunFiltros(roadmap, {
      ...filtrosDashboardIniciales,
      dimensionId,
    });
    expect(acciones.length).toBeGreaterThan(0);
    expect(acciones.every((a) => a.origen.dimensionId === dimensionId)).toBe(true);
    const snapshot = construirDashboard({
      resultado: resultadoDe(roadmap),
      roadmap,
      filtros: { ...filtrosDashboardIniciales, dimensionId },
    });
    expect(snapshot.accionesFiltradas.length).toBe(acciones.length);
  });

  it("TP-706 · un módulo con error no impide construir el resto", () => {
    const roadmap = construirRoadmapDemo();
    const snapshot = construirDashboard({
      resultado: resultadoDe(roadmap),
      roadmap,
      filtros: filtrosDashboardIniciales,
      modulosConError: ["actividad"],
    });
    expect(snapshot.modulosConError).toContain("actividad");
    expect(snapshot.metricas["KPI-02"].status).toBe("disponible");
  });

  it("TP-708 · cada indicador con detalle declara su destino trazable", () => {
    const roadmap = construirRoadmapDemo();
    const snapshot = construirDashboard({
      resultado: resultadoDe(roadmap),
      roadmap,
      filtros: filtrosDashboardIniciales,
    });
    expect(snapshot.metricas["KPI-01"].detalle).toEqual({ tipo: "resultados" });
    expect(snapshot.metricas["KPI-04"].detalle).toEqual({ tipo: "alertas" });
    expect(snapshot.metricas["KPI-10"].detalle?.tipo).toBe("accion");
    expect(snapshot.metricas["KPI-02"].sourceIds.length).toBeGreaterThan(0);
  });

  it("CA-07 · la recomendación excluye completadas, descartadas y bloqueadas", () => {
    const roadmap = construirRoadmapDemo();
    const recomendada = proximaAccionRecomendada(roadmap, roadmap.acciones, HOY)!;
    expect(recomendada).toBeTruthy();
    expect(["COMPLETADA", "DESCARTADA", "BLOQUEADA"]).not.toContain(recomendada.estado);
  });

  it("CA-06 · clasifica bloqueos con antigüedad y prioridades críticas", () => {
    const roadmap = construirRoadmapDemo();
    const criticas = prioridadesCriticas(roadmap.acciones);
    expect(criticas.every((a) => esCritica(a))).toBe(true);
    expect(antiguedadBloqueo(sumarDias(HOY, -5), null, HOY)).toBe(5);
    expect(antiguedadBloqueo(sumarDias(HOY, -5), sumarDias(HOY, -2), HOY)).toBe(3);
  });

  it("no presenta cero como dato real cuando no hay acciones", () => {
    expect(avanceRoadmap([])).toBeNull();
    expect(impactoAtendido([])).toBeNull();
    expect(cumplimientoFechas([]).porcentajeATiempo).toBeNull();
  });

  it("la distribución por estado suma el total de acciones consideradas", () => {
    const roadmap = construirRoadmapDemo();
    const distribucion = distribucionEstados(roadmap, roadmap.acciones);
    const suma = distribucion.reduce((total, item) => total + item.cantidad, 0);
    expect(suma).toBe(roadmap.acciones.length);
  });

  it("la actividad respeta el periodo y se ordena de más reciente a más antigua", () => {
    const roadmap = construirRoadmapDemo();
    const rango = rangoDePeriodo("historico", HOY);
    const eventos = construirActividad(roadmap, roadmap.acciones, rango);
    expect(eventos.length).toBeGreaterThan(0);
    for (let i = 1; i < eventos.length; i += 1) {
      expect(eventos[i - 1]!.timestamp >= eventos[i]!.timestamp).toBe(true);
    }
    const corto = construirActividad(roadmap, roadmap.acciones, rangoDePeriodo("30", HOY));
    expect(corto.length).toBeLessThanOrEqual(eventos.length);
  });
});
