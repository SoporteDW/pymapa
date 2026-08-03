/**
 * Casos de prueba mínimos del POC-06 (sección 21) sobre la capa de negocio.
 * TP-06-01 a TP-06-10, salvo los verificables solo en interfaz (móvil).
 */

import { describe, expect, it } from "vitest";
import { DEFINITION_VERSION } from "@/lib/diagnostico/definicion";
import { ejecutarMotor } from "@/lib/motor/motor";
import { escenariosResultados } from "@/lib/resultados/escenarios";
import { generarResultados } from "@/lib/resultados/generador";
import { construirRoadmapDemo } from "./demo";
import { generarRoadmap, recalcularDependientes } from "./generador";
import { calcularAvance, progresoGeneral, proximaAccion, resumirRoadmap } from "./avance";
import { alertasDelRoadmap } from "./alertas";
import { dependenciasPendientes, estadoDerivado, transicionValida } from "./estados";
import { filtrarAccionesRoadmap, filtrosRoadmapIniciales } from "./filtros";
import { horizonteSugerido } from "./fases";
import { construirCronograma } from "./cronograma";
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
} from "./operaciones";
import type { Roadmap } from "./tipos";

const HOY = "2026-03-02";

function resultadoDe(escenarioId: string) {
  const escenario = escenariosResultados.find((e) => e.id === escenarioId)!;
  return generarResultados(
    ejecutarMotor({
      diagnosisId: escenario.diagnosisId,
      definitionVersion: DEFINITION_VERSION,
      respuestas: escenario.respuestas,
    })
  );
}

function roadmapDemo(): Roadmap {
  return construirRoadmapDemo(HOY);
}

describe("Generación del Roadmap (TP-06-01)", () => {
  it("crea una acción por Ficha de Acción con fase, fechas y trazabilidad", () => {
    const resultado = resultadoDe("ESC-05-01");
    const roadmap = generarRoadmap(resultado, { hoy: HOY });

    expect(roadmap.acciones).toHaveLength(resultado.actions.length);
    expect(roadmap.acciones.length).toBeGreaterThan(0);
    for (const accion of roadmap.acciones) {
      expect(accion.origen.fichaAccionId).toBe(accion.fichaAccionId);
      expect(accion.origen.executionId).toBe(resultado.executionId);
      expect(accion.fechaInicio).not.toBeNull();
      expect(accion.fechaObjetivo!.localeCompare(accion.fechaInicio!)).toBeGreaterThan(0);
      expect(accion.orden).toBeGreaterThan(0);
    }
  });

  it("el Roadmap de demostración cumple los datos mínimos del POC-06 (16)", () => {
    const roadmap = roadmapDemo();
    const resumen = resumirRoadmap(roadmap, HOY);

    expect(roadmap.acciones.length).toBeGreaterThanOrEqual(12);
    expect(new Set(roadmap.acciones.map((a) => a.faseId)).size).toBe(3);
    expect(roadmap.acciones.filter((a) => a.dependencias.length > 0).length).toBeGreaterThanOrEqual(2);
    expect(resumen.sinResponsable).toBeGreaterThanOrEqual(2);
    expect(resumen.vencidas).toBeGreaterThanOrEqual(1);
    expect(resumen.bloqueadas).toBeGreaterThanOrEqual(1);
    expect(resumen.completadas).toBeGreaterThanOrEqual(1);
    expect(resumen.enCurso).toBeGreaterThanOrEqual(1);
  });

  it("respeta la tabla de horizonte sugerido y no adelanta dependientes", () => {
    expect(horizonteSugerido("alta", "bajo", false)).toBe("ahora");
    expect(horizonteSugerido("alta", "alto", true)).toBe("proximamente");
    expect(horizonteSugerido("media", "medio", false)).toBe("proximamente");
    expect(horizonteSugerido("baja", "bajo", false)).toBe("mas_adelante");

    const roadmap = roadmapDemo();
    const ordenFase = { ahora: 1, proximamente: 2, mas_adelante: 3 } as const;
    for (const accion of roadmap.acciones) {
      for (const depId of accion.dependencias) {
        const dep = buscarAccion(roadmap, depId)!;
        expect(ordenFase[accion.faseId]).toBeGreaterThan(ordenFase[dep.faseId]);
      }
    }
  });
});

