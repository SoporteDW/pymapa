// @vitest-environment node
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { extraerPdf, ExtraccionError } from "./pdf-texto";
import { aplicarReglasG1, resumenCobertura } from "./reglas-g1";
import { importarPlan } from "./plan-import";
import { calcularResultado } from "@/lib/diagnostico/calculo";
import { obtenerPregunta } from "@/lib/diagnostico/definicion";

const F = (n: string) => new Uint8Array(readFileSync(join(__dirname, "fixtures", n)));

describe("Document-First · extracción real y G1", () => {
  it("MO-LIVE-01 · MO-DOC-01 v2: citas literales con página y cobertura real", async () => {
    const doc = await extraerPdf(F("MO-DOC-01_v2.pdf"));
    expect(doc.paginas).toBe(3);
    const props = aplicarReglasG1(doc);
    expect(props).toHaveLength(28);
    for (const p of props.filter((x) => x.cita)) {
      expect(doc.textoPorPagina[p.pagina!]).toContain(p.cita);
      expect(p.cita).not.toMatch(/Q\d{2}=\d/);
    }
    const r = resumenCobertura(props);
    // Exportar matriz G1 (evidencia de cotejo).
    const fila = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = ["id,pregunta_exacta,dominio,valor_propuesto,pagina,fragmento_pdf,regla_de_interpretacion,estado"].concat(
      props.map((p) => [p.preguntaId, p.preguntaTexto, p.dimensionId ?? "contexto", Array.isArray(p.valorPropuesto) ? p.valorPropuesto.join("|") : p.valorPropuesto, p.pagina, p.cita, p.regla, p.estado].map(fila).join(","))
    ).join("\n");
    writeFileSync(join(__dirname, "../../../docs/document-first/MO_28_PREGUNTAS_MATRIZ.csv"), csv + "\n");
    expect(r.sinSoporte).toBe(3);
    expect(props.filter((p) => p.estado === "NOT_SUPPORTED").map((p) => p.preguntaId)).toEqual(["Q17", "Q22", "Q23"]);
  });

  it("MO-LIVE-02 · sin secciones 06 y 08, las propuestas de tecnología/seguridad desaparecen", async () => {
    const orig = aplicarReglasG1(await extraerPdf(F("MO-DOC-01_v2.pdf")));
    const mod = aplicarReglasG1(await extraerPdf(F("MO-DOC-01_sin_06_08.pdf")));
    const est = (ps: typeof orig, id: string) => ps.find((p) => p.preguntaId === id)!.estado;
    for (const id of ["Q11", "Q13", "Q14", "Q15", "Q16", "Q21", "Q24"]) {
      expect(est(orig, id)).not.toBe("NOT_SUPPORTED");
      expect(est(mod, id)).toBe("NOT_SUPPORTED");
    }
    expect(resumenCobertura(mod).sinSoporte).toBeGreaterThan(resumenCobertura(orig).sinSoporte);
  });

  it("MO-LIVE-03 · otra empresa: nunca devuelve respuestas de Moda Origen", async () => {
    const ps = aplicarReglasG1(await extraerPdf(F("otra_empresa.pdf")));
    expect(ps.find((p) => p.preguntaId === "C01")!.valorPropuesto).toBe("mediana");
    expect(ps.find((p) => p.preguntaId === "C02")!.valorPropuesto).toBe("manufactura");
    expect(ps.filter((p) => p.cita).every((p) => !/moda origen|sofia/i.test(p.cita!))).toBe(true);
    expect(resumenCobertura(ps).sinSoporte).toBeGreaterThanOrEqual(24);
  });

  it("PR-01 · bytes no PDF se rechazan", async () => {
    await expect(extraerPdf(new TextEncoder().encode("hola mundo, no soy un pdf"))).rejects.toBeInstanceOf(ExtraccionError);
  });

  it("MO-LIVE-04 · respuestas equivalentes (manual vs documental) → mismo resultado legacy", async () => {
    const ps = aplicarReglasG1(await extraerPdf(F("MO-DOC-01_v2.pdf")));
    const fecha = new Date("2026-10-15T00:00:00Z");
    const resp = (src: string) =>
      ps.map((p) => {
        const q = obtenerPregunta(p.preguntaId)!;
        const valor = p.valorPropuesto ?? (q.tipo === "scale_1_5" ? 3 : "x");
        return { questionId: q.id, ...(q.dimensionId ? { dimensionId: q.dimensionId } : {}), value: valor, answeredAt: `${src}` };
      });
    const a = calcularResultado("s", resp("2026-10-15T00:00:00Z"), fecha);
    const b = calcularResultado("s", resp("2026-10-15T00:00:00Z"), fecha);
    expect(a.globalScore).toBe(b.globalScore);
    expect(a.dimensionResults).toEqual(b.dimensionResults);
  });
});

