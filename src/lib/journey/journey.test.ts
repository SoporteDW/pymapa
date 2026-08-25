import { describe, expect, it } from "vitest";

import { journeyMaestro, resumenEjecucion } from "./etapas";
import { estadoPlanActuar } from "@/lib/actuar/plan";
import { resumenCuestionario } from "@/lib/diagnostico/pendientes";
import { sugerenciasAsistente, zonaDesdeRuta, type ContextoAsistente } from "@/lib/asistente/guion";
import { totalPreguntasObligatorias } from "@/lib/diagnostico/definicion";

/** Plan proyectado desde el Workspace, tal como lo produce `lib/actuar/plan.ts`. */
function plan(estados: ("pendiente" | "en_ejecucion" | "entregado" | "requiere_ajustes" | "validado")[]) {
  const derivado = estadoPlanActuar({
    actividadesDelPlan: estados.map((_, i) => `AC-${i + 1}`),
    ejecucion: estados.map((estado, i) => ({ id: `AC-${i + 1}`, estado })),
  });
  return {
    construido: derivado.construido,
    total: derivado.total,
    validadas: derivado.validadas,
    cerrado: derivado.cerrado,
  };
}

describe("Journey Maestro · cuatro etapas", () => {
  it("bloquea Actuar y Seguir mientras el diagnóstico no se cierra formalmente", () => {
    const journey = journeyMaestro({
      perfilCompletado: true,
      estadoDiagnostico: "profundizacion_pendiente",
      plan: plan([]),
      seguimientos: [],
    });
    const estados = Object.fromEntries(journey.etapas.map((e) => [e.etapa.id, e.estado]));
    expect(estados).toEqual({
      preparar: "completada",
      diagnosticar: "en_curso",
      actuar: "pendiente",
      seguir: "pendiente",
    });
    expect(journey.activa).toBe("diagnosticar");
    expect(journey.bloqueo("actuar")?.ruta).toBe("/diagnostico");
    expect(journey.bloqueo("seguir")).not.toBeNull();
  });

  it("habilita Actuar solo después del cierre formal del diagnóstico", () => {
    const journey = journeyMaestro({
      perfilCompletado: true,
      estadoDiagnostico: "diagnostico_final",
      plan: plan(["en_ejecucion", "pendiente"]),
      seguimientos: [],
    });
    const estados = Object.fromEntries(journey.etapas.map((e) => [e.etapa.id, e.estado]));
    expect(estados["diagnosticar"]).toBe("completada");
    expect(estados["actuar"]).toBe("en_curso");
    expect(estados["seguir"]).toBe("pendiente");
    expect(journey.activa).toBe("actuar");
    expect(journey.bloqueo("actuar")).toBeNull();
  });

  it("NO completa Actuar ni habilita Seguir con una sola Actividad validada", () => {
    const journey = journeyMaestro({
      perfilCompletado: true,
      estadoDiagnostico: "diagnostico_final",
      plan: plan(["validado", "en_ejecucion"]),
      seguimientos: [],
    });
    const estados = Object.fromEntries(journey.etapas.map((e) => [e.etapa.id, e.estado]));
    expect(estados["actuar"]).toBe("en_curso");
    expect(estados["seguir"]).toBe("pendiente");
    expect(journey.bloqueo("seguir")).not.toBeNull();
  });

  it("habilita Seguir solo con el cierre real del Plan (todas validadas)", () => {
    const journey = journeyMaestro({
      perfilCompletado: true,
      estadoDiagnostico: "diagnostico_final",
      plan: plan(["validado", "validado"]),
      seguimientos: [{ cerrado: false, conMedicion: true }],
    });
    const estados = Object.fromEntries(journey.etapas.map((e) => [e.etapa.id, e.estado]));
    expect(estados["actuar"]).toBe("completada");
    expect(journey.bloqueo("seguir")).toBeNull();
    expect(estados["seguir"]).toBe("en_curso");
  });

  it("bloquea Diagnosticar sin perfil de empresa", () => {
    const journey = journeyMaestro({
      perfilCompletado: false,
      estadoDiagnostico: "no_iniciado",
      plan: plan([]),
      seguimientos: [],
    });
    expect(journey.activa).toBe("preparar");
    expect(journey.bloqueo("diagnosticar")?.ruta).toBe("/perfil");
  });

  it("resume la ejecución del plan", () => {
    const resumen = resumenEjecucion(["validado", "validado", "requiere_ajustes"]);
    expect(resumen.validadas).toBe(2);
    expect(resumen.requierenAjustes).toBe(1);
    expect(resumen.completo).toBe(false);
    expect(resumenEjecucion(["validado"]).completo).toBe(true);
  });
});


