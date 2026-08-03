import { describe, expect, it } from "vitest";
import {
  areasParaProfundizar,
  calcularResultado,
  nivelDePuntaje,
  normalizarEscala,
  puntajeDimension,
  puntajeGlobal,
  resultadosPorDimension,
} from "./calculo";
import { dimensiones, preguntasEnOrden } from "./definicion";
import { validarConfiguracion } from "./validacion";
import type { DiagnosticAnswer } from "./tipos";

function respuestasConValor(valor: number): DiagnosticAnswer[] {
  return preguntasEnOrden
    .filter((p) => p.puntuable)
    .map((p) => ({
      questionId: p.id,
      dimensionId: p.dimensionId!,
      value: valor,
      answeredAt: "2026-01-01T00:00:00.000Z",
    }));
}

describe("configuración del diagnóstico", () => {
  it("es íntegra: ids únicos, dimensiones válidas y pesos que suman 1", () => {
    expect(validarConfiguracion()).toEqual([]);
  });

  it("contiene 4 preguntas de contexto y 24 puntuables", () => {
    expect(preguntasEnOrden.filter((p) => p.seccion === "contexto")).toHaveLength(4);
    expect(preguntasEnOrden.filter((p) => p.puntuable)).toHaveLength(24);
    for (const dimension of dimensiones) {
      expect(preguntasEnOrden.filter((p) => p.dimensionId === dimension.id)).toHaveLength(4);
    }
  });
});

describe("normalización y niveles", () => {
  it("mapea la escala 1-5 a 0-100", () => {
    expect([1, 2, 3, 4, 5].map(normalizarEscala)).toEqual([0, 25, 50, 75, 100]);
  });

  it("asigna los niveles preliminares por rango", () => {
    expect(nivelDePuntaje(0).nivel).toBe("Inicial");
    expect(nivelDePuntaje(24.9).nivel).toBe("Inicial");
    expect(nivelDePuntaje(25).nivel).toBe("En desarrollo");
    expect(nivelDePuntaje(49.9).nivel).toBe("En desarrollo");
    expect(nivelDePuntaje(50).nivel).toBe("En consolidación");
    expect(nivelDePuntaje(74.9).nivel).toBe("En consolidación");
    expect(nivelDePuntaje(75).nivel).toBe("Avanzado");
    expect(nivelDePuntaje(100).nivel).toBe("Avanzado");
  });
});

describe("cálculo global y por dimensión", () => {
  it("TP-03-05: todas las respuestas en 1 dan global 0 y nivel Inicial", () => {
    const resultado = calcularResultado("s1", respuestasConValor(1));
    expect(resultado.globalScore).toBe(0);
    expect(resultado.globalLevel).toBe("Inicial");
  });

  it("TP-03-06: todas las respuestas en 5 dan global 100 y nivel Avanzado", () => {
    const resultado = calcularResultado("s1", respuestasConValor(5));
    expect(resultado.globalScore).toBe(100);
    expect(resultado.globalLevel).toBe("Avanzado");
  });

  it("TP-03-07: con valores mixtos cada dimensión coincide con el cálculo manual", () => {
    const respuestas: DiagnosticAnswer[] = [
      { questionId: "Q01", dimensionId: "D01", value: 1, answeredAt: "x" },
      { questionId: "Q02", dimensionId: "D01", value: 2, answeredAt: "x" },
      { questionId: "Q03", dimensionId: "D01", value: 3, answeredAt: "x" },
      { questionId: "Q04", dimensionId: "D01", value: 4, answeredAt: "x" },
    ];
    // (0 + 25 + 50 + 75) / 4 = 37.5
    expect(puntajeDimension("D01", respuestas).rawScore).toBe(37.5);
    // Global = 37.5 * 0.2 (las demás dimensiones quedan en 0)
    expect(puntajeGlobal(resultadosPorDimension(respuestas))).toBeCloseTo(7.5, 5);
  });

  it("señala las dos dimensiones con menor puntaje", () => {
    const respuestas = respuestasConValor(5).map((r) =>
      r.dimensionId === "D03" || r.dimensionId === "D06" ? { ...r, value: 1 } : r
    );
    const resultado = calcularResultado("s1", respuestas);
    expect(areasParaProfundizar(resultado.dimensionResults).sort()).toEqual(["D03", "D06"]);
  });

  it("expone el contrato de salida requerido por el POC-04", () => {
    const contexto: DiagnosticAnswer[] = [
      { questionId: "C01", value: "micro", answeredAt: "x" },
      { questionId: "C02", value: "comercio", answeredAt: "x" },
      { questionId: "C03", value: ["web"], answeredAt: "x" },
      { questionId: "C04", value: "ventas", answeredAt: "x" },
    ];
    const resultado = calcularResultado("sesion-1", [...contexto, ...respuestasConValor(3)]);
    expect(Object.keys(resultado).sort()).toEqual(
      [
        "algorithmVersion",
        "calculatedAt",
        "contextAnswers",
        "definitionVersion",
        "dimensionResults",
        "globalLevel",
        "globalMessage",
        "globalScore",
        "scoredAnswers",
        "sessionId",
      ].sort()
    );
    expect(resultado.contextAnswers).toHaveLength(4);
    expect(resultado.scoredAnswers).toHaveLength(24);
    expect(resultado.dimensionResults).toHaveLength(6);
    expect(resultado.globalScore).toBe(50);
  });

  it("es determinístico: la misma entrada produce el mismo puntaje", () => {
    const respuestas = respuestasConValor(4);
    const a = calcularResultado("s1", respuestas);
    const b = calcularResultado("s1", respuestas);
    expect(a.globalScore).toBe(b.globalScore);
    expect(a.dimensionResults.map((d) => d.displayedScore)).toEqual(
      b.dimensionResults.map((d) => d.displayedScore)
    );
  });
});
