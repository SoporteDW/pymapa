/**
 * MVP31 · Suficiencia documental (proyección determinista, versionada).
 *
 * Regla corregida (2.0.0): SUFICIENTE solo cuando una persona confirmó que la
 * cita responde la necesidad de información aprobada de esa adquisición y no
 * existe contradicción sin resolver. Ninguna señal automática (coincidencia
 * léxica, cifra, fecha o porcentaje) produce SUFICIENTE: la proyección no puede
 * verificar que la evidencia responde la necesidad ni su contexto requerido.
 * - Mención pertinente sin confirmación → PARCIAL (se solicita lo que falta,
 *   según el enunciado aprobado; no se añaden umbrales ni criterios).
 * - Cifras distintas en documentos distintos → CONTRADICTORIA: nunca resuelta.
 * - Sin evidencia pertinente → AUSENTE (aunque exista confirmación: sin cita
 *   documental no hay suficiencia documental).
 * Nunca crea respuestas, observaciones, cobertura ni hallazgos.
 */
import type { PropuestaExpediente } from "./expediente-mapper";

export const VERSION_SUFICIENCIA = "mvp31-sufficiency-2.0.0";

export type Suficiencia = "SUFICIENTE" | "PARCIAL" | "AUSENTE" | "CONTRADICTORIA";

export interface ClasificacionAdquisicion {
  capabilityId: string;
  acquisitionId: string;
  sufficiency: Suficiencia;
  possibleContradiction: boolean;
  conflictingValues: string[];
  documents: string[];
  /** Qué falta, expresado solo con el enunciado aprobado (nunca criterio nuevo). */
  missing: string | null;
}

const CIFRA = /\b\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d+)?\s*%?|\b\d+(?:[.,]\d+)?\s*%?/g;

export function cifrasLiterales(texto: string): string[] {
  return [...new Set((texto.match(CIFRA) ?? []).map((c) => c.replace(/\s+/g, "").trim()).filter((c) => c.length > 0))];
}

export interface AdquisicionRef {
  capabilityId: string;
  acquisitionId: string;
  /** Enunciado aprobado de la necesidad de información (pack), si existe. */
  informationNeed?: string | null;
}

export function clasificarSuficiencia(
  adquisiciones: AdquisicionRef[],
  propuestas: Pick<PropuestaExpediente, "capabilityId" | "acquisitionId" | "match" | "quote" | "evidenceId">[],
  /** Claves `cap::acq` cuya cita fue confirmada por una persona como respuesta. */
  confirmadasPorPersona: ReadonlySet<string> = new Set(),
): ClasificacionAdquisicion[] {
  const por = new Map<string, typeof propuestas>();
  for (const p of propuestas) {
    const k = `${p.capabilityId}::${p.acquisitionId}`;
    por.set(k, [...(por.get(k) ?? []), p]);
  }
  return adquisiciones.map(({ capabilityId, acquisitionId, informationNeed }) => {
    const k = `${capabilityId}::${acquisitionId}`;
    const lista = por.get(k) ?? [];
    const porDoc = new Map<string, Set<string>>();
    for (const p of lista) {
      const cifras = cifrasLiterales(p.quote);
      if (!cifras.length) continue;
      const s = porDoc.get(p.evidenceId) ?? new Set<string>();
      cifras.forEach((c) => s.add(c));
      porDoc.set(p.evidenceId, s);
    }
    const conjuntos = [...porDoc.values()];
    let possibleContradiction = false;
    for (let i = 0; i < conjuntos.length && !possibleContradiction; i++)
      for (let j = i + 1; j < conjuntos.length; j++)
        if (![...conjuntos[i]!].some((c) => conjuntos[j]!.has(c))) { possibleContradiction = true; break; }

    const confirmada = confirmadasPorPersona.has(k);
    const sufficiency: Suficiencia = possibleContradiction
      ? "CONTRADICTORIA"
      : confirmada && lista.length
        ? "SUFICIENTE"
        : lista.length
          ? "PARCIAL"
          : "AUSENTE";
    const need = informationNeed?.trim() || null;
    const missing =
      sufficiency === "SUFICIENTE"
        ? null
        : sufficiency === "CONTRADICTORIA"
          ? "Los documentos muestran valores distintos; indica cuál es vigente y por qué."
          : need
            ? `Falta confirmar con el contexto requerido: ${need}`
            : "Falta evidencia que responda la necesidad de información aprobada.";
    return {
      capabilityId,
      acquisitionId,
      sufficiency,
      possibleContradiction,
      conflictingValues: possibleContradiction ? [...new Set(conjuntos.flatMap((s) => [...s]))] : [],
      documents: [...new Set(lista.map((p) => p.evidenceId))],
      missing,
    };
  });
}

export function resumenSuficiencia(c: ClasificacionAdquisicion[]) {
  return {
    SUFICIENTE: c.filter((x) => x.sufficiency === "SUFICIENTE").length,
    PARCIAL: c.filter((x) => x.sufficiency === "PARCIAL").length,
    AUSENTE: c.filter((x) => x.sufficiency === "AUSENTE").length,
    contradicciones: c.filter((x) => x.sufficiency === "CONTRADICTORIA").length,
  };
}
