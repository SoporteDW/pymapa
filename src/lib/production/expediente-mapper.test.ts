import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { extraerPdf } from "@/lib/document-first/pdf-texto";
import { OFFICIAL_CAPABILITY_IDS, getRegisteredPack } from "./packs-registry";
import { catalogoDePack, proponerCorrespondencias, type FragmentoExpediente } from "./expediente-mapper";
import { fragmentosConContexto } from "./expediente-extraction";

const DIR = join(__dirname, "fixtures/expediente-qhapaq");
const catalogo = OFFICIAL_CAPABILITY_IDS.flatMap((id) => catalogoDePack(id, getRegisteredPack(id).pack));

async function fragmentos(contexto = false): Promise<FragmentoExpediente[]> {
  const out: FragmentoExpediente[] = [];
  for (const f of readdirSync(DIR).filter((n) => n.endsWith(".pdf"))) {
    const doc = await extraerPdf(new Uint8Array(readFileSync(join(DIR, f))));
    out.push(...(contexto ? fragmentosConContexto(doc) : doc.fragmentos).map((x) => ({ evidenceId: f, documentTitle: f, fragmentId: x.id, page: x.pagina, section: x.seccion, text: x.texto })));
  }
  return out;
}

describe("expediente transversal · mapeo léxico determinista", () => {
  it("evalúa antes/después el mismo corpus sin cuotas ni confirmaciones automáticas", async () => {
    const originales = await fragmentos();
    const contexto = await fragmentos(true);
    const antes = proponerCorrespondencias(catalogo, originales, new Set());
    const despues = proponerCorrespondencias(catalogo, contexto, new Set());
    expect(antes).toHaveLength(207);
    expect(despues.length).toBeGreaterThanOrEqual(antes.length);
    expect(new Set(despues.map((p) => `${p.capabilityId}::${p.acquisitionId}`)).size).toBe(despues.length);
    for (const p of despues) expect(contexto.find((f) => f.evidenceId === p.evidenceId && f.fragmentId === p.fragmentId)?.text).toBe(p.quote);
    console.info(`[benchmark] originales=${originales.length} contexto=${contexto.length} antes=${antes.length} despues=${despues.length} altas=${despues.filter((p) => p.match === "ALTA").length}`);
  });
  it("las opciones cerradas siempre requieren elección manual, incluso con cita coincidente", () => {
    const a = { capabilityId: "DG-01", acquisitionId: "A", mode: "QUESTION", label: "Ventas costos", labelSource: "QUESTION" as const, closedOptions: true, matchText: "ventas costos" };
    const f = { evidenceId: "e", documentTitle: "d", fragmentId: "p1-f0", page: 1, section: null, text: "Las ventas y los costos constan en este documento." };
    expect(proponerCorrespondencias([a], [f], new Set())).toEqual([]);
  });
  it("el desempate no depende del orden de los documentos", async () => {
    const fs = await fragmentos(true);
    expect(proponerCorrespondencias(catalogo, fs, new Set())).toEqual(proponerCorrespondencias(catalogo, [...fs].reverse(), new Set()));
  });
  it("cataloga las 448 adquisiciones de las 31 capacidades con texto literal del pack", () => {
    expect(catalogo).toHaveLength(448);
    expect(new Set(catalogo.map((a) => a.capabilityId)).size).toBe(31);
  });

  it("toda cita propuesta es texto literal de un fragmento del documento", async () => {
    const frs = await fragmentos();
    const textos = new Set(frs.map((f) => f.text));
    const props = proponerCorrespondencias(catalogo, frs, new Set());
    expect(props.length).toBeGreaterThan(0);
    for (const p of props) expect(textos.has(p.quote)).toBe(true);
    const caps = new Set(props.map((p) => p.capabilityId));
    console.info(`[expediente] fragmentos=${frs.length} propuestas=${props.length} alta=${props.filter((p) => p.match === "ALTA").length} capacidades=${caps.size}/31`);
  });

  it("no propone nada para adquisiciones ya respondidas", async () => {
    const frs = await fragmentos();
    const todas = new Set(catalogo.map((a) => `${a.capabilityId}::${a.acquisitionId}`));
    expect(proponerCorrespondencias(catalogo, frs, todas)).toHaveLength(0);
  });

  it("sin documentos no hay propuestas (nunca se rellena)", () => {
    expect(proponerCorrespondencias(catalogo, [], new Set())).toHaveLength(0);
  });

  it("un documento ajeno al tema no produce coincidencias", () => {
    const ajeno: FragmentoExpediente[] = [{ evidenceId: "x", documentTitle: "x", fragmentId: "p1-f0", page: 1, section: null, text: "La receta lleva harina, huevos, azúcar y mantequilla batida durante diez minutos." }];
    expect(proponerCorrespondencias(catalogo, ajeno, new Set())).toHaveLength(0);
  });
});
