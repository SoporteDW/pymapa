/**
 * MVP-BETA-INT-01 · Ingesta documental determinista · SYNTHETIC_QA_ONLY.
 *
 * Reglas explícitas, versionadas y limitadas al piloto sintético. Detectan
 * una SECCIÓN titulada del documento (coincidencia léxica del encabezado) y
 * proponen una correspondencia CANDIDATE con su texto literal y página.
 *
 * - Una coincidencia léxica NO es interpretación semántica: la propuesta
 *   solo existe para que una persona OWNER/ADMIN la revise.
 * - Exige la marca literal SYNTHETIC_QA_ONLY dentro del documento; además el
 *   servidor exige autorización de la organización en base de datos.
 * - Sin IA, sin red, sin cambios de conocimiento. Los destinos son
 *   identificadores publicados del pack y el servidor los verifica contra el
 *   Engine antes de persistir.
 */
import { normalizar, type LineaPagina } from "@/lib/document-first/pdf-texto";

export const SYNTHETIC_QA_MARKER = "SYNTHETIC_QA_ONLY";
export const SYNTHETIC_QA_RULE_SET_VERSION = "SYNTHETIC-QA-RULES-1.0.0";

export interface ReglaSintetica {
  ruleId: string;
  capabilityId: string;
  /** Encabezado de sección normalizado esperado (sin número de orden). */
  heading: string;
  targetType: "VARIABLE";
  targetRef: string;
  /** Adquisición publicada que alimenta la variable (correspondencia factual). */
  factualCorrespondenceRef: string;
}

/** Destinos verificados contra DG-01 v1.0.0 y OP-01 v1.0.0 publicados. */
export const REGLAS_SINTETICAS: readonly ReglaSintetica[] = [
  { ruleId: "SQA-DG01-VA04-1", capabilityId: "DG-01", heading: "horizonte, ambicion y cambios esperados",
    targetType: "VARIABLE", targetRef: "VA04", factualCorrespondenceRef: "ACQ·NI04" },
  { ruleId: "SQA-OP01-VA07-1", capabilityId: "OP-01", heading: "dependencia de conocimiento individual",
    targetType: "VARIABLE", targetRef: "VA07", factualCorrespondenceRef: "OP01-P11" },
];

/** Encabezado de sección: «NN · Título». */
const RE_ENCABEZADO = /^(\d{2})\s·\s(.+)$/;

export interface PropuestaSintetica {
  rule: ReglaSintetica;
  page: number;
  section: string;
  /** Texto literal: líneas consecutivas de la sección unidas por un espacio. */
  verbatim: string;
}

export class IngestaSinteticaError extends Error {
  constructor(public readonly codigo: "SYNTHETIC_MARKER_MISSING" | "NO_RULE_MATCH") {
    super(codigo);
  }
}

export function tieneMarcaSintetica(lineas: readonly LineaPagina[]): boolean {
  return lineas.some((l) => l.texto.includes(SYNTHETIC_QA_MARKER));
}

/**
 * Aplica las reglas de una capacidad. Una sección termina en el siguiente
 * encabezado o al cambiar de página (la cita nunca cruza páginas).
 */
export function proponerCorrespondenciasSinteticas(
  lineas: readonly LineaPagina[],
  capabilityId: string,
): PropuestaSintetica[] {
  if (!tieneMarcaSintetica(lineas)) throw new IngestaSinteticaError("SYNTHETIC_MARKER_MISSING");
  const reglas = REGLAS_SINTETICAS.filter((r) => r.capabilityId === capabilityId);
  const propuestas: PropuestaSintetica[] = [];
  for (let i = 0; i < lineas.length; i++) {
    const m = lineas[i]!.texto.match(RE_ENCABEZADO);
    if (!m) continue;
    const regla = reglas.find((r) => normalizar(m[2]!) === r.heading);
    if (!regla) continue;
    const pagina = lineas[i]!.pagina;
    const cuerpo: string[] = [];
    for (let j = i + 1; j < lineas.length; j++) {
      const l = lineas[j]!;
      if (l.pagina !== pagina || RE_ENCABEZADO.test(l.texto) || l.texto.includes(SYNTHETIC_QA_MARKER)) break;
      cuerpo.push(l.texto);
    }
    const verbatim = cuerpo.join(" ").trim();
    if (verbatim.length > 0) propuestas.push({ rule: regla, page: pagina, section: lineas[i]!.texto, verbatim });
  }
  return propuestas;
}

/** La cita es literal si aparece tal cual en el texto de su página. */
export function citaEsLiteral(textoPagina: string | undefined, verbatim: string): boolean {
  return Boolean(textoPagina && verbatim && textoPagina.includes(verbatim));
}
