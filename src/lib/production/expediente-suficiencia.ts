/**
 * MVP31 · Suficiencia documental (proyección determinista, versionada).
 *
 * Clasifica por adquisición la PRESENCIA documental literal, nunca la verdad
 * semántica: SUFICIENTE solo indica una cita de coincidencia alta con un dato
 * concreto (cifra, fecha o porcentaje) — sigue requiriendo confirmación humana.
 * Contradicción: misma adquisición con cifras distintas en documentos distintos.
 * Nunca crea respuestas, observaciones, cobertura ni hallazgos.
 */
import type { PropuestaExpediente } from "./expediente-mapper";

export const VERSION_SUFICIENCIA = "mvp31-sufficiency-1.0.0";

export type Suficiencia = "SUFICIENTE" | "PARCIAL" | "AUSENTE";

export interface ClasificacionAdquisicion {
  capabilityId: string;
  acquisitionId: string;
  sufficiency: Suficiencia;
  possibleContradiction: boolean;
  /** Cifras literales distintas encontradas (solo si hay posible contradicción). */
  conflictingValues: string[];
  documents: string[];
}

const CIFRA = /\b\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d+)?\s*%?|\b\d+(?:[.,]\d+)?\s*%?/g;

export function cifrasLiterales(texto: string): string[] {
  return [...new Set((texto.match(CIFRA) ?? []).map((c) => c.replace(/\s+/g, "").trim()).filter((c) => c.length > 0))];
}

export function clasificarSuficiencia(
  adquisiciones: { capabilityId: string; acquisitionId: string }[],
  propuestas: Pick<PropuestaExpediente, "capabilityId" | "acquisitionId" | "match" | "quote" | "evidenceId">[],
): ClasificacionAdquisicion[] {
  const por = new Map<string, typeof propuestas>();
  for (const p of propuestas) {
    const k = `${p.capabilityId}::${p.acquisitionId}`;
    por.set(k, [...(por.get(k) ?? []), p]);
  }
  return adquisiciones.map(({ capabilityId, acquisitionId }) => {
    const lista = por.get(`${capabilityId}::${acquisitionId}`) ?? [];
    const altasConDato = lista.filter((p) => p.match === "ALTA" && cifrasLiterales(p.quote).length > 0);
    const sufficiency: Suficiencia = !lista.length ? "AUSENTE" : altasConDato.length ? "SUFICIENTE" : "PARCIAL";
    // Contradicción: ≥2 documentos distintos cuyas cifras no se solapan.
    const porDoc = new Map<string, Set<string>>();
    for (const p of altasConDato) {
      const s = porDoc.get(p.evidenceId) ?? new Set<string>();
      cifrasLiterales(p.quote).forEach((c) => s.add(c));
      porDoc.set(p.evidenceId, s);
    }
    const conjuntos = [...porDoc.values()];
    let possibleContradiction = false;
    for (let i = 0; i < conjuntos.length && !possibleContradiction; i++)
      for (let j = i + 1; j < conjuntos.length; j++)
        if (![...conjuntos[i]!].some((c) => conjuntos[j]!.has(c))) { possibleContradiction = true; break; }
    return {
      capabilityId,
      acquisitionId,
      sufficiency,
      possibleContradiction,
      conflictingValues: possibleContradiction ? [...new Set(conjuntos.flatMap((s) => [...s]))] : [],
      documents: [...new Set(lista.map((p) => p.evidenceId))],
    };
  });
}

export function resumenSuficiencia(c: ClasificacionAdquisicion[]) {
  return {
    SUFICIENTE: c.filter((x) => x.sufficiency === "SUFICIENTE").length,
    PARCIAL: c.filter((x) => x.sufficiency === "PARCIAL").length,
    AUSENTE: c.filter((x) => x.sufficiency === "AUSENTE").length,
    contradicciones: c.filter((x) => x.possibleContradiction).length,
  };
}
