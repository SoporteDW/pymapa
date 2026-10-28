/**
 * DEC-053 · AI_ASSISTED_ANALYSIS — contrato puro (sin red ni base de datos).
 *
 * - Solo capacidades CAPTURE_ONLY (sin motor institucional).
 * - Cinco categorías separadas; nunca ENGINE_FINDING, EPAR, puntajes,
 *   rankings ni recomendaciones institucionales.
 * - SUPPORTED_FACT exige cita literal contenida en una entrada referenciada.
 * - Toda referencia debe existir en las entradas enviadas; lo demás se
 *   rechaza y se conserva como rechazado (nunca se reclasifica por defecto).
 */

export const AI_ANALYSIS_CONTRACT_VERSION = "DEC-053/1.0.0";
export const AI_ANALYSIS_TYPE = "AI_ASSISTED_ANALYSIS" as const;

export const CATEGORIAS = ["SUPPORTED_FACT", "INFERENCE", "UNCERTAINTY", "INFORMATION_GAP", "PROVISIONAL_SUGGESTION"] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export const ETIQUETA_CATEGORIA: Record<Categoria, string> = {
  SUPPORTED_FACT: "Hecho respaldado",
  INFERENCE: "Inferencia",
  UNCERTAINTY: "Incertidumbre",
  INFORMATION_GAP: "Información faltante",
  PROVISIONAL_SUGGESTION: "Sugerencia provisional",
};

export interface EntradaAnalisis {
  /** observationId (respuesta vigente) o evidenceId. */
  ref: string;
  kind: "RESPONSE" | "EVIDENCE_QUOTE";
  acquisitionId: string | null;
  label: string | null;
  text: string;
}

export interface ItemAnalisis {
  id: string;
  category: Categoria;
  statement: string;
  inputRefs: string[];
  quote: string | null;
}

export interface ItemRechazado {
  raw: unknown;
  reason:
    | "INVALID_SHAPE"
    | "INVALID_CATEGORY"
    | "UNKNOWN_REF"
    | "QUOTE_NOT_LITERAL"
    | "FACT_WITHOUT_QUOTE"
    | "FORBIDDEN_CONTENT";
}

/** Contenido prohibido por DEC-053 (puntajes, rankings, hallazgos institucionales). */
const PROHIBIDO = [
  /ENGINE_FINDING/i,
  /PROFESSIONAL_ASSESSMENT|EPAR/i,
  /\bpuntaje\b|\bscore\b|\bpuntuaci[oó]n\b/i,
  /\branking\b|\bclasificaci[oó]n de madurez\b/i,
  /\bnivel de madurez\b|\bmadurez\s*\d/i,
  /\b\d+(?:[.,]\d+)?\s*\/\s*(?:5|10|100)\b/,
  /hallazgo (?:institucional|confirmado)/i,
  /recomendaci[oó]n institucional/i,
];

export const ANALYSIS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["items"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["category", "statement", "inputRefs", "quote"],
        properties: {
          category: { type: "string", enum: [...CATEGORIAS] },
          statement: { type: "string" },
          inputRefs: { type: "array", items: { type: "string" } },
          quote: { type: ["string", "null"] },
        },
      },
    },
  },
} as const;

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

export function validarAnalisis(raw: unknown, entradas: EntradaAnalisis[]): { items: ItemAnalisis[]; rejected: ItemRechazado[] } {
  const porRef = new Map(entradas.map((e) => [e.ref, e]));
  const lista = (raw as { items?: unknown })?.items;
  const items: ItemAnalisis[] = [];
  const rejected: ItemRechazado[] = [];
  if (!Array.isArray(lista)) return { items, rejected: [{ raw, reason: "INVALID_SHAPE" }] };
  lista.forEach((r, i): void => {
    const rej = (reason: ItemRechazado["reason"]) => { rejected.push({ raw: r, reason }); };
    const o = r as Partial<ItemAnalisis>;
    if (!o || typeof o.statement !== "string" || !o.statement.trim() || !Array.isArray(o.inputRefs)) return rej("INVALID_SHAPE");
    if (!CATEGORIAS.includes(o.category as Categoria)) return rej("INVALID_CATEGORY");
    const quote = typeof o.quote === "string" && o.quote.trim() ? o.quote.trim() : null;
    if (PROHIBIDO.some((re) => re.test(o.statement!) || (quote ? re.test(quote) : false))) return rej("FORBIDDEN_CONTENT");
    const refs = [...new Set(o.inputRefs.filter((x): x is string => typeof x === "string"))];
    const needsRef = o.category !== "INFORMATION_GAP";
    if ((needsRef && !refs.length) || refs.some((x) => !porRef.has(x))) return rej("UNKNOWN_REF");
    if (o.category === "SUPPORTED_FACT" && !quote) return rej("FACT_WITHOUT_QUOTE");
    if (quote && !refs.some((x) => norm(porRef.get(x)!.text).includes(norm(quote)))) return rej("QUOTE_NOT_LITERAL");
    items.push({ id: `item-${i + 1}`, category: o.category as Categoria, statement: o.statement.trim(), inputRefs: refs, quote });
  });
  return { items, rejected };
}

export function construirPrompt(p: { capabilityName: string; definition: string | null; entradas: EntradaAnalisis[]; pendientes: string[] }) {
  const system = [
    "Eres un analista asistente de Pymapa. Produces AI_ASSISTED_ANALYSIS, nunca un diagnóstico institucional.",
    "Clasifica cada afirmación en UNA categoría: SUPPORTED_FACT (con cita literal exacta de una entrada), INFERENCE (razonamiento explícito desde entradas citadas), UNCERTAINTY, INFORMATION_GAP (dato que falta), PROVISIONAL_SUGGESTION (idea provisional sujeta a revisión).",
    "Prohibido: puntajes, niveles de madurez, rankings, hallazgos confirmados, recomendaciones institucionales. No inventes datos ni cifras.",
    "inputRefs solo puede contener ref de las entradas dadas. Responde en español.",
  ].join("\n");
  const user = JSON.stringify({
    capability: p.capabilityName,
    definition: p.definition,
    entradas: p.entradas.map((e) => ({ ref: e.ref, pregunta: e.label, texto: e.text })),
    datosAunNoRespondidos: p.pendientes.slice(0, 40),
  });
  return { system, user };
}
