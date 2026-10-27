import type { EngineObservation } from "@pymapa/knowledge-engine";

/**
 * DEC-049 · DG01-VERTICAL-02 · Intérprete semántico EXPERIMENTAL.
 * Mecanismo: análisis léxico determinista con un catálogo de indicios creado
 * para este piloto (no aprobado). No usa IA ni servicios externos, no puntúa,
 * no fija umbrales y nunca confirma hallazgos. Solo lee observaciones; jamás
 * modifica el resultado del Engine.
 */

type Elemento = "PROPUESTA_DE_VALOR" | "CLIENTE" | "INGRESO" | "ENTREGA" | "ORIENTACION_TRANSFORMACION";

/** CRIT-PILOTO-01: elementos de lógica de creación de valor (experimental). */
const ELEMENTOS: { elemento: Elemento; re: RegExp }[] = [
  { elemento: "PROPUESTA_DE_VALOR", re: /\bcreamos valor\b|\bofrecemos\b|\bvendemos\b|\bcalibra(?:mos|ndo)\b|\bfabricamos\b|\bprestamos\b/i },
  { elemento: "CLIENTE", re: /\bclientes?\b|\btalleres?\b|\bcompradores?\b/i },
  { elemento: "INGRESO", re: /\bpagan\b|\bcobramos\b|\bingresos?\b|\bnos pagan\b/i },
  { elemento: "ENTREGA", re: /\bejecutan\b|\btécnicos\b|\bentregamos\b|\bproducimos\b/i },
  { elemento: "ORIENTACION_TRANSFORMACION", re: /\btransformación\b|\bdigitaliza\w*/i },
];
/** CRIT-PILOTO-02: declaración explícita de no comprender el negocio (experimental). */
const COMPATIBLE = /\bno (?:tenemos|tengo|está) clar[oa]\b|\bno sabemos\b|\bsin poder explicar\b|\bno podemos explicar\b|\bdesconocemos\b/i;
/** CRIT-PILOTO-03: vaguedad o condicionalidad (experimental). */
const AMBIGUO = /\bdepende\b|\bquizás?\b|\btal vez\b|\bmás o menos\b|\bvarias cosas\b|\bde todo un poco\b|\bcreo que\b/i;

export type Relacion = "COMPATIBLE" | "CONTRADICE" | "INSUFICIENTE";
export interface Fragmento { observationId: string; texto: string; inicio: number; fin: number }
export interface Afirmacion {
  id: string;
  fragmento: Fragmento;
  elementos: Elemento[];
  relacion: Relacion;
  criterio: string;
  explicacion: string;
}
export type Postura =
  | "EVIDENCIA_COMPATIBLE" | "EVIDENCIA_CONTRARIA" | "EVIDENCIA_MIXTA" | "INFORMACION_INSUFICIENTE"
  | "CONFLICTO_PRESERVADO" | "ABSTENCION_SIN_CONTENIDO" | "EXCLUSION_TECNICA_CONSERVADA";

export interface InterpretacionExperimental {
  mecanismo: "LEXICO_DETERMINISTA_EXPERIMENTAL";
  usaIA: false;
  ruleRef: "R-DG01-01";
  variableRef: "VA01";
  condicion: "BUSINESS_LOGIC_UNCLEAR";
  postura: Postura;
  resumen: string;
  afirmaciones: Afirmacion[];
  compatibles: string[];
  contrarias: string[];
  insuficientes: string[];
  pendiente: string[];
  estadoRevision: "PENDING_SEMANTIC_GOVERNANCE";
  hallazgoConfirmado: false;
}

function fragmentar(obs: EngineObservation): Fragmento[] {
  const texto = typeof obs.semanticValue === "string" ? obs.semanticValue : "";
  const out: Fragmento[] = [];
  const re = /[^.:]+[.:]?/g;
  for (const m of texto.matchAll(re)) {
    const raw = m[0];
    if (raw.trimEnd().endsWith(":")) continue; // etiqueta («Empresa sintética:»), no afirmación
    const lead = raw.length - raw.trimStart().length;
    const t = raw.trim().replace(/[.:]$/, "").trim();
    if (!t) continue;
    const inicio = (m.index ?? 0) + lead;
    out.push({ observationId: obs.id, texto: t, inicio, fin: inicio + t.length });
  }
  return out;
}

