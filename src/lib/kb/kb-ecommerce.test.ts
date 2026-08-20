import { describe, expect, it } from "vitest";
import { knowledgePackEcommerce as pack } from "./ecommerce";
import { depurarRespuestas, preguntasVisibles, progresoFormulario } from "./formulario";
import { evaluarKB } from "./motor-kb";
import { crearIniciativaDesdeRecomendacion } from "./iniciativas";
import { responderConsulta } from "./contexto-conversacional";
import { TEXTO_INSUFICIENTE, type RespuestasKB } from "./tipos";

function evaluar(respuestas: RespuestasKB, esDemo = false) {
  return evaluarKB({
    pack,
    companyId: "test",
    companyName: "Empresa de prueba",
    respuestas,
    esDemo,
  });
}

describe("Knowledge Pack E-commerce · integridad", () => {
  it("cada regla apunta a un hallazgo y una recomendación existentes", () => {
    for (const regla of pack.reglas) {
      expect(pack.hallazgos.some((h) => h.id === regla.hallazgoId)).toBe(true);
      expect(pack.recomendaciones.some((r) => r.id === regla.recomendacionId)).toBe(true);
      expect(regla.preguntas.every((id) => pack.preguntas.some((p) => p.id === id))).toBe(true);
    }
  });

  it("toda recomendación declara acciones y valores experimentales", () => {
    for (const recomendacion of pack.recomendaciones) {
      expect(recomendacion.acciones.length).toBeGreaterThan(0);
      expect(recomendacion.experimental).toBe(true);
    }
  });
});

describe("Formulario dinámico", () => {
  it("sin respuestas solo muestra las preguntas de entrada", () => {
    const visibles = preguntasVisibles(pack, {});
    expect(visibles.length).toBeGreaterThan(0);
    expect(visibles.every((p) => p.visibleSi === undefined)).toBe(true);
  });

  it("la lógica condicional abre preguntas al declarar el canal digital", () => {
    const base = preguntasVisibles(pack, {}).length;
    const conCanal = preguntasVisibles(pack, pack.datasetDemo.respuestas).length;
    expect(conCanal).toBeGreaterThan(base);
  });

  it("depura respuestas de preguntas que dejaron de aplicar", () => {
    const depuradas = depurarRespuestas(pack, pack.datasetDemo.respuestas);
    const visibles = preguntasVisibles(pack, depuradas).map((p) => p.id);
    expect(Object.keys(depuradas).every((id) => visibles.includes(id))).toBe(true);
  });

  it("el progreso llega a 100% cuando se responden las preguntas visibles", () => {
    const progreso = progresoFormulario(pack, pack.datasetDemo.respuestas);
    expect(progreso.porcentaje).toBe(100);
  });
});

describe("Evaluación y trazabilidad", () => {
  it("sin evidencia no concluye", () => {
    const resultado = evaluar({});
    expect(resultado.hallazgos).toHaveLength(0);
    expect(resultado.estados.every((e) => e.estado !== "preliminar" || e.hallazgos === 0)).toBe(true);
    expect(responderConsulta(resultado, "prioridad").bloques[0]!.texto).toContain(
      TEXTO_INSUFICIENTE
    );
  });

  it("el dataset demo produce hallazgos trazables hasta la pregunta", () => {
    const resultado = evaluar(pack.datasetDemo.respuestas, true);
    expect(resultado.hallazgos.length).toBeGreaterThan(0);
    for (const detectado of resultado.hallazgos) {
      expect(detectado.trazas.length).toBeGreaterThan(0);
      expect(detectado.trazas.every((t) => t.variableId.length > 0)).toBe(true);
      expect(detectado.recomendacion.hallazgoId).toBe(detectado.hallazgo.id);
    }
    expect(resultado.esDemo).toBe(true);
  });

  it("es determinista: mismas respuestas, mismos hallazgos", () => {
    const a = evaluar(pack.datasetDemo.respuestas);
    const b = evaluar(pack.datasetDemo.respuestas);
    expect(a.hallazgos.map((h) => h.hallazgo.id)).toEqual(b.hallazgos.map((h) => h.hallazgo.id));
  });

  it("el perfil tecnológico describe un perfil, no una plataforma", () => {
    const { perfilTecnologico } = evaluar(pack.datasetDemo.respuestas);
    expect(perfilTecnologico.preliminar).toBe(true);
    const marcas = ["shopify", "woocommerce", "vtex", "magento", "prestashop"];
    expect(marcas.some((m) => perfilTecnologico.perfil.toLowerCase().includes(m))).toBe(false);
  });
});

describe("Recomendación → iniciativa", () => {
  it("mapea la recomendación al modelo de Plan de Acción con su origen", () => {
    const resultado = evaluar(pack.datasetDemo.respuestas);
    const detectado = resultado.hallazgos[0]!;
    const { accion, origen } = crearIniciativaDesdeRecomendacion(pack, resultado, detectado);

    expect(accion.titulo).toBe(detectado.recomendacion.texto);
    expect(accion.pasos).toEqual(detectado.recomendacion.acciones);
    expect(["alta", "media", "baja"]).toContain(accion.prioridad);
    expect(["ahora", "despues", "mas_adelante"]).toContain(accion.horizonte);
    expect(accion.estado).toBe("pendiente");
    expect(origen.packId).toBe(pack.id);
    expect(origen.hallazgoId).toBe(detectado.hallazgo.id);
    expect(origen.preguntas.length).toBeGreaterThan(0);
  });
});

describe("Panel conversacional determinista", () => {
  it("responde en tres niveles citando el hallazgo", () => {
    const resultado = evaluar(pack.datasetDemo.respuestas);
    const respuesta = responderConsulta(resultado, "prioridad");
    expect(respuesta.bloques.map((b) => b.nivel)).toEqual([
      "declarado",
      "interpretacion",
      "recomendacion",
    ]);
    expect(respuesta.hallazgosCitados.length).toBe(1);
  });

  it("informa la evidencia faltante en lugar de suponer", () => {
    const parcial: RespuestasKB = { ...pack.datasetDemo.respuestas };
    const primera = preguntasVisibles(pack, parcial)[0]!;
    delete parcial[primera.id];
    const resultado = evaluar(depurarRespuestas(pack, parcial));
    const respuesta = responderConsulta(resultado, "faltante");
    expect(respuesta.bloques[0]!.texto).toContain(TEXTO_INSUFICIENTE);
  });
});
