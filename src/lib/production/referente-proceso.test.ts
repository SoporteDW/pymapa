import { describe, expect, it } from "vitest";
import { referentesDocumentales } from "./capability-handlers";

const doc = (section: string | null, capabilityId = "OP-01", origin = "EXPEDIENTE_DOCUMENTAL") => ({ payload: { capabilityId, raw: { origin, section } } });

describe("H01 · referente literal de «este proceso»", () => {
  it("usa el título literal de la sección confirmada, sin numeración", () => {
    expect(referentesDocumentales([doc("01 · Proceso de producción por pedido")], "OP-01")).toEqual(["Proceso de producción por pedido"]);
  });
  it("no toma respuestas de otra capacidad ni respuestas no documentales", () => {
    expect(referentesDocumentales([doc("01 · Ventas", "CO-01"), doc("02 · Compras", "OP-01", "MANUAL")], "OP-01")).toEqual([]);
  });
  it("sin sección confirmada no hay referente (se pide aclarar)", () => {
    expect(referentesDocumentales([doc(null)], "OP-01")).toEqual([]);
  });
});