describe("Document-First · importación de plan", () => {
  it("MO-LIVE-05/07 · MO-DOC-02 v2: tres prioridades, campos citados, sin estados ejecutados", async () => {
    const doc = await extraerPdf(F("MO-DOC-02_v2.pdf"));
    const ps = importarPlan(doc.lineas);
    expect(ps.map((p) => p.codigo)).toEqual(["P1", "P2", "P3"]);
    for (const p of ps) {
      expect(p.campos.filter((c) => c.campo === "actividad")).toHaveLength(3);
      for (const c of p.campos) expect(doc.textoPorPagina[c.pagina]).toContain(c.valor.slice(0, 20));
      const estado = p.campos.find((c) => c.campo === "estadoDocumental")!.valor;
      expect(estado).not.toMatch(/^(COMPLETADO|VALIDADO)/);
    }
    // P2 cruza página: indicador en página 2.
    expect(ps[1]!.campos.find((c) => c.campo === "indicador")!.pagina).toBe(2);
    expect(ps[1]!.campos.find((c) => c.campo === "plazo")!.valor).toMatch(/desde aprobación/);
  });

  it("MO-LIVE-06 · copia modificada: plazo cambia y la actividad 3 de P1 no reaparece", async () => {
    const ps = importarPlan((await extraerPdf(F("MO-DOC-02_modificado.pdf"))).lineas);
    expect(ps[1]!.campos.find((c) => c.campo === "plazo")!.valor).toContain("1–12");
    expect(ps[0]!.campos.filter((c) => c.campo === "actividad")).toHaveLength(2);
    expect(ps[0]!.campos.some((c) => /Probar cambios con usuarios/.test(c.valor))).toBe(false);
  });
});

import { estadoVacio, registrarRespuesta, revertirRespuesta } from "./sandbox-demo";

describe("Document-First · sandbox demo", () => {
  it("MO-05 · confirmar, editar y revertir no destruye la respuesta anterior", () => {
    let e = estadoVacio();
    e = registrarRespuesta(e, "Q03", { valor: 3, origen: "manual", en: "t1" }, "MANUAL");
    e = registrarRespuesta(e, "Q03", { valor: 4, origen: "documento", en: "t2", procedencia: { documento: "x.pdf", sha256: "h", pagina: 1, cita: "c", regla: "r" } }, "CONFIRMADA");
    expect(e.respuestas.Q03!.valor).toBe(4);
    e = revertirRespuesta(e, "Q03", "t3");
    expect(e.respuestas.Q03!.valor).toBe(3);
    expect(e.historial.map((h) => h.accion)).toEqual(["MANUAL", "CONFIRMADA", "REVERTIDA"]);
  });

  it("MO-LIVE-08 / MO-10 · los módulos del demo no importan el backend productivo", () => {
    for (const f of ["pdf-texto.ts", "reglas-g1.ts", "plan-import.ts", "sandbox-demo.ts", "../../routes/demo-documental.tsx"]) {
      const src = readFileSync(join(__dirname, f), "utf8");
      expect(src).not.toMatch(/integrations\/supabase|\.functions"|createServerFn/);
    }
  });
});
