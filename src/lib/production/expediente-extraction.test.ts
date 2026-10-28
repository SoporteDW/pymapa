import { describe, expect, it } from "vitest";
import type { DocumentoExtraido } from "@/lib/document-first/pdf-texto";
import { fragmentosConContexto } from "./expediente-extraction";

const doc: DocumentoExtraido = {
  extractorVersion: "fixture", paginas: 2, sha256: "fixture", lineas: [],
  textoPorPagina: { 1: "Ventas aumentaron. Costos disminuyeron. Recursos disponibles.", 2: "Riesgos pendientes." },
  fragmentos: [
    { id: "p1-f0", pagina: 1, seccion: "Finanzas", texto: "Ventas aumentaron." },
    { id: "p1-f1", pagina: 1, seccion: "Finanzas", texto: "Costos disminuyeron." },
    { id: "p1-f2", pagina: 1, seccion: "Personal", texto: "Recursos disponibles." },
    { id: "p2-f0", pagina: 2, seccion: "Personal", texto: "Riesgos pendientes." },
  ],
};

describe("contexto documental literal", () => {
  it("recupera contexto contiguo sin inferir ni modificar fragmentos históricos", () => {
    const resultado = fragmentosConContexto(doc);
    expect(resultado.filter((f) => f.id.includes("ctx")).map((f) => f.texto)).toEqual(["Ventas aumentaron. Costos disminuyeron."]);
    expect(doc.fragmentos).toHaveLength(4);
  });
  it("no une secciones ni páginas y cada cita está contenida literalmente", () => {
    for (const f of fragmentosConContexto(doc)) expect(doc.textoPorPagina[f.pagina]).toContain(f.texto);
    expect(fragmentosConContexto(doc).some((f) => f.texto.includes("disponibles. Riesgos"))).toBe(false);
  });
  it("rechaza contexto discontinuo que no existe en la página", () => {
    expect(fragmentosConContexto({ ...doc, textoPorPagina: { 1: "Ventas aumentaron. Texto intermedio. Costos disminuyeron." } }).filter((f) => f.id.includes("ctx"))).toEqual([]);
  });
});