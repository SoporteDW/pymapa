/**
 * DEC-054 · Preguntas operativas para adquisiciones sin pregunta literal.
 *
 * Reglas:
 * - Derivadas exclusivamente del texto aprobado del pack (statement de la
 *   necesidad de información o nombre canónico de la variable). Nunca añaden
 *   criterios, opciones, umbrales ni reglas diagnósticas.
 * - Determinista y versionada: capabilityId → acquisitionRef → questionId →
 *   wordingVersion. Cambiar la redacción exige una versión nueva.
 * - La pregunta literal del pack, cuando existe, siempre prevalece.
 * - La profundización es una guía de datos concretos útiles, no un requisito
 *   universal ni condición de suficiencia.
 */
export const OPERATIVE_WORDING_VERSION = "DEC-054/1.0.0" as const;

export interface OperativeQuestion {
  questionId: string;
  wordingVersion: typeof OPERATIVE_WORDING_VERSION;
  text: string;
  depthPrompt: string;
  source: "INFORMATION_NEED_STATEMENT" | "VARIABLE_NAME";
  sourceRef: string;
  /** Texto aprobado del que se deriva, literal. */
  sourceText: string;
}

export const DEPTH_PROMPT =
  "Si existe, indique datos concretos: línea base, meta, plazo, indicador, responsable, resultados o el documento que lo respalda. Si no se sabe, marque «No se sabe».";

const INTERROGATIVOS = /^(qu[eé]|cu[aá]l(es)?|c[oó]mo|cu[aá]nt[oa]s?|d[oó]nde|cu[aá]ndo|qui[eé]n(es)?|por qu[eé]|para qu[eé])\b/i;

const ACENTOS: Record<string, string> = {
  que: "qué", cual: "cuál", cuales: "cuáles", como: "cómo", cuanto: "cuánto", cuanta: "cuánta",
  cuantos: "cuántos", cuantas: "cuántas", donde: "dónde", cuando: "cuándo", quien: "quién",
  quienes: "quiénes", "por que": "por qué", "para que": "para qué",
};

function limpiar(t: string): string {
  return t.trim().replace(/\s+/g, " ").replace(/[.;:]+$/, "");
}

/** Convierte un enunciado aprobado en pregunta sin alterar su contenido. */
export function formularDesdeEnunciado(statement: string): string {
  const s = limpiar(statement);
  if (s.startsWith("¿")) return s.endsWith("?") ? s : `${s}?`;
  const m = s.match(INTERROGATIVOS);
  if (m) {
    const acentuada = ACENTOS[m[0].toLowerCase()] ?? m[0].toLowerCase();
    const primera = acentuada.charAt(0).toUpperCase() + acentuada.slice(1);
    return `¿${primera}${s.slice(m[0].length)}?`;
  }
  return `¿Qué información tiene hoy la empresa sobre: ${s.charAt(0).toLowerCase()}${s.slice(1)}?`;
}

export function formularDesdeVariable(name: string): string {
  const s = limpiar(name);
  return `¿Cómo se encuentra hoy en la empresa: ${s.charAt(0).toLowerCase()}${s.slice(1)}?`;
}

export function operativeQuestionFor(params: {
  capabilityId: string;
  acquisitionId: string;
  hasLiteralQuestion: boolean;
  informationNeedRef: string | null;
  informationNeedStatement: string | null;
  variable: { ref: string; name: string | null } | null;
}): OperativeQuestion | null {
  if (params.hasLiteralQuestion) return null;
  const questionId = `OQ·${params.capabilityId}·${params.acquisitionId}`;
  if (params.informationNeedStatement && params.informationNeedRef) {
    return {
      questionId,
      wordingVersion: OPERATIVE_WORDING_VERSION,
      text: formularDesdeEnunciado(params.informationNeedStatement),
      depthPrompt: DEPTH_PROMPT,
      source: "INFORMATION_NEED_STATEMENT",
      sourceRef: params.informationNeedRef,
      sourceText: params.informationNeedStatement,
    };
  }
  if (params.variable?.name) {
    return {
      questionId,
      wordingVersion: OPERATIVE_WORDING_VERSION,
      text: formularDesdeVariable(params.variable.name),
      depthPrompt: DEPTH_PROMPT,
      source: "VARIABLE_NAME",
      sourceRef: params.variable.ref,
      sourceText: params.variable.name,
    };
  }
  return null;
}
