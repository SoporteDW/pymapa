/**
 * M2-FACTORY-CONTRACT-03 · Estructura explícita de la fuente (genérico).
 *
 * Dos funciones puras, sin ramas por capacidad y sin inferencia semántica:
 *  1. extractCapabilityDefinition — definición literal de la capacidad.
 *  2. linkInformationNeeds — NI y su vínculo NI→VA solo por estructura explícita.
 *
 * Toda salida es literal de la fuente con referencia de línea. Si la estructura
 * no soporta el valor, se preserva NOT_EXPLICIT / UNRESOLVED; nunca se redacta,
 * resume ni asocia por similitud semántica, ordinal o proximidad.
 */

export const NOT_EXPLICIT_MARK = "NOT_EXPLICIT_IN_KNOWLEDGE_MASTER" as const;

/* ------------------------- 1 · definición ------------------------- */

/** Calificadores que declaran una definición como productiva/canónica. */
const PRODUCTIVE_QUALIFIER = /\b(productiva|auditada|can[oó]nica|final|congelada|oficial)\b/i;
/** Calificadores que declaran explícitamente una definición no final. */
const NON_FINAL_QUALIFIER = /\b(inicial|provisional|preliminar|borrador)\b/i;

export interface DefinitionCandidate {
  marker: string;
  markerLine: number;
  text: string;
  sourceLines: [number, number];
  qualifier: "PRODUCTIVE" | "NON_FINAL" | "UNQUALIFIED";
}

export interface CapabilityDefinitionResult {
  status: "EXPLICIT" | "NOT_EXPLICIT" | "REVIEW_REQUIRED";
  text: string | null;
  sourceLines: [number, number] | null;
  marker: string | null;
  rule: string;
  /** Todas las candidatas; las no seleccionadas quedan como provenance histórica. */
  candidates: (DefinitionCandidate & { disposition: "SELECTED" | "NOT_SELECTED" })[];
  why: string;
}

