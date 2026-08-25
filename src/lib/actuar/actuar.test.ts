import { describe, expect, it } from "vitest";

import { estadoPlanActuar } from "./plan";
import { requisitosDeEntrega, puedeEnviarseARevision } from "@/lib/workspace/requisitos";
import { revisarEntrega } from "@/lib/workspace/revision";
import type { ArchivoEvidencia } from "@/lib/evidencias/tipos";

describe("Actuar · Plan construido ≠ Plan completado", () => {
  it("un Plan con Actividades sin ejecutar está construido pero no cerrado", () => {
    const plan = estadoPlanActuar({ actividadesDelPlan: ["A", "B", "C"], ejecucion: [] });
    expect(plan.construido).toBe(true);
    expect(plan.cerrado).toBe(false);
    expect(plan.porcentaje).toBe(0);
    expect(plan.pendientes).toBe(3);
    expect(plan.siguienteId).toBe("A");
  });

  it("no cierra el Plan cuando solo se validaron las Actividades abiertas", () => {
    const plan = estadoPlanActuar({
      actividadesDelPlan: ["A", "B", "C"],
      ejecucion: [{ id: "A", estado: "validado" }],
    });
    expect(plan.validadas).toBe(1);
    expect(plan.cerrado).toBe(false);
    expect(plan.siguienteId).toBe("B");
  });

  it("cierra el Plan solo cuando todas las Actividades quedaron validadas", () => {
    const plan = estadoPlanActuar({
      actividadesDelPlan: ["A", "B"],
      ejecucion: [
        { id: "A", estado: "validado" },
        { id: "B", estado: "validado" },
      ],
    });
    expect(plan.cerrado).toBe(true);
    expect(plan.porcentaje).toBe(100);
    expect(plan.siguienteId).toBeNull();
  });

  it("prioriza lo que requiere ajustes como siguiente Actividad", () => {
    const plan = estadoPlanActuar({
      actividadesDelPlan: ["A", "B", "C"],
      ejecucion: [
        { id: "A", estado: "en_ejecucion" },
        { id: "B", estado: "requiere_ajustes" },
      ],
    });
    expect(plan.siguienteId).toBe("B");
  });

  it("un Plan sin Actividades no está construido ni cerrado", () => {
    const plan = estadoPlanActuar({ actividadesDelPlan: [], ejecucion: [] });
    expect(plan.construido).toBe(false);
    expect(plan.cerrado).toBe(false);
  });
});

describe("Actuar · requisitos visibles de la entrega", () => {
  const base = {
    criteriosValidacion: ["Criterio 1", "Criterio 2", "Criterio 3"],
    criteriosDeclarados: ["Criterio 1", "Criterio 2", "Criterio 3"],
    nota: "Trabajamos la actividad con el equipo comercial y documentamos el resultado obtenido.",
    archivos: [] as ArchivoEvidencia[],
    requiereArchivo: false,
  };

  it("no exige archivo salvo que el entregable lo declare", () => {
    const requisitos = requisitosDeEntrega(base);
    expect(requisitos.some((r) => r.tipo === "archivo")).toBe(false);
    expect(puedeEnviarseARevision(requisitos)).toBe(true);
  });

  it("exige archivo cuando el entregable es un documento", () => {
    const requisitos = requisitosDeEntrega({ ...base, requiereArchivo: true });
    expect(puedeEnviarseARevision(requisitos)).toBe(false);
    expect(requisitos.find((r) => r.tipo === "archivo")?.cumplido).toBe(false);
  });

  it("hace visible el checklist y la nota mínima antes de enviar", () => {
    const requisitos = requisitosDeEntrega({
      ...base,
      nota: "Hecho.",
      verificaciones: [
        { id: "v1", estado: "sin_revisar" },
        { id: "v2", estado: "cumple" },
      ],
    });
    const pendientes = requisitos.filter((r) => !r.cumplido).map((r) => r.tipo);
    expect(pendientes).toContain("nota");
    expect(pendientes).toContain("checklist");
  });

  it("la revisión no puede pedir nada que el usuario no viera (3/3 se valida)", () => {
    const requisitos = requisitosDeEntrega(base);
    const revision = revisarEntrega({ ...base, numeroEntrega: 1 });
    expect(puedeEnviarseARevision(requisitos)).toBe(true);
    expect(revision.veredicto).toBe("validado");
    expect(revision.ajustesSolicitados).toEqual([]);
  });

  it("los ajustes de la revisión son exactamente los requisitos pendientes", () => {
    const entrada = { ...base, nota: "Listo.", requiereArchivo: true };
    const pendientes = requisitosDeEntrega(entrada).filter((r) => !r.cumplido);
    const revision = revisarEntrega({ ...entrada, numeroEntrega: 1 });
    expect(revision.veredicto).toBe("requiere_ajustes");
    expect(revision.ajustesSolicitados).toEqual(pendientes.map((r) => r.ajuste));
  });
});
