/**
 * PYM-NOV-MVP31 · Expediente documental transversal (Escenario B).
 *
 * Correspondencia DETERMINISTA y léxica entre fragmentos literales de los
 * documentos de una empresa y las adquisiciones publicadas de las 31
 * capacidades. No usa IA ni Gateway. No interpreta ni decide suficiencia:
 * una coincidencia léxica es solo una PROPUESTA que la persona confirma.
 *
 * - El texto de cada adquisición es copia literal del pack (pregunta, enunciado
 *   de necesidad de información o nombre de variable). Nunca se fabrica.
 * - Adquisiciones con opciones cerradas no reciben propuesta textual: la
 *   persona elige la opción (no se infiere un valor).
 * - Puro y sin dependencias de servidor: verificable en pruebas.
 */
export const VERSION_MAPEADOR_EXPEDIENTE = "mvp31-lexical-1.1.0";

export type ModoAdquisicion = "QUESTION" | "CAPABILITY_PROGRESSIVE" | "INFORMATION_NEED" | "GOVERNED_STRUCTURAL_CORRESPONDENCE";

export interface AdquisicionCatalogo {
  capabilityId: string;
  acquisitionId: string;
  mode: string;
  /** Texto visible literal del pack. */
  label: string;
  /** Fuente del texto visible. */
  labelSource: "QUESTION" | "INFORMATION_NEED" | "VARIABLE";
  /** Si la respuesta exige elegir entre opciones cerradas del pack. */
  closedOptions: boolean;
  /** Texto literal usado para la comparación léxica. */
  matchText: string;
}

export interface FragmentoExpediente {
  evidenceId: string;
  documentTitle: string;
  fragmentId: string;
  page: number;
  section: string | null;
  text: string;
}

export type Coincidencia = "ALTA" | "PARCIAL";

export interface PropuestaExpediente {
  capabilityId: string;
  acquisitionId: string;
  label: string;
  evidenceId: string;
  documentTitle: string;
  fragmentId: string;
  page: number;
  section: string | null;
  quote: string;
  matchedTerms: string[];
  /** Términos distintivos coincidentes / términos distintivos de la adquisición. */
  lexicalRatio: number;
  match: Coincidencia;
}

type PackLike = {
  capability?: { id?: string };
  acquisitions?: {
    id: string;
    acquisitionMode?: string;
    question?: unknown;
    informationNeedRef?: string;
    variableRefs?: string[];
    responseModel?: { optionSet?: unknown };
    options?: unknown;
  }[];
  informationNeeds?: { id: string; statement?: string }[];
  variables?: { id: string; name?: string }[];
};

const GENERICOS = /^resultan\s+\d+\s+ni/i;

/** Catálogo literal de adquisiciones de un pack publicado. */
export function catalogoDePack(capabilityId: string, pack: unknown): AdquisicionCatalogo[] {
  const p = pack as PackLike;
  const nis = new Map((p.informationNeeds ?? []).map((n) => [n.id, n.statement ?? ""]));
  const vars = new Map((p.variables ?? []).map((v) => [v.id, v.name ?? ""]));
  return (p.acquisitions ?? []).map((a) => {
    const question = typeof a.question === "string" ? a.question : null;
    const ni = a.informationNeedRef ? nis.get(a.informationNeedRef) ?? null : null;
    const refs = a.variableRefs ?? [];
    const nombres = refs.map((r) => vars.get(r) ?? "").filter(Boolean);
    const niUtil = ni && !GENERICOS.test(ni) ? ni : null;
    const label = question ?? niUtil ?? (nombres.length ? nombres.join(" · ") : a.id);
    const labelSource: AdquisicionCatalogo["labelSource"] = question ? "QUESTION" : niUtil ? "INFORMATION_NEED" : "VARIABLE";
    // Variables solo enriquecen la comparación cuando son pocas y específicas.
    const extra = refs.length <= 3 ? nombres.join(" ") : "";
    const optionSet = a.responseModel?.optionSet;
    return {
      capabilityId,
      acquisitionId: a.id,
      mode: a.acquisitionMode ?? "QUESTION",
      label,
      labelSource,
      closedOptions: Array.isArray(optionSet) && optionSet.length > 0,
      matchText: [question ?? "", niUtil ?? "", extra].join(" "),
    };
  });
}

