import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { SEM_QA_01_CORPUS, SEM_QA_01_CORPUS_CHECKSUM, checksumCorpus, sha256Texto, textoCanonico } from "./sem-qa-corpus";
import { catalogoCanonico, verificarSalida } from "./interpretacion-documental";
import { extraerPdf } from "@/lib/document-first/pdf-texto";
import { autorizarSemQa, esAutorizacionSemQaValida, SemQaRechazo } from "./sem-qa-guard.server";
import { interpretarDocumento } from "./interpretar-documento.server";

vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: () => ({ insert: async () => ({ error: null }) }) } }));

const FILES: Record<string, string> = {
  "SEMQA01-S1": "SEMQA01-S1_hecho_explicito.pdf",
  "SEMQA01-S2": "SEMQA01-S2_inferencia.pdf",
  "SEMQA01-S3": "SEMQA01-S3_negacion.pdf",
  "SEMQA01-S4": "SEMQA01-S4_contradiccion.pdf",
  "SEMQA01-S5": "SEMQA01-S5_ausencia.pdf",
};

describe("SEM-QA-01 · corpus aprobado", () => {
  it("el checksum compuesto coincide con el fijado", async () => {
    expect(await checksumCorpus()).toBe(SEM_QA_01_CORPUS_CHECKSUM);
    expect(SEM_QA_01_CORPUS).toHaveLength(5);
  });
  it("cada archivo del corpus coincide con su checksum de archivo y de texto", async () => {
    for (const d of SEM_QA_01_CORPUS) {
      const doc = await extraerPdf(new Uint8Array(readFileSync(`docs/evidence/sem-qa-01/corpus/${FILES[d.documentId]}`)));
      expect(doc.sha256).toBe(d.fileSha256);
      expect(await sha256Texto(textoCanonico(doc.textoPorPagina))).toBe(d.textSha256);
    }
  });
});

describe("SEM-QA-01 · guarda fail-closed", () => {
  const ctx = { userId: "u", supabase: {} };
  it("rechaza ejecución distinta de SEM-QA-01 sin tocar datos", async () => {
    await expect(autorizarSemQa(ctx, { executionId: "OTRA", documentId: "SEMQA01-S1", evidenceId: crypto.randomUUID() })).rejects.toBeInstanceOf(SemQaRechazo);
  });
  it("rechaza documento fuera del corpus", async () => {
    await expect(autorizarSemQa(ctx, { executionId: "SEM-QA-01", documentId: "REAL-001", evidenceId: crypto.randomUUID() })).rejects.toThrow("DOCUMENT_NOT_IN_CORPUS");
  });
  it("una autorización falsificada no habilita el Gateway", async () => {
    const falsa = { executionId: "SEM-QA-01", paginas: [{ pagina: 1, texto: "SYNTHETIC_QA_ONLY texto arbitrario largo" }] };
    expect(esAutorizacionSemQaValida(falsa)).toBe(false);
    const client = { provider: "x", completeJson: vi.fn() };
    const r = await interpretarDocumento(falsa as never, "DG-01", client);
    expect(r.ok).toBe(false);
    expect(r.status).toBe(403);
    expect(client.completeJson).not.toHaveBeenCalled();
  });
});

describe("SEM-QA-01 · verificación de contradicciones y tipos", () => {
  const cat = catalogoCanonico("DG-01");
  const paginas = [
    { pagina: 1, texto: "Nuestro principal objetivo para 2027 es duplicar las ventas a hoteles." },
    { pagina: 2, texto: "En 2027 la empresa dejará de vender a hoteles." },
  ];
  it("una contradicción verificada descarta las propuestas de su NI", () => {
    const r = verificarSalida(cat, paginas, {
      propuestas: [{ informationNeedRef: "NI03", tipo: "EXPLICITO", cita: "duplicar las ventas a hoteles", pagina: 1, hechoInterpretado: "", justificacion: "" }],
      sinCorrespondencia: [],
      contradicciones: [{ informationNeedRef: "NI03", descripcion: "", citas: [{ cita: "duplicar las ventas a hoteles", pagina: 1 }, { cita: "dejará de vender a hoteles", pagina: 2 }] }],
    });
    expect(r.verificadas).toHaveLength(0);
    expect(r.contradicciones).toHaveLength(1);
    expect(r.descartadas.map((d) => d.motivo)).toContain("CONTRADICCION_NO_RESUELTA");
  });
  it("una contradicción con cita inventada no se acepta ni bloquea", () => {
    const r = verificarSalida(cat, paginas, {
      propuestas: [{ informationNeedRef: "NI03", tipo: "NEGACION", cita: "dejará de vender a hoteles", pagina: 2, hechoInterpretado: "", justificacion: "" }],
      sinCorrespondencia: [],
      contradicciones: [{ informationNeedRef: "NI03", descripcion: "", citas: [{ cita: "triplicar ventas en Europa", pagina: 1 }, { cita: "dejará de vender a hoteles", pagina: 2 }] }],
    });
    expect(r.contradicciones).toHaveLength(0);
    expect(r.verificadas[0]!.tipo).toBe("NEGACION");
    expect(r.verificadas[0]!.estado).toBe("CANDIDATE");
  });
});
