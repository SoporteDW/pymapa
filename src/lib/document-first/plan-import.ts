/**
 * Document-First · Importación de un plan de mejora (ACTION_PLAN_IMPORT).
 * Lee prioridades "P<n> · Título" y filas "Campo  valor" del texto real.
 * Produce propuestas por campo con página y cita; nunca marca ejecución,
 * validación ni convierte plazos relativos en fechas calendario.
 */

import { normalizar, type LineaPagina } from "./pdf-texto";

export const VERSION_IMPORTADOR_PLAN = "plan-import-1.0.0";

export type CampoPlan =
  | "objetivo" | "actividad" | "responsable" | "plazo" | "indicador" | "evidencia" | "dependencia" | "estadoDocumental";

const ETIQUETAS: [RegExp, CampoPlan][] = [
  [/^objetivo\b/, "objetivo"],
  [/^actividad \d+\b/, "actividad"],
  [/^responsables?\b/, "responsable"],
  [/^plazos?\b/, "plazo"],
  [/^indicador(es)?\b/, "indicador"],
  [/^evidencia( esperada)?\b/, "evidencia"],
  [/^dependencias?\b/, "dependencia"],
  [/^estado documental\b/, "estadoDocumental"],
];

export interface CampoPropuesto {
  campo: CampoPlan;
  etiqueta: string;
  valor: string;
  pagina: number;
  cita: string;
}

export interface PrioridadImportada {
  codigo: string;
  titulo: string;
  pagina: number;
  campos: CampoPropuesto[];
}

export function importarPlan(lineas: LineaPagina[]): PrioridadImportada[] {
  const prioridades: PrioridadImportada[] = [];
  let actual: PrioridadImportada | null = null;
  let ultimo: CampoPropuesto | null = null;
  for (const l of lineas) {
    const cab = l.texto.match(/^(P\d+)\s·\s(.+)$/);
    if (cab) {
      actual = { codigo: cab[1]!, titulo: cab[2]!.trim(), pagina: l.pagina, campos: [] };
      prioridades.push(actual);
      ultimo = null;
      continue;
    }
    if (!actual) continue;
    const t = normalizar(l.texto);
    if (/^campo\b/.test(t)) continue;
    // Sección general posterior: termina la tabla.
    if (/^(gobierno|pruebas|contexto|control)\b/.test(t)) { actual = null; ultimo = null; continue; }
    const hit = ETIQUETAS.find(([re]) => re.test(t));
    if (hit) {
      const m = l.texto.match(/^(Objetivo|Actividad \d+|Responsables?|Plazos?|Indicador(?:es)?|Evidencia(?: esperada)?|Dependencias?|Estado documental)\s+(.*)$/i);
      if (!m) continue;
      ultimo = { campo: hit[1], etiqueta: m[1]!, valor: m[2]!.trim(), pagina: l.pagina, cita: l.texto };
      actual.campos.push(ultimo);
    } else if (ultimo) {
      ultimo.valor = `${ultimo.valor} ${l.texto}`.trim();
      ultimo.cita = `${ultimo.cita} ${l.texto}`;
    }
  }
  return prioridades.filter((p) => p.campos.length > 0);
}

/** Sugerencia de vínculo con una prioridad legacy por solapamiento de palabras (la persona confirma). */
export function sugerirVinculo(titulo: string, objetivo: string, candidatos: { id: string; titulo: string; objetivo: string }[]): string | null {
  const palabras = (s: string) => new Set(normalizar(s).split(/[^a-z0-9]+/).filter((w) => w.length > 4));
  const base = palabras(`${titulo} ${objetivo}`);
  let mejor: { id: string; score: number } | null = null;
  for (const c of candidatos) {
    const otras = palabras(`${c.titulo} ${c.objetivo}`);
    const score = [...base].filter((w) => otras.has(w) || [...otras].some((o) => o.startsWith(w.slice(0, 6)))).length;
    if (score > 0 && (!mejor || score > mejor.score)) mejor = { id: c.id, score };
  }
  return mejor?.id ?? null;
}
