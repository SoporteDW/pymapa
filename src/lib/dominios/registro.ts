/**
 * B1 · Registro de dominios e instrumentos.
 *
 * Los seis dominios provienen de la definición vigente del diagnóstico general
 * (POC-03): aquí no se redefinen ni se duplican, únicamente se exponen bajo el
 * contrato `DominioPymapa` para que el resto de la arquitectura (suficiencia,
 * evidencias, instrumentos) hable de "dominios" sin depender del módulo de
 * cálculo.
 */

import { dimensiones, preguntasDeDimension } from "@/lib/diagnostico/definicion";
import { knowledgePackEcommerce } from "@/lib/kb/ecommerce";
import { CHECKLIST_CRO_VERSION, checklistCroUx } from "@/lib/kb/ecommerce/checklist";
import type { DominioPymapa, InstrumentoDefinicion } from "./tipos";

export const dominios: DominioPymapa[] = dimensiones.map((d) => ({
  id: d.id,
  nombre: d.nombre,
  proposito: d.proposito,
  peso: d.peso,
}));

export function obtenerDominio(id: string): DominioPymapa | undefined {
  return dominios.find((d) => d.id === id);
}

export function nombreDominio(id: string): string {
  return obtenerDominio(id)?.nombre ?? id;
}

/** Preguntas puntuables de un dominio (fuente única: la definición vigente). */
export function preguntasPuntuablesDeDominio(dominioId: string): string[] {
  return preguntasDeDimension(dominioId)
    .filter((p) => p.puntuable)
    .map((p) => p.id);
}

/**
 * Instrumentos registrados. El checklist especializado de e-commerce
 * (304 verificaciones CRO/UX) queda declarado como `pendiente` con su
 * estructura real de grupos: el contenido metodológico se incorporará en
 * B6 sin modificar este registro ni la interfaz.
 */
export const instrumentos: InstrumentoDefinicion[] = [
  {
    id: "INS-GEN-28",
    nombre: "Diagnóstico general de madurez digital",
    version: "1.0.0",
    nivel: 1,
    estado: "activo",
    dominios: dominios.map((d) => d.id),
    grupos: dominios.map((d) => ({
      id: d.id,
      nombre: d.nombre,
      verificacionesEsperadas: preguntasPuntuablesDeDominio(d.id).length,
    })),
    fuente: "Instrumento propio Pymapa (POC-03)",
    capa: "conocimiento",
  },
  {
    id: "INS-EC-KB",
    nombre: knowledgePackEcommerce.nombre,
    version: knowledgePackEcommerce.version,
    nivel: 2,
    estado: "experimental",
    dominios: ["D02", "D03", "D04"],
    grupos: knowledgePackEcommerce.dominios.map((d) => ({
      id: d.id,
      nombre: d.etiqueta,
      verificacionesEsperadas: knowledgePackEcommerce.preguntas.filter((p) => p.dominio === d.id)
        .length,
    })),
    fuente: `Knowledge Pack ${knowledgePackEcommerce.id} ${knowledgePackEcommerce.version}`,
    capa: "conocimiento",
  },
  {
    id: "INS-EC-CHECKLIST-304",
    nombre: checklistCroUx.nombre,
    version: CHECKLIST_CRO_VERSION,
    nivel: 2,
    estado: "experimental",
    dominios: ["D02", "D03", "D04"],
    // B6 · Contenido metodológico ya incorporado (304 verificaciones).
    // Se usa para profundización SELECTIVA, no como formulario del usuario.
    grupos: checklistCroUx.grupos.map((g) => ({
      id: g.id,
      nombre: g.nombre,
      verificacionesEsperadas: g.verificaciones.length,
    })),
    fuente: checklistCroUx.fuente,
    capa: "conocimiento",
  },
];

/** Total de verificaciones declaradas por un instrumento registrado. */
export function verificacionesEsperadas(instrumentoId: string): number {
  const instrumento = instrumentos.find((i) => i.id === instrumentoId);
  if (!instrumento) return 0;
  return instrumento.grupos.reduce((suma, g) => suma + (g.verificacionesEsperadas ?? 0), 0);
}
