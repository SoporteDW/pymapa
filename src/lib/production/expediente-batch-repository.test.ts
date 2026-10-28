import { describe, expect, it } from "vitest";
import { createInMemoryProductionRepository } from "./puertos";
import { expedienteBatchRepository } from "./expediente-batch-repository";

describe("lecturas de lote documental", () => {
  it("no memoiza observaciones: dos respuestas siempre son visibles a la evaluación", async () => {
    const base = createInMemoryProductionRepository();
    const repo = expedienteBatchRepository(base);
    expect(await repo.listObservations("a")).toHaveLength(0);
    await repo.insertObservation({ organizationId: "o", assessmentId: "a", sourceResponseId: null, respondentId: null, variableRef: "VA01", value: { acquisitionRef: "ACQ1", knowledgeState: "KNOWN", semanticValue: "Literal" } });
    expect(await repo.listObservations("a")).toHaveLength(1);
  });
});