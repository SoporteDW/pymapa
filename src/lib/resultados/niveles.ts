/**
 * Niveles de madurez y confianza presentables (POC-05, 5.2 y componentes).
 * Datos versionados: la interfaz nunca redefine rangos ni etiquetas.
 */

import type { BandaMadurezResultado, NivelConfianza, NivelMadurez } from "./tipos";

export const bandasMadurezResultado: BandaMadurezResultado[] = [
  {
    nivel: "inicial",
    etiqueta: "Inicial",
    min: 0,
    max: 24.99,
    interpretacion:
      "Capacidades digitales incipientes, aisladas o inexistentes: conviene empezar por los fundamentos.",
  },
  {
    nivel: "basico",
    etiqueta: "Básico",
    min: 25,
    max: 49.99,
    interpretacion:
      "Existen prácticas puntuales, pero sin integración ni gestión sistemática entre áreas.",
  },
  {
    nivel: "en_desarrollo",
    etiqueta: "En desarrollo",
    min: 50,
    max: 74.99,
    interpretacion:
      "La empresa cuenta con capacidades funcionales y oportunidades claras de consolidación.",
  },
  {
    nivel: "avanzado",
    etiqueta: "Avanzado",
    min: 75,
    max: 100,
    interpretacion:
      "La empresa opera con prácticas digitales estructuradas, medibles e integradas.",
  },
];

export function bandaMadurezResultado(puntaje: number): BandaMadurezResultado {
  const acotado = Math.max(0, Math.min(100, puntaje));
  return (
    bandasMadurezResultado.find((b) => acotado >= b.min && acotado <= b.max) ??
    bandasMadurezResultado[0]!
  );
}

export function etiquetaMadurez(nivel: NivelMadurez): string {
  return bandasMadurezResultado.find((b) => b.nivel === nivel)?.etiqueta ?? "Inicial";
}

/** Umbrales de confianza para el ConfidenceBadge (POC-05, 9 y 7.4). */
export const UMBRAL_CONFIANZA_ALTA = 0.8;
export const UMBRAL_CONFIANZA_MEDIA = 0.65;

export function nivelDeConfianza(confianza: number): NivelConfianza {
  if (confianza >= UMBRAL_CONFIANZA_ALTA) return "alta";
  if (confianza >= UMBRAL_CONFIANZA_MEDIA) return "media";
  return "baja";
}

export function etiquetaConfianza(nivel: NivelConfianza): string {
  if (nivel === "alta") return "Confianza alta";
  if (nivel === "media") return "Confianza media";
  return "Confianza baja";
}

/** Cobertura mínima para considerar el resultado completo (POC-05, 10.2). */
export const COBERTURA_RESULTADO_COMPLETO = 80;
