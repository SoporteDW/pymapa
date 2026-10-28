import { describe, expect, it } from "vitest";
import { getRegisteredPack } from "./packs-registry";
import { createActionableProjector } from "./actionable";
import {
  CTX_Q_ENABLED,
  antecedentesPara,
  buildContextualContracts,
  isContextualEnabled,
  requiereReferente,
  sanearReferente,
  type AntecedenteFuente,
} from "./contextual-questions";

const MUESTRA = ["OP-01", "DG-02", "PC-04", "CM-01", "EC-03"];
const contratosDe = (c: string) => buildContextualContracts(c, getRegisteredPack(c).pack);

describe("CTX-Q-B01 · capa contextual", () => {
  it("alcance cerrado: solo las 5 capacidades de la muestra", () => {
    expect([...CTX_Q_ENABLED].sort()).toEqual([...MUESTRA].sort());
    expect(isContextualEnabled("OP-02")).toBe(false);
    expect(contratosDe("OP-02").size).toBe(0);
    expect(createActionableProjector(getRegisteredPack("OP-02").pack).project("ACQ·NI01")?.contextualContract ?? null).toBeNull();
  });

  it("cada adquisición de la muestra tiene contrato y el texto es literal del paquete", () => {
    for (const c of MUESTRA) {
      const pack = getRegisteredPack(c).pack as { acquisitions: { id: string; question?: string }[]; acquisitionStages?: { id: string; prompts: string[] }[] };
      const ct = contratosDe(c);
      expect(ct.size).toBe(pack.acquisitions.length);
      const literales = [
        ...pack.acquisitions.map((a) => a.question ?? ""),
        ...(pack.acquisitionStages ?? []).flatMap((s) => s.prompts),
      ].join("\n");
      for (const k of ct.values()) if (k.sourceText) expect(literales).toContain(k.sourceText);
    }
  });

  it("DG-02 y PC-04 reutilizan los prompts P1 de etapa (1:N)", () => {
    const dg = contratosDe("DG-02").get("ACQ·NI01")!;
    expect(dg.sourceKind).toBe("STAGE_PROMPT");
    expect(dg.sourceText).toBe("¿Qué cambios/iniciativas importantes están compitiendo por recursos?");
    expect(dg.targetAcquisitionRefs).toEqual(["ACQ·NI01", "ACQ·NI02"]);
    const pc = contratosDe("PC-04").get("ACQ·NI01")!;
    expect(pc.sourceText).toBe("¿Hay cosas importantes que solo una persona sabe hacer o explicar?");
    expect(pc.kind).toBe("EXPLORATORY");
    expect(contratosDe("PC-04").get("ACQ·NI12")!.kind).toBe("REFERENT_DEPENDENT");
  });

  it("C2 · ninguna pregunta con referencia ambigua queda sin tipo de referente", () => {
    for (const c of MUESTRA) {
      for (const k of contratosDe(c).values()) {
        if (requiereReferente(k.sourceText)) {
          expect(k.kind).toBe("REFERENT_DEPENDENT");
          expect(k.referentType).not.toBeNull();
        }
      }
    }
    expect(requiereReferente("¿Qué esperan realmente obtener de este tercero?")).toBe(true);
    expect(requiereReferente("¿Quiénes son realmente los clientes para los que este problema es más importante?")).toBe(true);
    expect(requiereReferente("¿Qué intentan resolver cuando los buscan?")).toBe(false);
  });

  it("hay al menos una exploratoria y una dependiente por capacidad con ambos tipos", () => {
    for (const c of ["DG-02", "PC-04", "CM-01"]) {
      const kinds = new Set([...contratosDe(c).values()].map((k) => k.kind));
      expect(kinds).toEqual(new Set(["EXPLORATORY", "REFERENT_DEPENDENT"]));
    }
    for (const c of ["OP-01", "EC-03"]) {
      expect([...contratosDe(c).values()].every((k) => k.kind === "REFERENT_DEPENDENT")).toBe(true);
    }
  });

  it("C3 · respuesta amplia aparece íntegra como antecedente, sin marcar secundarias", () => {
    const ct = contratosDe("DG-02");
    const amplia = "Compiten la compra de una máquina y el nuevo ERP; decide el gerente según caja.";
    const resp: AntecedenteFuente[] = [{ observationId: "o1", acquisitionId: "ACQ·NI01", semanticValue: amplia, knowledgeState: "KNOWN", superseded: false }];
    const ant = antecedentesPara("ACQ·NI02", ct, resp);
    expect(ant).toHaveLength(1);
    expect(ant[0]!.semanticValue).toBe(amplia);
    expect(antecedentesPara("ACQ·NI05", ct, resp)).toHaveLength(0);
    expect(antecedentesPara("ACQ·NI02", ct, [{ ...resp[0]!, superseded: true }])).toHaveLength(0);
    // La proyección accionable no cuenta NI02 como respondida por antecedente.
    const proj = createActionableProjector(getRegisteredPack("DG-02").pack);
    expect(proj.project("ACQ·NI02")?.contextualContract?.primaryAcquisitionRef).toBe("ACQ·NI02");
  });

  it("referente saneado y acotado", () => {
    expect(sanearReferente("  Tejido   ")).toBe("Tejido");
    expect(sanearReferente("x")).toBeNull();
    expect(sanearReferente(42)).toBeNull();
    expect(sanearReferente("a".repeat(400))!.length).toBe(160);
  });
});
