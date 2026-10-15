import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { catalogoCanonico, validarEntrada, verificarSalida } from "./interpretacion-documental";

const paginas = [{ pagina: 1, texto: "La empresa vende   café de origen a tiendas.\nSu principal restricción es la caja." }];

describe("interpretación documental DG-01 · verificación", () => {
  const cat = catalogoCanonico("DG-01");
  it("catálogo derivado del pack publicado", () => {
    expect(cat.packId).toBe("dg-01");
    expect(cat.necesidades.length).toBe(9);
  });
  it("acepta cita literal y deriva variables del pack, no del modelo", () => {
    const r = verificarSalida(cat, paginas, {
      propuestas: [{ informationNeedRef: "NI01", cita: "vende café de origen a tiendas", pagina: 1, hechoInterpretado: "x", justificacion: "y", variableRefs: ["VA99"] }],
      sinCorrespondencia: [],
    });
    expect(r.verificadas).toHaveLength(1);
    expect(r.verificadas[0].variableRefs).toEqual(["VA01"]);
    expect(r.verificadas[0].estado).toBe("CANDIDATE");
  });
  it("rechaza NI inventada, página inexistente y cita parafraseada", () => {
    const r = verificarSalida(cat, paginas, {
      propuestas: [
        { informationNeedRef: "NI99", cita: "vende café de origen", pagina: 1, hechoInterpretado: "", justificacion: "" },
        { informationNeedRef: "NI01", cita: "vende café de origen", pagina: 7, hechoInterpretado: "", justificacion: "" },
        { informationNeedRef: "NI02", cita: "el problema principal es el flujo de caja", pagina: 1, hechoInterpretado: "", justificacion: "" },
      ],
      sinCorrespondencia: ["NI99"],
    });
    expect(r.verificadas).toHaveLength(0);
    expect(r.descartadas.map((d) => d.motivo)).toEqual(["NI_NO_CANONICA", "PAGINA_INEXISTENTE", "CITA_NO_ENCONTRADA"]);
    expect(r.sinCorrespondencia).toEqual([]);
  });
  it("límites de entrada", () => {
    expect(validarEntrada([])).not.toBeNull();
    expect(validarEntrada(Array.from({ length: 6 }, (_, i) => ({ pagina: i + 1, texto: "texto suficiente aquí" })))).not.toBeNull();
    expect(validarEntrada([{ pagina: 1, texto: "a".repeat(20_001) }])).not.toBeNull();
    expect(validarEntrada(paginas)).toBeNull();
  });
  it("no modifica el pack publicado", () => {
    const pub = JSON.parse(readFileSync("knowledge/packs/dg-01/1.0.0/published.json", "utf8"));
    expect(cat.packChecksum).toBe(pub.checksum);
  });
});
