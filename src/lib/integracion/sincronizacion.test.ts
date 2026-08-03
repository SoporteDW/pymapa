/**
 * POC-09 · Pruebas de regresión de la sincronización del recorrido (defecto D-01).
 * Verifican que la ejecución integrada se traduzca a un estado de sesión coherente
 * y que los perfiles sin brechas accionables produzcan un plan vacío legítimo.
 */

import { describe, expect, it } from "vitest";
import { perfilesSimulados } from "./perfiles";
import { integrarPerfil } from "./orquestador";
import { sincronizarDesdeEjecucion } from "./sincronizacion";

describe("sincronizarDesdeEjecucion", () => {
  it("marca el diagnóstico como completado y con resultados para todos los perfiles", () => {
    for (const perfil of perfilesSimulados) {
      const sincronizado = sincronizarDesdeEjecucion(integrarPerfil(perfil));
      expect(sincronizado, perfil.nombre).not.toBeNull();
      expect(sincronizado!.diagnostico.estado).toBe("completado");
      expect(sincronizado!.diagnostico.resultadosGenerados).toBe(true);
      expect(sincronizado!.resultados.length).toBeGreaterThan(0);
      expect(sincronizado!.respuestas.length).toBe(perfil.respuestas.length);
    }
  });

  it("mantiene la trazabilidad entre prioridades, acciones y dimensiones", () => {
    for (const perfil of perfilesSimulados) {
      const ejecucion = integrarPerfil(perfil);
      const sincronizado = sincronizarDesdeEjecucion(ejecucion)!;
      const dimensiones = new Set(sincronizado.resultados.map((r) => r.id));
      expect(sincronizado.acciones.length).toBe(ejecucion.resultado!.actions.length);
      for (const accion of sincronizado.acciones) {
        expect(dimensiones.has(accion.dimensionId)).toBe(true);
        expect(accion.estado).toBe("pendiente");
      }
      for (const prioridad of sincronizado.prioridades) {
        expect(dimensiones.has(prioridad.dimensionId)).toBe(true);
      }
    }
  });

  it("devuelve null cuando la cadena no produjo resultados", () => {
    const vacio = sincronizarDesdeEjecucion({
      diagnosisId: "sin-datos",
      companyId: null,
      respuestas: [],
      diagnostico: null,
      salidaMotor: null,
      resultado: null,
      roadmap: null,
      dashboard: null,
      modulosConError: [],
      integrationVersion: "test",
    });
    expect(vacio).toBeNull();
  });
});