const strip = (l: string) => l.replace(/^#{1,9}\s+/, "").trim();

/**
 * Regla: una línea marcadora que contiene «definición» y termina en «:»,
 * seguida inmediatamente por una línea que empieza literalmente con
 * «<capabilityId> evalúa». Si esa línea termina en «:», la definición continúa
 * en la línea siguiente (literal, unida por salto de línea).
 * Selección: exactamente una candidata PRODUCTIVE distinta ⇒ EXPLICIT;
 * varias PRODUCTIVE distintas ⇒ REVIEW_REQUIRED; ninguna ⇒ NOT_EXPLICIT
 * (las candidatas NON_FINAL/UNQUALIFIED se preservan, no se promueven).
 */
export function extractCapabilityDefinition(
  capabilityId: string,
  rawText: string,
): CapabilityDefinitionResult {
  const lines = rawText.split("\n");
  const rule =
    "MARKER(«definición…:» o heading «definición…») + NEXT_LINE(«<ID> evalúa…»); PRODUCTIVE qualifier required; single distinct productive candidate";
  const candidates: DefinitionCandidate[] = [];
  for (let i = 0; i + 1 < lines.length; i++) {
    const marker = strip(lines[i]!);
    const isHeading = /^#{1,9}\s/.test(lines[i]!.trim());
    if (!/definici[oó]n/i.test(marker) || !(marker.endsWith(":") || isHeading)) continue;
    const first = lines[i + 1]!.trim();
    if (!first.startsWith(`${capabilityId} evalúa`)) continue;
    let end = i + 1;
    const parts = [first];
    if (first.endsWith(":") && i + 2 < lines.length && lines[i + 2]!.trim()) {
      parts.push(lines[i + 2]!.trim());
      end = i + 2;
    }
    candidates.push({
      marker,
      markerLine: i + 1,
      text: parts.join("\n"),
      sourceLines: [i + 2, end + 1],
      qualifier: PRODUCTIVE_QUALIFIER.test(marker)
        ? "PRODUCTIVE"
        : NON_FINAL_QUALIFIER.test(marker)
          ? "NON_FINAL"
          : "UNQUALIFIED",
    });
  }
  const productive = candidates.filter((c) => c.qualifier === "PRODUCTIVE");
  const distinct = [...new Set(productive.map((c) => c.text))];
  const selected = distinct.length === 1 ? productive[0]! : null;
  const out = candidates.map((c) => ({
    ...c,
    disposition: (selected && c === selected ? "SELECTED" : "NOT_SELECTED") as
      "SELECTED" | "NOT_SELECTED",
  }));
  if (selected)
    return {
      status: "EXPLICIT",
      text: selected.text,
      sourceLines: selected.sourceLines,
      marker: selected.marker,
      rule,
      candidates: out,
      why: "única definición con calificador productivo/canónico explícito",
    };
  return {
    status: distinct.length > 1 ? "REVIEW_REQUIRED" : "NOT_EXPLICIT",
    text: null,
    sourceLines: null,
    marker: null,
    rule,
    candidates: out,
    why:
      distinct.length > 1
        ? "varias definiciones productivas distintas sin supersesión explícita"
        : candidates.length
          ? "solo existen definiciones no declaradas productivas/canónicas; se preservan sin promover"
          : "la fuente no contiene una definición marcada de la capacidad",
  };
}

/* ------------------------- 2 · NI → VA ------------------------- */

export type NiMappingStatus =
  | "STRUCTURAL_CONTAINMENT"
  | "UNRESOLVED_NO_EXPLICIT_SOURCE_STRUCTURE"
  | "REVIEW_REQUIRED_CONFLICTING_OCCURRENCES";

export interface LinkedInformationNeed {
  id: string;
  idStatus: "SOURCE_ID" | "DERIVED_LOCATOR";
  statement: string;
  variableRefs: string[];
  acquisitionRefs: string[];
  mappingStatus: NiMappingStatus;
  mappingEvidence: string | null;
  sourceLines: number[];
}

const NI_BLOCK_MARKER =
  /^(NI|Necesidades de Informaci[oó]n|Necesitamos (saber|conocer|comprender))\s*:?\s*$/i;
const NI_DOTTED = /^(NI-[0-9A-Za-z.]+)\s+(\S.*)$/;
const NI_TABLE = /^\|\s*(NI[0-9A-Za-z.-]*\d)\s*\|\s*(.+?)\s*\|\s*$/;

/**
 * Vínculo NI→VA por contención estructural: la NI aparece bajo un heading (o
 * sub-heading de él) cuyo texto nombra exactamente una VA de la baseline.
 * NI fuera de toda sección VA ⇒ UNRESOLVED (no se asocian por ordinal ni
 * similitud). Ocurrencias repetidas con vínculo o texto distinto ⇒ REVIEW.
 */
export function linkInformationNeeds(
  rawText: string,
  vaIds: readonly string[],
): LinkedInformationNeed[] {
  const known = new Set(vaIds);
  const lines = rawText.split("\n");
  const stack: { level: number; va: string | null; text: string }[] = [];
  const found: {
    id: string | null;
    statement: string;
    va: string | null;
    heading: string | null;
    line: number;
  }[] = [];
  let bulletBlock = false;
  const context = () => {
    for (let k = stack.length - 1; k >= 0; k--) if (stack[k]!.va) return stack[k]!;
    return null;
  };
  lines.forEach((raw, idx) => {
    const line = raw.trim();
    const h = /^(#{1,9})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1]!.length;
      while (stack.length && stack[stack.length - 1]!.level >= level) stack.pop();
      const vas = [...new Set(h[2]!.match(/\bVA\d+\b/g) ?? [])];
      const va =
        vas.length === 1 && known.has(vas[0]!) && !/[–-]\s*VA\d/.test(h[2]!) ? vas[0]! : null;
      stack.push({ level, va, text: h[2]! });
      bulletBlock = NI_BLOCK_MARKER.test(h[2]!);
      return;
    }
    const ctx = context();
    const push = (id: string | null, statement: string) =>
      found.push({ id, statement, va: ctx?.va ?? null, heading: ctx?.text ?? null, line: idx + 1 });
    const d = NI_DOTTED.exec(line) ?? NI_TABLE.exec(line);
    if (d) {
      push(d[1]!, d[2]!.trim());
      return;
    }
    if (NI_BLOCK_MARKER.test(line)) {
      bulletBlock = true;
      return;
    }
    if (bulletBlock && /^-\s+\S/.test(line)) {
      // Viñeta sin ID: solo es NI si está bajo una sección VA (contención).
      if (ctx?.va) push(null, line.replace(/^-\s+/, ""));
      return;
    }
    if (line) bulletBlock = false;
  });

  const byKey = new Map<string, typeof found>();
  for (const f of found) {
    const key = f.id ?? `${f.va}·NI@${f.statement}`;
    byKey.set(key, [...(byKey.get(key) ?? []), f]);
  }
  const out: LinkedInformationNeed[] = [];
  for (const [key, occ] of byKey) {
    const first = occ[0]!;
    const vas = [...new Set(occ.map((o) => o.va))];
    const texts = [...new Set(occ.map((o) => o.statement))];
    const conflict = vas.length > 1 || texts.length > 1;
    const va = !conflict ? first.va : null;
    out.push({
      id: first.id ?? `${first.va}#NI@L${first.line}`,
      idStatus: first.id ? "SOURCE_ID" : "DERIVED_LOCATOR",
      statement: first.statement,
      variableRefs: va ? [va] : [],
      acquisitionRefs: [],
      mappingStatus: conflict
        ? "REVIEW_REQUIRED_CONFLICTING_OCCURRENCES"
        : va
          ? "STRUCTURAL_CONTAINMENT"
          : "UNRESOLVED_NO_EXPLICIT_SOURCE_STRUCTURE",
      mappingEvidence: va ? `heading «${first.heading}»` : null,
      sourceLines: occ.map((o) => o.line),
    });
    void key;
  }
  return out;
}
