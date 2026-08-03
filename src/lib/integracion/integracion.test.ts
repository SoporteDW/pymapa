/**
 * POC-08 · Pruebas funcionales de extremo a extremo con datos simulados.
 * Recorren la cadena completa Diagnóstico → Motor → Resultados → Fichas →
 * Roadmap → Dashboard para cada perfil y validan la consistencia entre módulos.
 */

import { describe, expect, it } from "vitest";
import { perfilesSimulados, perfilPorId } from "./perfiles";
import { integrar, integrarPerfil } from "./orquestador";
import { verificarConsistencia } from "./consistencia";
import { sesionTrabajoInicial, SESSION_VERSION } from "./sesion-trabajo";

const HOY = "2026-03-02";

describe("POC-08 · perfiles simulados", () => {
  it("define al menos cinco perfiles con identificadores únicos", () => {
    expect(perfilesSimulados.length).toBeGreaterThanOrEqual(5);
    const ids = new Set(perfilesSimulados.map((p) => p.id));
    const diagnosticos = new Set(perfilesSimulados.map((p) => p.diagnosisId));
    expect(ids.size).toBe(perfilesSimulados.length);
    expect(diagnosticos.size).toBe(perfilesSimulados.length);
  });

  it("expone la búsqueda por identificador", () => {
    expect(perfilPorId("PYME-03")?.nombre).toBe("Metalúrgica Andes");
    expect(perfilPorId("NO-EXISTE")).toBeUndefined();
  });
});

describe("POC-08 · recorrido de extremo a extremo", () => {
  for (const perfil of perfilesSimulados) {
    it(`integra todos los módulos para ${perfil.nombre}`, () => {
      const salida = integrarPerfil(perfil, { hoy: HOY });

      expect(salida.modulosConError).toEqual([]);
      expect(salida.diagnostico).not.toBeNull();
      expect(salida.salidaMotor).not.toBeNull();
      expect(salida.resultado).not.toBeNull();
      expect(salida.roadmap).not.toBeNull();
      expect(salida.dashboard).not.toBeNull();

      // El plan y el tablero se derivan del mismo resultado.
      expect(salida.roadmap!.acciones.length).toBe(salida.resultado!.actions.length);
      expect(salida.dashboard!.executionId).toBe(salida.resultado!.executionId);
      expect(salida.dashboard!.maturityScore).toBe(Math.round(salida.resultado!.overallScore));
    });

    it(`no reporta inconsistencias para ${perfil.nombre}`, () => {
      const informe = verificarConsistencia(integrarPerfil(perfil, { hoy: HOY }));
      const fallas = informe.verificaciones.filter((v) => v.estado === "falla");
      expect(fallas.map((f) => `${f.id}: ${f.detalle}`)).toEqual([]);
      expect(informe.aprobado).toBe(true);
    });
  }
});

describe("POC-08 · coherencia entre respuestas y resultados", () => {
  it("produce madurez creciente entre perfil incipiente, intermedio y avanzado", () => {
    const incipiente = integrarPerfil(perfilPorId("PYME-01")!, { hoy: HOY });
    const intermedio = integrarPerfil(perfilPorId("PYME-02")!, { hoy: HOY });
    const avanzado = integrarPerfil(perfilPorId("PYME-03")!, { hoy: HOY });

    expect(incipiente.resultado!.overallScore).toBeLessThan(intermedio.resultado!.overallScore);
    expect(intermedio.resultado!.overallScore).toBeLessThan(avanzado.resultado!.overallScore);
  });

  it("marca como parcial el diagnóstico incompleto y reduce la cobertura", () => {
    const parcial = integrarPerfil(perfilPorId("PYME-04")!, { hoy: HOY });
    expect(parcial.resultado!.completeness).toBe("parcial");
    expect(parcial.salidaMotor!.quality.coverage).toBeLessThan(1);
  });

  it("cada perfil genera un conjunto propio de prioridades", () => {
    const firmas = perfilesSimulados.map((perfil) => {
      const salida = integrarPerfil(perfil, { hoy: HOY });
      return salida
        .resultado!.priorities.map((p) => `${p.id}:${p.level}`)
        .sort()
        .join("|");
    });
    expect(new Set(firmas).size).toBe(firmas.length);
  });

  it("mantiene la prioridad de origen entre ficha y acción del Roadmap", () => {
    const salida = integrarPerfil(perfilPorId("PYME-02")!, { hoy: HOY });
    for (const accion of salida.roadmap!.acciones) {
      const ficha = salida.resultado!.actions.find((a) => a.id === accion.fichaAccionId);
      expect(ficha).toBeDefined();
      expect(accion.prioridadOrigen).toBe(ficha!.priorityLevel);
    }
  });
});

describe("POC-08 · determinismo y errores", () => {
  it("reproduce la misma huella y puntaje ante la misma entrada", () => {
    const perfil = perfilPorId("PYME-05")!;
    const a = integrarPerfil(perfil, { hoy: HOY });
    const b = integrarPerfil(perfil, { hoy: HOY });
    expect(b.salidaMotor!.metadata.inputHash).toBe(a.salidaMotor!.metadata.inputHash);
    expect(b.resultado!.overallScore).toBe(a.resultado!.overallScore);
    expect(b.roadmap!.acciones.map((x) => x.id)).toEqual(a.roadmap!.acciones.map((x) => x.id));
  });

  it("degrada sin excepciones cuando no hay respuestas", () => {
    const salida = integrar({ diagnosisId: "vacio", respuestas: [], hoy: HOY });
    expect(() => verificarConsistencia(salida)).not.toThrow();
    expect(salida.resultado?.actions.length ?? 0).toBeGreaterThanOrEqual(0);
  });
});

describe("POC-08 · sesión de trabajo", () => {
  it("parte de un estado inicial sin perfil activo", () => {
    const inicial = sesionTrabajoInicial();
    expect(inicial.version).toBe(SESSION_VERSION);
    expect(inicial.perfilActivoId).toBeNull();
    expect(inicial.executionId).toBeNull();
  });
});
