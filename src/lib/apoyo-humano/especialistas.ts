/**
 * B9 · Especialistas demostrativos y franjas de agenda simuladas.
 *
 * No es un marketplace: es el mínimo necesario para demostrar la experiencia
 * "seleccionar especialista → fecha/hora → confirmar" sin integración real.
 */

import type { EspecialidadApoyo } from "./tipos";

export const AGENDA_DEMO_VERSION = "agenda-demo-1.0.0";

export interface EspecialistaDemo {
  id: string;
  nombre: string;
  especialidad: EspecialidadApoyo;
  perfil: string;
  /** Franjas demostrativas: no se consulta ninguna agenda real. */
  franjas: string[];
}

export const especialistasDemo: EspecialistaDemo[] = [
  {
    id: "ESP-CRO-01",
    nombre: "Laura Méndez",
    especialidad: "ecommerce_cro",
    perfil: "Optimización de conversión en checkout y carrito para pymes.",
    franjas: ["09:00", "11:00", "15:00"],
  },
  {
    id: "ESP-ANA-01",
    nombre: "Andrés Salgado",
    especialidad: "analitica",
    perfil: "Medición, embudos y calidad del dato comercial.",
    franjas: ["08:30", "10:30", "16:00"],
  },
  {
    id: "ESP-TEC-01",
    nombre: "Rocío Villalba",
    especialidad: "tecnologia",
    perfil: "Integraciones, plataformas de venta y registros operativos.",
    franjas: ["09:30", "14:00"],
  },
  {
    id: "ESP-EST-01",
    nombre: "Camilo Restrepo",
    especialidad: "estrategia",
    perfil: "Priorización, modelo de negocio y decisiones de inversión digital.",
    franjas: ["10:00", "17:00"],
  },
  {
    id: "ESP-FIN-01",
    nombre: "Diana Ospina",
    especialidad: "finanzas",
    perfil: "Costos, márgenes y viabilidad financiera de iniciativas digitales.",
    franjas: ["08:00", "13:00"],
  },
  {
    id: "ESP-LEG-01",
    nombre: "Jorge Ampuero",
    especialidad: "legal",
    perfil: "Datos personales, términos de venta y facturación electrónica.",
    franjas: ["11:30", "15:30"],
  },
];

export function especialistasDe(especialidad: EspecialidadApoyo): EspecialistaDemo[] {
  const propios = especialistasDemo.filter((e) => e.especialidad === especialidad);
  return propios.length > 0 ? propios : especialistasDemo;
}

/** Fechas demostrativas: los próximos cinco días hábiles a partir de mañana. */
export function fechasDemo(desde: Date = new Date()): string[] {
  const fechas: string[] = [];
  const cursor = new Date(desde);
  while (fechas.length < 5) {
    cursor.setDate(cursor.getDate() + 1);
    const dia = cursor.getDay();
    if (dia !== 0 && dia !== 6) fechas.push(cursor.toISOString().slice(0, 10));
  }
  return fechas;
}
