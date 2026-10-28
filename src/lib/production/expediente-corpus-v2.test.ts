import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { extraerPdf } from "@/lib/document-first/pdf-texto";
import { OFFICIAL_CAPABILITY_IDS, getRegisteredPack } from "./packs-registry";
import { catalogoDePack, evidenciaPorDocumento, proponerCorrespondencias, type FragmentoExpediente } from "./expediente-mapper";
import { fragmentosConContexto } from "./expediente-extraction";
import { clasificarSuficiencia, resumenSuficiencia } from "./expediente-suficiencia";

const catalogo = OFFICIAL_CAPABILITY_IDS.flatMap((id) => catalogoDePack(id, getRegisteredPack(id).pack));
const refs = catalogo.map((a) => ({ capabilityId: a.capabilityId, acquisitionId: a.acquisitionId, informationNeed: a.label }));

async function corpus(dir: string): Promise<FragmentoExpediente[]> {
  const D = join(__dirname, "fixtures", dir);
  const out: FragmentoExpediente[] = [];
  for (const f of readdirSync(D).filter((n) => n.endsWith(".pdf")).sort()) {
    const bytes = readFileSync(join(D, f));
    expect(bytes.toString("latin1").length).toBeGreaterThan(0);
    const doc = await extraerPdf(new Uint8Array(bytes));
    expect(doc.fragmentos.map((x) => x.texto).join(" ")).toContain("DOCUMENTO SINTÉTICO DE DEMOSTRACIÓN");
    out.push(...fragmentosConContexto(doc).map((x) => ({ evidenceId: f, documentTitle: f, fragmentId: x.id, page: x.pagina, section: x.seccion, text: x.texto })));
  }
  return out;
}

async function medir(dir: string) {
  const frs = await corpus(dir);
  const props = proponerCorrespondencias(catalogo, frs, new Set());
  const porDoc = evidenciaPorDocumento(catalogo, frs, new Set());
  const clas = clasificarSuficiencia(refs, porDoc, new Set());
  return { fragmentos: frs.length, propuestas: props.length, altas: props.filter((p) => p.match === "ALTA").length, clas, resumen: resumenSuficiencia(clas) };
}

describe("Bloque 5 · corpus sintético v2 · suficiencia sin cuotas", () => {
  it("v2 aumenta evidencia, sin SUFICIENTE automático, y detecta contradicciones deliberadas", async () => {
    const v1 = await medir("expediente-qhapaq");
    const v2 = await medir("expediente-qhapaq-v2");
    expect(v2.propuestas).toBeGreaterThan(v1.propuestas);
    expect(v2.resumen.SUFICIENTE).toBe(0);
    expect(v2.resumen.contradicciones).toBeGreaterThan(0);
    expect(v2.resumen.AUSENTE).toBeGreaterThan(0);
    const total = (r: typeof v2.resumen) => r.SUFICIENTE + r.PARCIAL + r.AUSENTE + r.contradicciones;
    expect(total(v2.resumen)).toBe(448);
    const contra = v2.clas.filter((c) => c.sufficiency === "CONTRADICTORIA");
    for (const c of contra) expect(c.documents.length).toBeGreaterThan(1);
    const out = join(__dirname, "../../../docs/evidence/mvp31-block5");
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, "corpus-v1-v2.json"), JSON.stringify({ v1: { ...v1, clas: undefined }, v2: { ...v2, clas: undefined } }, null, 2));
    const porCap = OFFICIAL_CAPABILITY_IDS.map((id) => {
      const c = v2.clas.filter((x) => x.capabilityId === id);
      const n = (s: string) => c.filter((x) => x.sufficiency === s).length;
      return `${id},${c.length},${n("SUFICIENTE")},${n("PARCIAL")},${n("AUSENTE")},${n("CONTRADICTORIA")}`;
    });
    writeFileSync(join(out, "sufficiency-v2-by-capability.csv"), ["capability,total,SUFICIENTE,PARCIAL,AUSENTE,CONTRADICTORIA", ...porCap].join("\n"));
    writeFileSync(join(out, "contradictions-v2.json"), JSON.stringify(contra, null, 2));
    console.info(`[bloque5] v1 ${JSON.stringify({ ...v1, clas: undefined })}\n[bloque5] v2 ${JSON.stringify({ ...v2, clas: undefined })}`);
  }, 60000);
  it("la confirmación humana es la única vía a SUFICIENTE y no resuelve contradicciones", async () => {
    const frs = await corpus("expediente-qhapaq-v2");
    const porDoc = evidenciaPorDocumento(catalogo, frs, new Set());
    const todas = new Set(refs.map((r) => `${r.capabilityId}::${r.acquisitionId}`));
    const clas = clasificarSuficiencia(refs, porDoc, todas);
    for (const c of clas) {
      if (c.documents.length === 0) expect(c.sufficiency).toBe("AUSENTE");
      else if (c.possibleContradiction) expect(c.sufficiency).toBe("CONTRADICTORIA");
      else expect(c.sufficiency).toBe("SUFICIENTE");
    }
  }, 60000);
});
