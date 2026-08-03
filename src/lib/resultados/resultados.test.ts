/**
 * Pruebas mínimas del POC-05 (sección 15: TP-05-01 a TP-05-07).
 * Validan determinismo, priorización explicable, fichas completas y trazabilidad.
 */

import { describe, expect, it } from "vitest";
import { DEFINITION_VERSION } from "@/lib/diagnostico/definicion";
import { ejecutarMotor } from "@/lib/motor/motor";
import { escenarioPorId, escenariosResultados } from "./escenarios";
import { filtrarAcciones, filtrosIniciales, generarResultados } from "./generador";
import { calcularScorePrioridad, construirPrioridades, nivelPorScore } from "./priorizacion";
import type { ResultadoPyme } from "./tipos";

const FECHA = new Date("2026-02-01T12:00:00.000Z");

function resultadoDe(escenarioId: string): ResultadoPyme {
  const escenario = escenarioPorId(escenarioId)!;
  const salida = ejecutarMotor({
    diagnosisId: escenario.diagnosisId,
    definitionVersion: DEFINITION_VERSION,
    respuestas: escenario.respuestas,
    fecha: FECHA,
  });
  return generarResultados(salida);
}

describe("POC-05 · fórmula de priorización (7.3)", () => {
  it("aplica los pesos definidos y el factor de confianza", () => {
    const score = calcularScorePrioridad({
      impact: 5,
      urgency: 4,
      risk: 4,
      dependency: 1,
      effort: 2,
      confidence: 1,
    });
    // (1,5 + 1,0 + 0,8 + 0,1 + 0,6) = 4,00
    expect(score).toBe(4);
    expect(nivelPorScore(score)).toBe("critica");
  });

  it("clasifica según los rangos normalizados", () => {
    expect(nivelPorScore(4.2)).toBe("critica");
    expect(nivelPorScore(3.5)).toBe("alta");
    expect(nivelPorScore(2.6)).toBe("media");
    expect(nivelPorScore(1.8)).toBe("baja");
  });
});

describe("TP-05-01 · escenario incipiente", () => {
  const resultado = resultadoDe("ESC-05-01");

  it("produce un puntaje bajo con nivel inicial o básico", () => {
    expect(resultado.overallScore).toBeLessThan(50);
    expect(["inicial", "basico"]).toContain(resultado.maturityLevel);
  });

  it("genera prioridades críticas o altas coherentes", () => {
    const relevantes = resultado.priorities.filter(
      (p) => p.level === "critica" || p.level === "alta"
    );
    expect(relevantes.length).toBeGreaterThan(0);
    expect(resultado.topPriorities.length).toBeLessThanOrEqual(5);
    expect(resultado.topPriorities[0]!.level).toBe(resultado.priorities[0]!.level);
  });

  it("entrega Fichas de Acción con todos los campos obligatorios", () => {
    expect(resultado.actions.length).toBeGreaterThan(0);
    for (const ficha of resultado.actions) {
      expect(ficha.id).toBeTruthy();
      expect(ficha.title).toBeTruthy();
      expect(ficha.problem).toBeTruthy();
      expect(ficha.whyItMatters).toBeTruthy();
      expect(ficha.priorityLevel).toBeTruthy();
      expect(ficha.impactExpected).toBeTruthy();
      expect(["bajo", "medio", "alto"]).toContain(ficha.effort);
      expect(ficha.duration).toBeTruthy();
      expect(ficha.ownerRole).toBeTruthy();
      expect(ficha.steps.length).toBeGreaterThanOrEqual(3);
      expect(ficha.steps.length).toBeLessThanOrEqual(7);
      expect(ficha.indicators.length).toBeGreaterThan(0);
      expect(ficha.risks.length).toBeGreaterThan(0);
      expect(ficha.status).toBe("pendiente");
    }
  });
});