describe("Cuestionario interrumpible", () => {
  const idsObligatorios = resumenCuestionario({
    respondidas: [],
    aplazadas: [],
    delegadas: {},
  }).preguntas.map((p) => p.id);
  const [ID_A, ID_B, ID_C] = idsObligatorios as [string, string, string];

  it("distingue pendientes, aplazadas y delegadas sin bloquear el avance", () => {
    const resumen = resumenCuestionario({
      respondidas: [],
      aplazadas: [ID_A],
      delegadas: { [ID_B]: "María" },
      preguntaActual: null,
    });
    expect(resumen.total).toBe(totalPreguntasObligatorias);
    expect(resumen.aplazadas).toBe(1);
    expect(resumen.delegadas).toBe(1);
    expect(resumen.completo).toBe(false);
    expect(resumen.detalle).toContain("esperando respuesta");
    // La siguiente pregunta propuesta nunca es la aplazada ni la delegada.
    expect([ID_A, ID_B]).not.toContain(resumen.siguienteId);
  });

  it("retoma exactamente la pregunta donde el usuario quedó", () => {
    const resumen = resumenCuestionario({
      respondidas: [],
      aplazadas: [],
      delegadas: {},
      preguntaActual: ID_C,
    });
    expect(resumen.siguienteId).toBe(ID_C);
    expect(resumen.titulo).toContain("no ha comenzado");
  });

  it("marca el cuestionario como completo cuando están todas las obligatorias", () => {
    const parcial = resumenCuestionario({ respondidas: [], aplazadas: [], delegadas: {} });
    const todas = parcial.preguntas.map((p) => p.id);
    const resumen = resumenCuestionario({ respondidas: todas, aplazadas: [], delegadas: {} });
    expect(resumen.completo).toBe(true);
    expect(resumen.respondidas).toBe(totalPreguntasObligatorias);
    expect(resumen.siguienteId).toBeNull();
  });
});

describe("Asistente Pymapa simulado", () => {
  const ctx: ContextoAsistente = {
    empresaNombre: "Moda Origen",
    respondidas: 28,
    total: 28,
    profundizacionPendiente: 2,
    hallazgo: "el checkout pierde compradores en el paso de pago",
    prioridad: "Alta",
    indicador: "tasa de abandono de carrito",
    proximoHito: "Día 60",
  };

  it("ubica la zona del journey desde la ruta", () => {
    expect(zonaDesdeRuta("/diagnostico/paso/ctx-1")).toBe("diagnostico");
    expect(zonaDesdeRuta("/diagnostico/cierre")).toBe("profundizacion");
    expect(zonaDesdeRuta("/diagnostico/listo")).toBe("diagnostico_final");
    expect(zonaDesdeRuta("/plan-de-accion")).toBe("plan");
    expect(zonaDesdeRuta("/plan-de-accion/workspace/AC-1")).toBe("actividad");
    expect(zonaDesdeRuta("/seguimiento/AC-1")).toBe("seguimiento");
  });

  it("responde con el contexto de la empresa en el plan de acción", () => {
    const respuestas = sugerenciasAsistente("plan", ctx);
    const prioritaria = respuestas.find((r) => r.id === "por-que-prioritaria")!;
    expect(prioritaria.respuesta).toContain("checkout");
    expect(prioritaria.respuesta).toContain("Alta");
  });

  it("explica que el cuestionario no debe terminarse de una sola vez", () => {
    const respuestas = sugerenciasAsistente("diagnostico", ctx);
    expect(respuestas.some((r) => r.id === "no-se")).toBe(true);
    expect(respuestas.find((r) => r.id === "terminar-28")!.respuesta).toContain("continuar después");
  });

  it("contextualiza una mejora semanal contra el checkpoint formal", () => {
    const respuesta = sugerenciasAsistente("seguimiento", ctx).find(
      (r) => r.id === "mejoro-semana"
    )!;
    expect(respuesta.respuesta).toContain("Día 60");
    expect(respuesta.respuesta).toContain("señal positiva");
  });
});
