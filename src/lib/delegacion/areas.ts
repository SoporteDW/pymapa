/**
 * B8 · Áreas responsables sugeridas por dominio (capa conocimiento).
 *
 * Deja preparada la delegación por dominio: Tecnología → TI, Finanzas →
 * responsable financiero, Personas → RR. HH., Comercial/e-commerce →
 * responsable digital. No implica permisos ni gestión de usuarios.
 */

import { nombreDominio } from "@/lib/dominios/registro";

export const CATALOGO_AREAS_VERSION = "areas-1.0.0";

export interface AreaResponsable {
  id: string;
  nombre: string;
  descripcion: string;
  /** Dominios del diagnóstico general que suele responder esta área. */
  dominios: string[];
}

export const areasResponsables: AreaResponsable[] = [
  {
    id: "direccion",
    nombre: "Dirección / Gerencia",
    descripcion: "Decisiones de estrategia, inversión y prioridades.",
    dominios: ["D01"],
  },
  {
    id: "operaciones",
    nombre: "Operaciones",
    descripcion: "Procesos, flujos de trabajo y capacidad de entrega.",
    dominios: ["D02"],
  },
  {
    id: "comercial_digital",
    nombre: "Comercial / Digital",
    descripcion: "Venta en línea, e-commerce, marketing y experiencia de compra.",
    dominios: ["D03"],
  },
  {
    id: "tecnologia",
    nombre: "Tecnología / TI",
    descripcion: "Sistemas, integraciones, datos e infraestructura.",
    dominios: ["D04", "D05"],
  },
  {
    id: "personas",
    nombre: "Personas / RR. HH.",
    descripcion: "Competencias digitales, formación y cambio cultural.",
    dominios: ["D06"],
  },
  {
    id: "finanzas",
    nombre: "Finanzas",
    descripcion: "Costos, márgenes, facturación e información financiera.",
    dominios: [],
  },
];

export function areaSugerida(dominioId: string): AreaResponsable {
  return (
    areasResponsables.find((a) => a.dominios.includes(dominioId)) ??
    areasResponsables[0]!
  );
}

export function descripcionDelegacionDominio(dominioId: string): string {
  const area = areaSugerida(dominioId);
  return `${nombreDominio(dominioId)} → ${area.nombre}`;
}
