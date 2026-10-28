import { describe, expect, it } from "vitest";
import { getRegisteredPack, listPublishedCapabilities } from "./packs-registry";
import { createActionableProjector } from "./actionable";
import { formularDesdeEnunciado, OPERATIVE_WORDING_VERSION } from "./operative-questions";

describe("DEC-054 · preguntas operativas", () => {
  it("toda adquisición sin pregunta literal recibe pregunta operativa trazable en las 31 capacidades", () => {
    let total = 0, operativas = 0;
    for (const { capabilityId: id } of listPublishedCapabilities()) {
      const pack = getRegisteredPack(id).pack as { acquisitions: { id: string; question?: unknown }[] };
      const proj = createActionableProjector(pack);
      for (const a of pack.acquisitions) {
        total++;
        const p = proj.project(a.id)!;
        if (typeof a.question === "string") {
          expect(p.operativeQuestion).toBeNull();
          expect(p.question).toBe(a.question);
        } else {
          expect(p.operativeQuestion, `${id} ${a.id}`).not.toBeNull();
          expect(p.operativeQuestion!.questionId).toBe(`OQ·${id}·${a.id}`);
          expect(p.operativeQuestion!.wordingVersion).toBe(OPERATIVE_WORDING_VERSION);
          expect(p.operativeQuestion!.text).toMatch(/^¿.+\?$/);
          operativas++;
        }
      }
    }
    expect(total).toBe(448);
    expect(operativas).toBeGreaterThan(0);
  });

  it("conserva el enunciado aprobado sin añadir contenido", () => {
    expect(formularDesdeEnunciado("Cómo crea valor actualmente la empresa")).toBe("¿Cómo crea valor actualmente la empresa?");
    expect(formularDesdeEnunciado("Que procesos son necesarios.")).toBe("¿Qué procesos son necesarios?");
    expect(formularDesdeEnunciado("problema/oportunidad;")).toBe("¿Qué información tiene hoy la empresa sobre: problema/oportunidad?");
  });
});
