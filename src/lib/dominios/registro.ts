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
    nombre: "Checklist especializado CRO/UX e-commerce",
    version: "pendiente-de-carga",
    nivel: 2,
    estado: "pendiente",
    dominios: ["D02", "D03"],
    // Estructura real informada por el equipo metodológico. El contenido de las
    // verificaciones se cargará en B6; aquí solo se reserva la forma del dato.
    grupos: [
      { id: "general", nombre: "General", verificacionesEsperadas: 45 },
      { id: "home", nombre: "Home", verificacionesEsperadas: 21 },
      { id: "categoria", nombre: "Categoría", verificacionesEsperadas: 29 },
      { id: "producto", nombre: "Producto", verificacionesEsperadas: 69 },
      { id: "landing", nombre: "Landing", verificacionesEsperadas: 69 },
      { id: "carrito", nombre: "Carrito", verificacionesEsperadas: 25 },
      { id: "checkout", nombre: "Checkout", verificacionesEsperadas: 38 },
      { id: "thank-you", nombre: "Thank You", verificacionesEsperadas: 8 },
    ],
    fuente: "Activo metodológico externo (entrega prevista para B6)",
    capa: "conocimiento",
  },
];

/** Total de verificaciones declaradas por un instrumento registrado. */
export function verificacionesEsperadas(instrumentoId: string): number {
  const instrumento = instrumentos.find((i) => i.id === instrumentoId);
  if (!instrumento) return 0;
  return instrumento.grupos.reduce((suma, g) => suma + (g.verificacionesEsperadas ?? 0), 0);
}