describe("Transiciones de estado (TP-06-02, TP-06-03, TP-06-04)", () => {
  it("inicia una acción sin dependencias y registra historial", () => {
    const roadmap = roadmapDemo();
    const lista = roadmap.acciones.find((a) => a.estado === "LISTA")!;
    const resultado = cambiarEstado(roadmap, lista.id, "EN_CURSO");

    expect(resultado.ok).toBe(true);
    expect(buscarAccion(resultado.roadmap, lista.id)!.estado).toBe("EN_CURSO");
    expect(historialDe(resultado.roadmap, lista.id)[0]!.tipo).toBe("cambio_estado");
  });

  it("impide iniciar una acción con dependencia pendiente y explica la causa", () => {
    const roadmap = roadmapDemo();
    const dependiente = roadmap.acciones.find(
      (a) => a.dependencias.length > 0 && dependenciasPendientes(roadmap, a).length > 0
    )!;
    const resultado = cambiarEstado(roadmap, dependiente.id, "EN_CURSO");

    expect(resultado.ok).toBe(false);
    expect(resultado.mensaje).toContain("primero debe avanzar");
    expect(estadoDerivado(roadmap, dependiente)).toBe("PENDIENTE");
  });

  it("bloquea y reanuda conservando el avance y registrando eventos", () => {
    const roadmap = roadmapDemo();
    const enCurso = roadmap.acciones.find((a) => a.estado === "EN_CURSO")!;
    const avancePrevio = calcularAvance(enCurso);

    const bloqueado = bloquearAccion(roadmap, enCurso.id, "recurso", "Falta presupuesto aprobado.");
    expect(bloqueado.ok).toBe(true);
    expect(buscarAccion(bloqueado.roadmap, enCurso.id)!.estado).toBe("BLOQUEADA");
    expect(calcularAvance(buscarAccion(bloqueado.roadmap, enCurso.id)!)).toBe(avancePrevio);

    const reanudado = cambiarEstado(bloqueado.roadmap, enCurso.id, "EN_CURSO", {
      comentario: "Presupuesto aprobado.",
    });
    expect(reanudado.ok).toBe(true);
    expect(calcularAvance(buscarAccion(reanudado.roadmap, enCurso.id)!)).toBe(avancePrevio);
    expect(
      reanudado.roadmap.bloqueos
        .filter((b) => b.accionId === enCurso.id)
        .every((b) => b.estado === "resuelto")
    ).toBe(true);
    expect(historialDe(reanudado.roadmap, enCurso.id).length).toBeGreaterThanOrEqual(3);
  });

  it("exige descripción para bloquear y rechaza transiciones inválidas", () => {
    const roadmap = roadmapDemo();
    const pendiente = roadmap.acciones.find((a) => a.estado === "PENDIENTE")!;

    expect(bloquearAccion(roadmap, pendiente.id, "otro", "no").ok).toBe(false);
    expect(cambiarEstado(roadmap, pendiente.id, "BLOQUEADA").ok).toBe(false);
    expect(transicionValida("PENDIENTE", "COMPLETADA")).toBe(false);
    expect(transicionValida("EN_CURSO", "COMPLETADA")).toBe(true);
  });
});

describe("Avance, cierre y evidencias (TP-06-05)", () => {
  it("completa con checklist, pide confirmación y exige evidencia", () => {
    const roadmap = roadmapDemo();
    const enCurso = roadmap.acciones.find(
      (a) => a.estado === "EN_CURSO" && a.evidencias.length === 0 && a.notas.length === 0
    );
    const objetivo = enCurso ?? roadmap.acciones.find((a) => a.estado === "EN_CURSO")!;

    const sinEvidencia = cambiarEstado(
      { ...roadmap, acciones: roadmap.acciones.map((a) => (a.id === objetivo.id ? { ...a, notas: [], evidencias: [] } : a)) },
      objetivo.id,
      "COMPLETADA"
    );
    expect(sinEvidencia.ok).toBe(false);
    expect(sinEvidencia.mensaje).toContain("evidencia");

    const conEvidencia = agregarEvidencia(
      roadmap,
      objetivo.id,
      "enlace",
      "Tablero compartido",
      "https://ejemplo.local/tablero"
    );
    expect(conEvidencia.ok).toBe(true);

    const pideConfirmacion = cambiarEstado(conEvidencia.roadmap, objetivo.id, "COMPLETADA");
    expect(pideConfirmacion.ok).toBe(false);
    expect(pideConfirmacion.requiereConfirmacion).toBe(true);

    const completada = cambiarEstado(conEvidencia.roadmap, objetivo.id, "COMPLETADA", {
      confirmado: true,
    });
    const final = buscarAccion(completada.roadmap, objetivo.id)!;
    expect(final.estado).toBe("COMPLETADA");
    expect(calcularAvance(final)).toBe(100);
    expect(final.checklist.every((p) => p.completado)).toBe(true);
    expect(eliminarEvidencia(completada.roadmap, objetivo.id, final.evidencias[0]!.id).ok).toBe(false);
  });

  it("calcula avance por checklist y permite avance declarado sin pasos", () => {
    const roadmap = roadmapDemo();
    const conChecklist = roadmap.acciones.find(
      (a) => a.checklist.length > 0 && a.estado === "EN_CURSO"
    )!;
    const marcado = alternarPaso(roadmap, conChecklist.id, conChecklist.checklist[0]!.id);
    expect(marcado.ok).toBe(true);
    expect(actualizarAvance(marcado.roadmap, conChecklist.id, 80).ok).toBe(false);

    const sinPasos: Roadmap = {
      ...roadmap,
      acciones: roadmap.acciones.map((a) =>
        a.id === conChecklist.id ? { ...a, checklist: [], avance: 0 } : a
      ),
    };
    const declarado = actualizarAvance(sinPasos, conChecklist.id, 75);
    expect(declarado.ok).toBe(true);
    expect(calcularAvance(buscarAccion(declarado.roadmap, conChecklist.id)!)).toBe(75);
    expect(progresoGeneral(declarado.roadmap)).toBeGreaterThan(0);
  });

  it("agrega notas fechadas y las registra en el historial", () => {
    const roadmap = roadmapDemo();
    const accion = roadmap.acciones[0]!;
    const resultado = agregarNota(roadmap, accion.id, "Revisión semanal realizada.");
    expect(resultado.ok).toBe(true);
    const actualizada = buscarAccion(resultado.roadmap, accion.id)!;
    expect(actualizada.notas[0]!.fecha).toBeTruthy();
    expect(historialDe(resultado.roadmap, accion.id)[0]!.tipo).toBe("nota");
  });
});