const STOP = new Set(
  "para como cual cuales cuando donde desde entre esta este estos estas esos esas sobre tiene tienen tenemos puede pueden porque mismo misma todos todas otros otras cada hasta segun sean sera sido siendo hacer hace hacen realmente actual actuales nivel forma manera parte caso casos tipo tipos medida modo general relevante relevantes principal principales informacion necesidad".split(" "),
);

export function normalizarTexto(t: string): string {
  return t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Raíces léxicas (6 caracteres) de palabras significativas. */
export function raices(texto: string): Set<string> {
  const out = new Set<string>();
  for (const w of normalizarTexto(texto).split(/[^a-zñ]+/)) {
    if (w.length < 5 || STOP.has(w)) continue;
    out.add(w.slice(0, 6));
  }
  return out;
}

export interface OpcionesMapeo {
  /** Raíces presentes en más de esta fracción de adquisiciones se descartan por genéricas. */
  maxDocumentFrequency?: number;
  minMatched?: number;
}

/**
 * Propone, para cada adquisición abierta y no respondida, el fragmento con
 * mayor coincidencia léxica distintiva. Sin coincidencia suficiente no hay
 * propuesta (la adquisición queda pendiente; nunca se rellena).
 */
export function proponerCorrespondencias(
  catalogo: readonly AdquisicionCatalogo[],
  fragmentos: readonly FragmentoExpediente[],
  respondidas: ReadonlySet<string>,
  opciones: OpcionesMapeo = {},
): PropuestaExpediente[] {
  const maxDf = opciones.maxDocumentFrequency ?? 0.06;
  const minMatched = opciones.minMatched ?? 2;
  const clave = (a: AdquisicionCatalogo) => `${a.capabilityId}::${a.acquisitionId}`;
  const raicesAdq = catalogo.map((a) => raices(a.matchText));
  const df = new Map<string, number>();
  for (const r of raicesAdq) for (const t of r) df.set(t, (df.get(t) ?? 0) + 1);
  const limite = Math.max(2, Math.floor(catalogo.length * maxDf));
  const distintivas = raicesAdq.map((r) => new Set([...r].filter((t) => (df.get(t) ?? 0) <= limite)));
  const raicesFrag = fragmentos.map((f) => raices(f.text));

  const propuestas: PropuestaExpediente[] = [];
  catalogo.forEach((a, i) => {
    if (a.closedOptions || respondidas.has(clave(a))) return;
    const K = distintivas[i];
    if (!K) return;
    if (K.size < minMatched) return;
    let mejor: { j: number; terms: string[]; ratio: number } | null = null;
    fragmentos.forEach((f, j) => {
      if (f.text.length < 30) return;
      const roots = raicesFrag[j];
      if (!roots) return;
      const terms = [...K].filter((t) => roots.has(t));
      if (terms.length < minMatched) return;
      const ratio = terms.length / K.size;
      const anterior = mejor ? fragmentos[mejor.j] : null;
      const identidad = (x: FragmentoExpediente) => `${x.evidenceId}:${String(x.page).padStart(4, "0")}:${x.fragmentId}`;
      if (!mejor || terms.length > mejor.terms.length || (terms.length === mejor.terms.length && (ratio > mejor.ratio
        || (ratio === mejor.ratio && anterior && (f.text.length < anterior.text.length
          || (f.text.length === anterior.text.length && identidad(f) < identidad(anterior))))))) {
        mejor = { j, terms, ratio };
      }
    });
    if (!mejor) return;
    const m = mejor as { j: number; terms: string[]; ratio: number };
    if (m.ratio < 0.2) return;
    const f = fragmentos[m.j];
    if (!f) return;
    propuestas.push({
      capabilityId: a.capabilityId,
      acquisitionId: a.acquisitionId,
      label: a.label,
      evidenceId: f.evidenceId,
      documentTitle: f.documentTitle,
      fragmentId: f.fragmentId,
      page: f.page,
      section: f.section,
      quote: f.text,
      matchedTerms: m.terms.sort(),
      lexicalRatio: Math.round(m.ratio * 100) / 100,
      match: m.terms.length >= 3 && m.ratio >= 0.4 ? "ALTA" : "PARCIAL",
    });
  });
  return propuestas;
}
