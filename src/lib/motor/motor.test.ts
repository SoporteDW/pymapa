/**
 * Pruebas del Motor de Conocimiento (POC-04, secciones 17 y 18).
 * Cubren los casos funcionales obligatorios CF-MC-01 a CF-MC-10.
 */

import { describe, expect, it } from "vitest";
import { DEFINITION_VERSION } from "@/lib/diagnostico/definicion";
import { ejecutarMotor, serializarSalida } from "./motor";
import { casoPorId, respuesta } from "./casos-demo";
import { reglas, reglasActivas, RULESET_VERSION } from "./reglas";
import { COBERTURA_MINIMA_NIVEL } from "./catalogo";
import type { SalidaMotor } from "./tipos";

const FECHA = new Date("2026-02-01T12:00:00.000Z");

function ejecutar(casoId: string): SalidaMotor {
  const caso = casoPorId(casoId)!;
  return ejecutarMotor({
    diagnosisId: caso.diagnosisId,
    definitionVersion: DEFINITION_VERSION,
    respuestas: caso.respuestas,
    fecha: FECHA,
  });
}

describe("CF-MC-01 · diagnóstico completo y consistente", () => {
  const salida = ejecutar("CF-MC-01");

  it("alcanza cobertura completa y estado completado", () => {
    expect(salida.quality.coverage).toBe(100);
    expect(salida.metadata.status).toBe("completado");
    expect(salida.quality.inconsistencias).toBe(0);
  });

  it("asigna nivel de madurez definitivo a las seis dimensiones", () => {
    expect(salida.dimensionResults).toHaveLength(6);
    for (const dimension of salida.dimensionResults) {
      expect(dimension.madurezProvisional).toBe(false);
      expect(dimension.madurezNivel).not.toBeNull();
    }
  });

  it("genera hallazgos y prioridades sin advertencias críticas", () => {
    expect(salida.findings.length).toBeGreaterThan(0);
    expect(salida.quality.warnings.filter((w) => w.severidad === "critica")).toHaveLength(0);
  });
});

describe("CF-MC-02 · diagnóstico incompleto", () => {
  const salida = ejecutar("CF-MC-02");

  it("reduce cobertura y marca la ejecución como provisional", () => {
    expect(salida.quality.coverage).toBeLessThan(COBERTURA_MINIMA_NIVEL);
    expect(salida.metadata.status).toBe("provisional");
    expect(salida.quality.warnings.some((w) => w.codigo === "MC-202")).toBe(true);
  });

  it("no inventa brechas en dimensiones sin evidencia", () => {
    const sinEvidencia = salida.findings.filter((h) => h.dimensionId === "D05");
    expect(sinEvidencia).toHaveLength(0);
  });

  it("reduce la confianza de los hallazgos generados", () => {
    expect(salida.quality.confidence).toBeLessThan(0.9);
  });
});

describe("CF-MC-03 · respuestas contradictorias", () => {
  const salida = ejecutar("CF-MC-03");

  it("registra la inconsistencia como hallazgo trazable", () => {
    const inconsistencias = salida.findings.filter((h) => h.tipo === "inconsistencia");
    expect(inconsistencias.length).toBeGreaterThan(0);
    expect(salida.quality.inconsistencias).toBeGreaterThan(0);
    expect(salida.quality.consistencyScore).toBeLessThan(1);
  });

  it("explica el impacto y reduce la confianza de la dimensión afectada", () => {
    const afectados = salida.findings.filter((h) => h.dimensionId === "D04");
    expect(afectados.length).toBeGreaterThan(0);
    expect(Math.min(...afectados.map((h) => h.confianza))).toBeLessThan(0.9);
    const explicacion = salida.explanations.find((e) => e.hallazgoId === afectados[0]!.id);
    expect(explicacion?.desarrollo.condiciones.length).toBeGreaterThan(0);
  });
});

describe("CF-MC-04 · brecha crítica de seguridad", () => {
  const salida = ejecutar("CF-MC-04");

  it("eleva la prioridad a banda crítica aunque el promedio general sea favorable", () => {
    const seguridad = salida.priorities.filter((p) => p.dimensionId === "D06");
    expect(seguridad.length).toBeGreaterThan(0);
    expect(seguridad.every((p) => p.banda === "critica")).toBe(true);
    expect(seguridad.every((p) => p.excepcionCritica)).toBe(true);
  });

  it("hace prevalecer la alerta crítica sobre el promedio de la dimensión", () => {
    const dimension = salida.dimensionResults.find((d) => d.dimensionId === "D06")!;
    expect(dimension.alertasCriticas).toBeGreaterThan(0);
    expect(dimension.madurezNivel).toBeLessThanOrEqual(2);
  });
});

describe("CF-MC-05 · fortaleza transversal", () => {
  const salida = ejecutar("CF-MC-05");

  it("agrupa la evidencia de varias reglas en un solo hallazgo", () => {
    const fortalezasCanales = salida.findings.filter(
      (h) => h.capacidadId === "CAP-D02-02" && h.tipo === "fortaleza"
    );
    expect(fortalezasCanales).toHaveLength(1);
    expect(fortalezasCanales[0]!.reglas.map((r) => r.ruleId)).toEqual([
      "RK-CLI-003",
      "RK-CLI-005",
    ]);
  });
});

