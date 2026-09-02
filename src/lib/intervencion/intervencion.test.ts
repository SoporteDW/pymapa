import { describe, expect, it } from "vitest";

import {
  agregarRecursos,
  clasificarIntervencion,
  proyectoFinanciable,
  type EntradaIntervencion,
} from "./clasificacion";
import { referenciasPara } from "./instrumentos-financieros";

const base: EntradaIntervencion = {
  id: "AC-D02-01",
  titulo: "Organizar la información de clientes en un registro único",
  objetivo: "Mejorar la trazabilidad y la capacidad de gestión comercial.",
  porQue: "Baja digitalización y control del proceso comercial.",
  dominioId: "D02",
  dominioNombre: "Clientes y canales",
  instrumentoId: "INS-EJE-INEXISTENTE",
  esfuerzo: "medio",
};

describe("clasificación de intervención", () => {
  it("es determinista", () => {
    expect(clasificarIntervencion(base)).toEqual(clasificarIntervencion(base));
  });

  it("detecta proceso y tecnología, y deja la inversión por determinar", () => {
    const ruta = clasificarIntervencion(base);
    expect(ruta.tipos).toContain("proceso");
    expect(ruta.tipos).toContain("tecnologia");
    expect(ruta.recursos).toBe("mixtos");
    expect(ruta.requiereInversion).toBe("por_determinar");
    expect(ruta.porQue.length).toBeGreaterThan(0);
  });

  it("marca inversión requerida cuando hay tecnología con esfuerzo alto", () => {
    expect(clasificarIntervencion({ ...base, esfuerzo: "alto" }).requiereInversion).toBe("si");
  });

  it("clasifica como interna una mejora puramente organizativa", () => {
    const ruta = clasificarIntervencion({
      ...base,
      titulo: "Definir un responsable y una revisión mensual",
      objetivo: "Sostener el avance en el tiempo.",
      porQue: "No existe un control periódico del avance.",
    });
    expect(ruta.recursos).toBe("internos");
    expect(ruta.requiereInversion).toBe("no");
  });

  it("agrega la lectura de recursos del plan", () => {
    const resumen = agregarRecursos([
      clasificarIntervencion(base),
      clasificarIntervencion({
        ...base,
        id: "AC-D01-02",
        titulo: "Definir un responsable del avance",
        objetivo: "Sostener el avance.",
        porQue: "No hay control periódico.",
      }),
    ]);
    expect(resumen.total).toBe(2);
    expect(resumen.internas).toBe(1);
    expect(resumen.posibleFinanciacion).toBe(1);
  });

  it("solo proyecta el proyecto financiable cuando podría requerir inversión", () => {
    const ruta = clasificarIntervencion(base);
    expect(proyectoFinanciable(base, ruta)).not.toBeNull();
    const interna = clasificarIntervencion({
      ...base,
      titulo: "Definir un responsable del avance",
      objetivo: "Sostener el avance.",
      porQue: "No hay control periódico.",
    });
    expect(proyectoFinanciable(base, interna)).toBeNull();
  });

  it("devuelve referencias financieras pertinentes sin evaluar elegibilidad", () => {
    expect(referenciasPara(["tecnologia"]).map((r) => r.id)).toEqual(["REF-BC-TRANSFORMACION"]);
    expect(referenciasPara(["desconocido"]).length).toBe(2);
  });
});
