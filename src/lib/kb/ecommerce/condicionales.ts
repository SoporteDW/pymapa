/**
 * Lógica condicional mínima del Knowledge Pack E-commerce v0.1 (sección 8).
 * LC-01 a LC-06, transcritas del pack. No se añaden condiciones nuevas.
 */

import type { CondicionalKB, ValoresKB } from "../tipos";

export const condicionales: CondicionalKB[] = [
  {
    id: "LC-01",
    condicion: "Si EC-Q01 = No",
    comportamiento: "Ocultar auditoría CRO detallada y orientar hacia preparación e-commerce.",
  },
  {
    id: "LC-02",
    condicion: "Si EC-Q01 = Sí",
    comportamiento: "Activar preguntas TEC y CRO.",
  },
  {
    id: "LC-03",
    condicion: "Si existen redes/mensajería activas",
    comportamiento: "Activar preguntas SS.",
  },
  {
    id: "LC-04",
    condicion: "Si SS-Q03 = No se registran o Depende del vendedor",
    comportamiento: "Evaluar trazabilidad comercial.",
  },
  {
    id: "LC-05",
    condicion: "Si CRO-Q01 = No",
    comportamiento: "Generar posible hallazgo de baja capacidad de medición.",
  },
  {
    id: "LC-06",
    condicion: "Si TEC-Q02 = múltiples integraciones y TEC-Q01 = baja capacidad",
    comportamiento: "Identificar tensión entre complejidad y capacidad tecnológica interna.",
  },
];

/* ------------------------------------------------------------------ */
/* Utilidades de lectura de variables                                  */
/* ------------------------------------------------------------------ */

export function valorUnico(valores: ValoresKB, variable: string): string | undefined {
  const valor = valores[variable];
  return typeof valor === "string" && valor.length > 0 ? valor : undefined;
}

export function valorMultiple(valores: ValoresKB, variable: string): string[] {
  const valor = valores[variable];
  return Array.isArray(valor) ? valor : [];
}

/** Integraciones reales declaradas (excluye "ninguno" y "no sabemos"). */
export function integracionesDeclaradas(valores: ValoresKB): string[] {
  return valorMultiple(valores, "integration_needs").filter(
    (v) => v !== "ninguno" && v !== "no_sabemos"
  );
}

/** Usos sociales con intención comercial declarada. */
export function usosSociales(valores: ValoresKB): string[] {
  return valorMultiple(valores, "social_use").filter((v) => v !== "sin_proposito");
}

/* ------------------------------------------------------------------ */
/* Predicados de visibilidad (LC-01, LC-02, LC-03)                     */
/* ------------------------------------------------------------------ */

/** LC-02: canal digital existente o en implementación habilita el bloque TEC. */
export function tiendaEnMarcha(valores: ValoresKB): boolean {
  const estado = valorUnico(valores, "ecommerce_status");
  return estado === "si" || estado === "en_implementacion";
}

/** LC-01 / LC-02: la auditoría CRO de alto nivel solo aplica con tienda activa. */
export function tiendaActiva(valores: ValoresKB): boolean {
  return valorUnico(valores, "ecommerce_status") === "si";
}

/** LC-03: redes o mensajería con algún propósito declarado habilitan SS. */
export function redesActivas(valores: ValoresKB): boolean {
  return usosSociales(valores).length > 0;
}
