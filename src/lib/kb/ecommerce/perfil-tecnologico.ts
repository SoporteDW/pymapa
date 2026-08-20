/**
 * Perfil tecnológico requerido (Knowledge Pack E-commerce v0.1, sección 15).
 *
 * La POC produce perfiles de solución, nunca plataformas concretas: no existe
 * catálogo actualizado ni scoring vigente. Toda conclusión es preliminar.
 */

import { TEXTO_INSUFICIENTE, type PerfilTecnologicoKB, type ValoresKB } from "../tipos";
import {
  integracionesDeclaradas,
  tiendaEnMarcha,
  valorUnico,
} from "./condicionales";

const PENDIENTES = [
  "Actualizar catálogo de plataformas vigentes",
  "Revisar pricing y costo total de propiedad",
  "Validar arquitectura y soporte disponible",
  "Verificar integraciones oficiales actuales",
];

const CAPACIDAD_BAJA = ["terceros", "basica"];
const CAPACIDAD_ALTA = ["equipo_tecnico", "avanzada"];

export function perfilTecnologico(valores: ValoresKB): PerfilTecnologicoKB {
  const capacidad = valorUnico(valores, "technical_capacity");
  const integraciones = integracionesDeclaradas(valores);
  const personalizacion = valorUnico(valores, "customization_need");
  const razones: string[] = [];

  if (!tiendaEnMarcha(valores) || (!capacidad && integraciones.length === 0)) {
    return {
      perfil: TEXTO_INSUFICIENTE,
      razones: [
        "Aún no se declaró capacidad técnica interna ni necesidades de integración suficientes.",
      ],
      preliminar: true,
      pendientes: PENDIENTES,
      evidencia: "insuficiente",
      tension: false,
    };
  }

  const capacidadBaja = CAPACIDAD_BAJA.includes(capacidad ?? "");
  const capacidadAlta = CAPACIDAD_ALTA.includes(capacidad ?? "");
  const integracionMultiple = integraciones.length >= 2;

  /** LC-06: tensión entre complejidad de integración y capacidad interna. */
  const tension = capacidadBaja && integracionMultiple;

  let perfil: string;
  if (tension) {
    perfil = "Solución administrada con capacidad media/alta de integración.";
    razones.push(
      "La capacidad técnica interna declarada es limitada o dependiente de terceros.",
      `Se declararon ${integraciones.length} sistemas que requieren intercambio de información.`
    );
  } else if (capacidadAlta && integracionMultiple) {
    perfil = "Solución flexible con administración propia y alta capacidad de integración.";
    razones.push(
      "Existe capacidad técnica interna para administrar la plataforma.",
      `Se declararon ${integraciones.length} sistemas que requieren intercambio de información.`
    );
  } else if (capacidadBaja) {
    perfil = "Solución administrada con necesidades de integración limitadas.";
    razones.push("La administración técnica depende de terceros o es básica.");
  } else {
    perfil = "Solución estándar con administración propia y necesidades de integración limitadas.";
    razones.push("La capacidad técnica declarada permite administrar una solución estándar.");
  }

  if (personalizacion === "alta") {
    razones.push("Se declaró una necesidad alta de personalización de la experiencia.");
  }
  if (capacidad === "no_sabemos") {
    razones.push(`Capacidad técnica interna: ${TEXTO_INSUFICIENTE}`);
  }

  const evidencia =
    capacidad && capacidad !== "no_sabemos" && integraciones.length > 0 ? "declarada" : "parcial";

  return { perfil, razones, preliminar: true, pendientes: PENDIENTES, evidencia, tension };
}
