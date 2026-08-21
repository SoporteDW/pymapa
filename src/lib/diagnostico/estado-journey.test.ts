import { describe, expect, it } from "vitest";

import { estadoJourneyDiagnostico } from "./estado-journey";
import { RESPUESTAS_HERO_MODA_ORIGEN } from "@/lib/integracion/perfiles";
import { contarObligatoriasRespondidas } from "./validacion";
import { totalPreguntasObligatorias } from "./definicion";
import { evaluarSuficiencia } from "@/lib/suficiencia/motor";

const base = {
  respondidas: 28,
  total: 28,
  necesidadesTotales: 0,
  necesidadesResueltas: 0,
  cerrado: false,
};

describe("Macroentrega 4.1 · máquina de estados del diagnóstico", () => {
  it("pide continuar el cuestionario mientras falten preguntas", () => {
    const e = estadoJourneyDiagnostico({ ...base, respondidas: 11 });
    expect(e.estado).toBe("cuestionario_en_curso");
    expect(e.siguiente.label).toBe("Continuar diagnóstico");
    expect(e.porcentajeModulo).toBeLessThan(100);
  });

  it("con el cuestionario completo y evidencia pendiente propone profundizar sin reabrir preguntas", () => {
    const e = estadoJourneyDiagnostico({
      ...base,
      necesidadesTotales: 3,
      necesidadesResueltas: 1,
    });
    expect(e.estado).toBe("profundizacion_pendiente");
    expect(e.etiqueta).toBe("Profundización");
    expect(e.siguiente.label).toBe("Continuar profundización");
    expect(e.siguiente.ruta).toBe("/diagnostico/cierre");
    expect(e.cuestionario.porcentaje).toBe(100);
    expect(e.porcentajeModulo).toBeLessThan(100);
  });

  it("al resolver todas las necesidades propone cerrar el diagnóstico", () => {
    const e = estadoJourneyDiagnostico({
      ...base,
      necesidadesTotales: 3,
      necesidadesResueltas: 3,
    });
    expect(e.estado).toBe("listo_para_cerrar");
    expect(e.siguiente.label).toBe("Cerrar mi diagnóstico");
  });

  it("cerrado apunta al plan de acción y solo entonces marca 100%", () => {
    const e = estadoJourneyDiagnostico({ ...base, cerrado: true });
    expect(e.estado).toBe("diagnostico_final");
    expect(e.etiqueta).toBe("Completado");
    expect(e.porcentajeModulo).toBe(100);
    expect(e.siguiente.ruta).toBe("/plan-de-accion");
  });
});

describe("Escenario Hero · Moda Origen", () => {
  it("entra con el cuestionario completo (28 de 28)", () => {
    expect(contarObligatoriasRespondidas(RESPUESTAS_HERO_MODA_ORIGEN)).toBe(
      totalPreguntasObligatorias
    );
  });

  it("su resultado es preliminar: quedan aspectos por confirmar", () => {
    const suficiencia = evaluarSuficiencia({
      respuestas: RESPUESTAS_HERO_MODA_ORIGEN,
      evidencias: [],
      aclaraciones: [],
    });
    const necesidades = suficiencia.dominios.flatMap((d) => d.necesidades);
    const journey = estadoJourneyDiagnostico({
      respondidas: totalPreguntasObligatorias,
      total: totalPreguntasObligatorias,
      necesidadesTotales: necesidades.length,
      necesidadesResueltas: 0,
      cerrado: false,
    });
    expect(necesidades.length).toBeGreaterThan(0);
    expect(journey.estado).toBe("profundizacion_pendiente");
    expect(journey.cuestionario.completo).toBe(true);
  });
});