describe("Reprogramación y secuencia (TP-06-06)", () => {
  it("valida fechas y desplaza solo las dependientes afectadas", () => {
    const roadmap = roadmapDemo();
    const predecesora = roadmap.acciones.find((a) =>
      roadmap.acciones.some((otra) => otra.dependencias.includes(a.id))
    )!;
    const dependiente = roadmap.acciones.find((a) => a.dependencias.includes(predecesora.id))!;

    const invalida = actualizarPlanificacion(roadmap, predecesora.id, {
      fechaInicio: "2026-05-01",
      fechaObjetivo: "2026-04-01",
    });
    expect(invalida.ok).toBe(false);
    expect(invalida.mensaje).toContain("anterior");

    const nuevaFin = "2026-09-30";
    const valida = actualizarPlanificacion(roadmap, predecesora.id, {
      fechaInicio: "2026-09-01",
      fechaObjetivo: nuevaFin,
    });
    expect(valida.ok).toBe(true);
    const dependienteFinal = buscarAccion(valida.roadmap, dependiente.id)!;
    expect(dependienteFinal.fechaInicio!.localeCompare(nuevaFin)).toBeGreaterThan(0);
    expect(historialDe(valida.roadmap, predecesora.id)[0]!.tipo).toBe("reprogramacion");

    const intactas = roadmap.acciones.filter(
      (a) => a.id !== predecesora.id && !a.dependencias.includes(predecesora.id)
    );
    for (const accion of intactas) {
      expect(buscarAccion(valida.roadmap, accion.id)!.fechaInicio).toBe(accion.fechaInicio);
    }
  });

  it("conserva la prioridad de origen al ajustar la prioridad operativa", () => {
    const roadmap = roadmapDemo();
    const accion = roadmap.acciones.find((a) => a.prioridadOrigen === "media")!;
    const resultado = actualizarPlanificacion(roadmap, accion.id, { prioridadOperativa: "baja" });
    const final = buscarAccion(resultado.roadmap, accion.id)!;
    expect(final.prioridadOperativa).toBe("baja");
    expect(final.prioridadOrigen).toBe("media");
  });

  it("registra el cambio de fase y conserva la fase original", () => {
    const roadmap = roadmapDemo();
    const accion = roadmap.acciones.find((a) => a.faseId === "mas_adelante")!;
    const resultado = moverAFase(roadmap, accion.id, "ahora");
    const final = buscarAccion(resultado.roadmap, accion.id)!;
    expect(final.faseId).toBe("ahora");
    expect(final.faseOriginal).toBe("mas_adelante");
    expect(historialDe(resultado.roadmap, accion.id)[0]!.tipo).toBe("fase");
  });

  it("recalcularDependientes no toca acciones sin relación", () => {
    const roadmap = roadmapDemo();
    const antes = roadmap.acciones.map((a) => a.fechaInicio);
    const despues = recalcularDependientes(roadmap.acciones, "ACC-INEXISTENTE").map(
      (a) => a.fechaInicio
    );
    expect(despues).toEqual(antes);
  });
});

