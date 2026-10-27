/** Los estados de disponibilidad sin descripción no envían texto vacío. */
export function responseSemanticValue(state: string, value: unknown): string | null {
  if (state !== "KNOWN" && state !== "CONTRADICTORY") return null;
  return typeof value === "string" && value.length > 0 ? value : null;
}