describe("CF-MC-06 · necesidad dependiente", () => {
  const salida = ejecutar("CF-MC-06");

  it("ordena primero la capacidad habilitadora", () => {
    const informacion = salida.priorities.find((p) => p.capacidadId === "CAP-D04-01")!;
    const decisiones = salida.priorities.find((p) => p.capacidadId === "CAP-D04-02")!;
    expect(informacion.orden).toBeLessThan(decisiones.orden);
  });

  it("expone la relación de dependencia en la salida", () => {
    expect(salida.dependencies.length).toBeGreaterThan(0);
    expect(salida.dependencies.some((d) => d.tipo === "habilita")).toBe(true);
  });
});

describe("CF-MC-07 · reejecución idéntica", () => {
  it("produce la misma salida con la misma entrada y versión de reglas", () => {
    const primera = ejecutar("CF-MC-01");
    const segunda = ejecutar("CF-MC-01");
    expect(segunda.metadata.inputHash).toBe(primera.metadata.inputHash);
    expect(serializarSalida(segunda)).toBe(serializarSalida(primera));
  });

  it("cambia el hash cuando cambia una respuesta", () => {
    const caso = casoPorId("CF-MC-01")!;
    const modificadas = caso.respuestas.map((r) => (r.questionId === "Q01" ? respuesta("Q01", 1) : r));
    const alterada = ejecutarMotor({
      diagnosisId: caso.diagnosisId,
      definitionVersion: DEFINITION_VERSION,
      respuestas: modificadas,
      fecha: FECHA,
    });
    expect(alterada.metadata.inputHash).not.toBe(ejecutar("CF-MC-01").metadata.inputHash);
  });
});

describe("CF-MC-08 · versionado de reglas", () => {
  it("conserva reglas obsoletas fuera de la evaluación y registra la sustitución", () => {
    const obsoleta = reglas.find((r) => r.ruleId === "RK-SEG-000")!;
    expect(obsoleta.status).toBe("deprecated");
    expect(reglasActivas.some((r) => r.ruleId === "RK-SEG-000")).toBe(false);
    expect(reglas.find((r) => r.ruleId === "RK-SEG-001")!.supersedes).toBe("RK-SEG-000");
  });

  it("identifica cada ejecución con la versión de reglas aplicada", () => {
    const salida = ejecutar("CF-MC-01");
    expect(salida.metadata.ruleSetVersion).toBe(RULESET_VERSION);
    expect(salida.metadata.executionId).toContain(RULESET_VERSION);
  });
});

describe("CF-MC-09 · pregunta no aplicable", () => {
  const salida = ejecutar("CF-MC-09");

  it("excluye la respuesta del denominador de cobertura", () => {
    expect(salida.quality.excluidasNoAplica).toBe(1);
    expect(salida.quality.coverage).toBe(100);
    const traza = salida.trace.respuestas.find((r) => r.questionId === "Q10")!;
    expect(traza.bandera).toBe("no_aplica");
    expect(traza.nota).toBeTruthy();
  });
});

describe("CF-MC-10 · contexto pyme diferente", () => {
  const salida = ejecutar("CF-MC-10");

  it("descarta las reglas que no corresponden al perfil declarado", () => {
    expect(salida.trace.reglasDescartadasPorContexto).toContain("RK-CLI-002");
    expect(salida.findings.some((h) => h.reglas.some((r) => r.ruleId === "RK-CLI-002"))).toBe(false);
  });
});

describe("CA-MC-04 y CA-MC-08 · trazabilidad y contrato de salida", () => {
  const salida = ejecutar("CF-MC-06");

  it("cada hallazgo conserva evidencia, regla, severidad, confianza y explicación", () => {
    for (const hallazgo of salida.findings) {
      expect(hallazgo.reglas.length).toBeGreaterThan(0);
      expect(hallazgo.severidad).toBeTruthy();
      expect(hallazgo.confianza).toBeGreaterThanOrEqual(0);
      expect(salida.explanations.some((e) => e.hallazgoId === hallazgo.id)).toBe(true);
    }
  });

  it("la priorización conserva factores, pesos y justificación", () => {
    for (const prioridad of salida.priorities) {
      expect(Object.keys(prioridad.factores)).toHaveLength(6);
      expect(prioridad.pesos.impacto).toBe(0.3);
      expect(prioridad.justificacion.length).toBeGreaterThan(10);
    }
  });

  it("la salida se serializa como JSON válido", () => {
    const json = serializarSalida(salida);
    expect(() => JSON.parse(json) as unknown).not.toThrow();
    const objeto = JSON.parse(json) as SalidaMotor;
    expect(objeto.nextStepPayload.necesidades.length).toBe(salida.priorities.length);
  });
});