describe("TP-05-02 · escenario intermedio", () => {
  const resultado = resultadoDe("ESC-05-02");

  it("combina fortalezas y brechas", () => {
    expect(resultado.fortalezas.length).toBeGreaterThan(0);
    expect(resultado.brechas.length + resultado.riesgos.length).toBeGreaterThan(0);
    expect(resultado.summary.fortalezaDestacada).not.toBeNull();
    expect(resultado.summary.brechaPrincipal).not.toBeNull();
  });

  it("describe cada dimensión con puntaje, nivel e interpretación", () => {
    expect(resultado.dimensions).toHaveLength(6);
    for (const dimension of resultado.dimensions) {
      expect(dimension.maturityLabel).toBeTruthy();
      expect(dimension.interpretation.length).toBeGreaterThan(20);
      expect(dimension.score).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("TP-05-03 · escenario avanzado", () => {
  const resultado = resultadoDe("ESC-05-03");

  it("obtiene un puntaje alto y menos acciones que el escenario incipiente", () => {
    const incipiente = resultadoDe("ESC-05-01");
    expect(resultado.overallScore).toBeGreaterThan(incipiente.overallScore);
    expect(resultado.actions.length).toBeLessThanOrEqual(incipiente.actions.length);
  });

  it("no clasifica acciones como críticas sin riesgo declarado", () => {
    const criticas = resultado.actions.filter((a) => a.priorityLevel === "critica");
    for (const ficha of criticas) {
      expect(ficha.confidence).toBeGreaterThanOrEqual(0.65);
    }
  });
});

describe("TP-05-04 · resultado parcial", () => {
  const resultado = resultadoDe("ESC-05-04");

  it("marca completitud parcial y advertencias visibles", () => {
    expect(resultado.completeness).toBe("parcial");
    expect(resultado.advertencias.length).toBeGreaterThan(0);
    expect(resultado.dimensionesAfectadas.length).toBeGreaterThan(0);
  });

  it("no clasifica como crítica una prioridad con confianza inferior a 0,65", () => {
    for (const prioridad of resultado.priorities) {
      if (prioridad.variables.confidence < 0.65) {
        expect(prioridad.level).not.toBe("critica");
        expect(prioridad.requiereValidacion).toBe(true);
      }
    }
  });
});

describe("TP-05-05 · desempate de prioridades", () => {
  it("ordena por nivel, puntaje, menor esfuerzo y mayor impacto", () => {
    const resultado = resultadoDe("ESC-05-02");
    const rango = { critica: 4, alta: 3, media: 2, baja: 1 } as const;
    for (let i = 1; i < resultado.priorities.length; i += 1) {
      const anterior = resultado.priorities[i - 1]!;
      const actual = resultado.priorities[i]!;
      expect(rango[anterior.level]).toBeGreaterThanOrEqual(rango[actual.level]);
      if (anterior.level === actual.level && anterior.score === actual.score) {
        expect(anterior.variables.effort).toBeLessThanOrEqual(actual.variables.effort);
      }
    }
  });
});

describe("TP-05-06 · trazabilidad", () => {
  it("conserva hallazgos, reglas y preguntas de origen en cada ficha", () => {
    const resultado = resultadoDe("ESC-05-01");
    for (const ficha of resultado.actions) {
      expect(ficha.sourceRefs.hallazgos.length).toBeGreaterThan(0);
      expect(ficha.sourceRefs.reglas.length).toBeGreaterThan(0);
      expect(ficha.sourceRefs.preguntas.length).toBeGreaterThan(0);
      expect(ficha.sourceRefs.executionId).toBe(resultado.executionId);
      expect(ficha.sourceRefs.ruleSetVersion).toBeTruthy();
    }
  });
});

describe("TP-05-07 · conflicto de reglas y determinismo", () => {
  it("resuelve conflictos y produce el mismo resultado con la misma entrada", () => {
    const a = resultadoDe("ESC-05-05");
    const b = resultadoDe("ESC-05-05");
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.riesgos.length + a.brechas.length).toBeGreaterThan(0);
  });
});

describe("CA-05-08 · filtros y ordenamiento", () => {
  const resultado = resultadoDe("ESC-05-01");

  it("filtra por nivel sin perder el resto del resultado", () => {
    const filtradas = filtrarAcciones(resultado, { ...filtrosIniciales, nivel: "alta" });
    expect(filtradas.every((a) => a.priorityLevel === "alta")).toBe(true);
    expect(resultado.actions.length).toBeGreaterThanOrEqual(filtradas.length);
  });

  it("ordena por esfuerzo ascendente", () => {
    const rango = { bajo: 1, medio: 2, alto: 3 } as const;
    const filtradas = filtrarAcciones(resultado, { ...filtrosIniciales, orden: "esfuerzo" });
    for (let i = 1; i < filtradas.length; i += 1) {
      expect(rango[filtradas[i - 1]!.effort]).toBeLessThanOrEqual(rango[filtradas[i]!.effort]);
    }
  });
});

describe("Escenarios obligatorios (13)", () => {
  it("los cinco escenarios producen resultados sin errores", () => {
    for (const escenario of escenariosResultados) {
      const resultado = resultadoDe(escenario.id);
      expect(resultado.id).toContain(escenario.diagnosisId);
      expect(resultado.summary.mensajePrincipal.length).toBeGreaterThan(20);
      expect(construirPrioridades).toBeTypeOf("function");
    }
  });
});
