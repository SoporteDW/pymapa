/** Static presentation provenance only; no evaluator, pack or Engine imports. */
export const FUENTES_CONOCIMIENTO = {
  historico: [
    { ref: "CE01", texto: "Comprensión actual del negocio", fuente: "knowledge/intake/DG-01/text/DG-01.txt:340–345" },
    { ref: "VA01", texto: "Modelo y lógica actual de creación de valor", fuente: "knowledge/intake/DG-01/text/DG-01.txt:343 · dg-01@1.0.0" },
    { ref: "R-DG01-01", texto: "No existe comprensión suficiente de cómo funciona/crea valor materialmente el negocio para orientar la transformación.", fuente: "knowledge/intake/DG-01/text/DG-01.txt:487–488 (propuesta de fuente; no publicada en dg-01@1.0.0)" },
    { ref: "GUARDRAIL", texto: "Ausencia de una regla negativa ≠ demostración automática de un estado positivo.", fuente: "knowledge/intake/DG-01/text/DG-01.txt:530–531" },
    { ref: "DER-DG01-01", texto: "Detectar un condicionante de otra capacidad no autoriza a diagnosticarla desde DG-01.", fuente: "knowledge/intake/DG-01/text/DG-01.txt:535" },
  ],
  candidato: [
    { ref: "HF-DG01-01 ↔ R-DG01-01", texto: "Vinculación candidata. En la fuente HF-DG01-01 es «Dirección empresarial insuficientemente explícita», más cercana a R-DG01-03; su relación con BUSINESS_LOGIC_UNCLEAR no está aprobada.", fuente: "knowledge/intake/DG-01/text/DG-01.txt:571" },
  ],
  experimental: [
    { ref: "CRIT-PILOTO-01..05", texto: "Catálogo léxico de indicios (abajo). Creado para esta prueba; sin aprobación metodológica.", fuente: "packages/dg01-pilot/src/interprete-semantico.server.ts" },
  ],
} as const;