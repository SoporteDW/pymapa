import { describe, expect, it } from "vitest";
import { responseSemanticValue } from "./response-value";
describe("B01 · valores de disponibilidad", () => {
  it("UNKNOWN no envía cadena vacía al contrato existente", () => expect(responseSemanticValue("UNKNOWN", "")).toBeNull());
  it("NOT_APPLICABLE conserva la razón separada sin valor semántico", () => expect(responseSemanticValue("NOT_APPLICABLE", "")).toBeNull());
  it("KNOWN preserva literalmente el valor aportado", () => expect(responseSemanticValue("KNOWN", "Dato sintético")).toBe("Dato sintético"));
  it("CONTRADICTORY preserva el relato de conflicto", () => expect(responseSemanticValue("CONTRADICTORY", "Dos versiones")).toBe("Dos versiones"));
});