function clasificar(f: Fragmento, n: number): Afirmacion {
  const elementos = ELEMENTOS.filter((e) => e.re.test(f.texto)).map((e) => e.elemento);
  const base = { id: `AF-${n}`, fragmento: f, elementos };
  if (COMPATIBLE.test(f.texto)) return { ...base, relacion: "COMPATIBLE", criterio: "CRIT-PILOTO-02", explicacion: "La empresa declara no poder explicar cómo funciona o crea valor el negocio; es compatible con la condición, no la demuestra." };
  if (AMBIGUO.test(f.texto)) return { ...base, relacion: "INSUFICIENTE", criterio: "CRIT-PILOTO-03", explicacion: "Formulación condicional o vaga; no permite saber cómo se crea valor." };
  const sustantivos = elementos.filter((e) => e !== "ORIENTACION_TRANSFORMACION");
  if (sustantivos.length > 0) return { ...base, relacion: "CONTRADICE", criterio: "CRIT-PILOTO-01", explicacion: `Describe ${sustantivos.join(", ")} de forma concreta; contradice la hipótesis de falta de comprensión, sin demostrar suficiencia.` };
  return { ...base, relacion: "INSUFICIENTE", criterio: "CRIT-PILOTO-04", explicacion: "No describe elementos de la lógica de creación de valor." };
}

const PENDIENTE_COMUN = [
  "Aprobación gobernada de los criterios experimentales CRIT-PILOTO-01..05.",
  "Decisión semántica humana sobre R-DG01-01; ningún hallazgo queda confirmado.",
  "Vinculación HF-DG01-01 ↔ BUSINESS_LOGIC_UNCLEAR sin aprobar.",
  "Evidencia mínima VA01 no explícita en el Knowledge Master; E0 no aprobado.",
];

export function interpretarObservaciones(observations: readonly EngineObservation[]): InterpretacionExperimental {
  const base = { mecanismo: "LEXICO_DETERMINISTA_EXPERIMENTAL" as const, usaIA: false as const, ruleRef: "R-DG01-01" as const, variableRef: "VA01" as const, condicion: "BUSINESS_LOGIC_UNCLEAR" as const, estadoRevision: "PENDING_SEMANTIC_GOVERNANCE" as const, hallazgoConfirmado: false as const };
  const estados = new Set(observations.map((o) => o.knowledgeState));
  if (estados.has("NOT_APPLICABLE")) {
    return { ...base, postura: "EXCLUSION_TECNICA_CONSERVADA", resumen: "Exclusión técnica por no aplicabilidad conservada; no se interpreta como conclusión diagnóstica ni valida la justificación.", afirmaciones: [], compatibles: [], contrarias: [], insuficientes: [], pendiente: ["Revisión humana de la legitimidad de la no aplicabilidad.", ...PENDIENTE_COMUN] };
  }
  const conocidas = observations.filter((o) => o.knowledgeState === "KNOWN" && typeof o.semanticValue === "string" && o.semanticValue.trim());
  if (conocidas.length === 0) {
    return { ...base, postura: "ABSTENCION_SIN_CONTENIDO", resumen: "No hay contenido declarado; el intérprete se abstiene y no completa información.", afirmaciones: [], compatibles: [], contrarias: [], insuficientes: [], pendiente: ["Obtener la información de VA01.", ...PENDIENTE_COMUN] };
  }
  let n = 0;
  const afirmaciones = conocidas.flatMap((o) => fragmentar(o).map((f) => clasificar(f, ++n)));
  const ids = (r: Relacion) => afirmaciones.filter((a) => a.relacion === r).map((a) => a.id);
  const [compatibles, contrarias, insuficientes] = [ids("COMPATIBLE"), ids("CONTRADICE"), ids("INSUFICIENTE")];
  if (estados.has("CONTRADICTORY")) {
    return { ...base, postura: "CONFLICTO_PRESERVADO", resumen: "Las fuentes se contradicen; se conservan ambas sin elegir una. Se requiere aclaración antes de interpretar.", afirmaciones, compatibles, contrarias, insuficientes, pendiente: ["Aclaración del conflicto entre fuentes (CRIT-PILOTO-05: no se escoge fuente).", ...PENDIENTE_COMUN] };
  }
  const postura: Postura = compatibles.length && contrarias.length ? "EVIDENCIA_MIXTA"
    : compatibles.length ? "EVIDENCIA_COMPATIBLE"
    : contrarias.length && insuficientes.length ? "EVIDENCIA_MIXTA"
    : contrarias.length ? "EVIDENCIA_CONTRARIA" : "INFORMACION_INSUFICIENTE";
  const resumenes: Record<string, string> = {
    EVIDENCIA_COMPATIBLE: "El texto contiene evidencia compatible con BUSINESS_LOGIC_UNCLEAR. Compatible no es confirmado.",
    EVIDENCIA_CONTRARIA: "El texto describe la lógica de creación de valor; contradice la hipótesis. Esto no demuestra un estado positivo suficiente.",
    EVIDENCIA_MIXTA: "El texto combina elementos claros con elementos insuficientes o compatibles; se conservan todos.",
    INFORMACION_INSUFICIENTE: "El texto es parcial o ambiguo; no permite relacionarlo con la condición sin forzar una conclusión.",
  };
  return { ...base, postura, resumen: resumenes[postura] ?? "", afirmaciones, compatibles, contrarias, insuficientes, pendiente: PENDIENTE_COMUN };
}