describe("Filtros, alertas y cronograma (TP-06-07, CA-06-09)", () => {
  it("filtra vencidas, bloqueadas y por búsqueda", () => {
    const roadmap = roadmapDemo();
    const vencidas = filtrarAccionesRoadmap(
      roadmap,
      { ...filtrosRoadmapIniciales, soloVencidas: true },
      HOY
    );
    expect(vencidas.length).toBeGreaterThan(0);
    expect(vencidas.every((a) => a.fechaObjetivo! < HOY)).toBe(true);

    const bloqueadas = filtrarAccionesRoadmap(roadmap, {
      ...filtrosRoadmapIniciales,
      soloBloqueadas: true,
    });
    expect(bloqueadas.every((a) => a.estado === "BLOQUEADA")).toBe(true);

    const sinResponsable = filtrarAccionesRoadmap(roadmap, {
      ...filtrosRoadmapIniciales,
      responsable: "sin_responsable",
    });
    expect(sinResponsable.every((a) => a.responsable === "")).toBe(true);

    const termino = roadmap.acciones[0]!.titulo.split(" ")[0]!;
    const busqueda = filtrarAccionesRoadmap(roadmap, {
      ...filtrosRoadmapIniciales,
      busqueda: termino,
    });
    expect(busqueda.length).toBeGreaterThan(0);
  });

  it("genera las alertas operativas definidas", () => {
    const alertas = alertasDelRoadmap(roadmapDemo(), HOY);
    const tipos = new Set(alertas.map((a) => a.tipo));
    expect(tipos.has("vencida")).toBe(true);
    expect(tipos.has("bloqueada")).toBe(true);
    expect(tipos.has("sin_responsable")).toBe(true);
    expect(tipos.has("sin_fecha")).toBe(true);
    expect(tipos.has("dependencia")).toBe(true);
    expect(alertas[0]!.severidad).toBe("critica");
  });

  it("construye el cronograma con meses, barras y sección por programar", () => {
    const cronograma = construirCronograma(roadmapDemo(), HOY);
    expect(cronograma.meses.length).toBeGreaterThan(1);
    expect(cronograma.grupos.some((g) => g.barras.length > 0)).toBe(true);
    expect(cronograma.porProgramar.length).toBeGreaterThanOrEqual(1);
    expect(cronograma.marcadorHoy).not.toBeNull();
    for (const grupo of cronograma.grupos) {
      for (const barra of grupo.barras) {
        expect(barra.offset).toBeGreaterThanOrEqual(0);
        expect(barra.ancho).toBeGreaterThan(0);
      }
    }
  });

  it("propone como próxima acción una lista o en curso de mayor prioridad", () => {
    const proxima = proximaAccion(roadmapDemo())!;
    expect(proxima).toBeTruthy();
    expect(["EN_CURSO", "LISTA", "PAUSADA", "PENDIENTE"]).toContain(proxima.estado);
    expect(proxima.estado).not.toBe("BLOQUEADA");
  });
});

describe("Descarte y trazabilidad (TP-06-10)", () => {
  it("exige motivo y conserva el registro", () => {
    const roadmap = roadmapDemo();
    const accion = roadmap.acciones.find((a) => a.estado === "PENDIENTE")!;

    expect(descartarAccion(roadmap, accion.id, "no").ok).toBe(false);

    const resultado = descartarAccion(roadmap, accion.id, "La empresa cambió de proveedor.");
    expect(resultado.ok).toBe(true);
    const final = buscarAccion(resultado.roadmap, accion.id)!;
    expect(final.estado).toBe("DESCARTADA");
    expect(final.motivoDescarte).toContain("proveedor");
    expect(resultado.roadmap.acciones).toHaveLength(roadmap.acciones.length);
    expect(
      filtrarAccionesRoadmap(resultado.roadmap, filtrosRoadmapIniciales).some(
        (a) => a.id === accion.id
      )
    ).toBe(false);
  });

  it("mantiene el vínculo con la ficha y el hallazgo de origen", () => {
    const resultado = resultadoDe("ESC-05-02");
    const roadmap = generarRoadmap(resultado, { hoy: HOY });
    for (const accion of roadmap.acciones) {
      const ficha = resultado.actions.find((f) => f.id === accion.fichaAccionId);
      expect(ficha).toBeTruthy();
      expect(accion.origen.prioridadId).toBe(ficha!.priorityId);
      expect(accion.origen.dimensionNombre).toBe(ficha!.dimensionNombre);
    }
  });
});
