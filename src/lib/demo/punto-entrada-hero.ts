/**
 * Punto de entrada ÚNICO del escenario Hero (Moda Origen).
 *
 * Existía una inconsistencia: la pantalla "Ver demostraciones" cargaba el
 * perfil PYME-04 del catálogo (cobertura parcial, 11 de 28 respuestas) y
 * sembraba el nivel "seguimiento", mientras la ruta /moda-origen cargaba el
 * cuestionario completo (28 de 28) con el nivel "diagnostico". Este módulo
 * define un solo punto de entrada para ambas: no se crea un segundo escenario.
 *
 * Estado inicial definido:
 * - Preparar completado (empresa del perfil cargada).
 * - 28 de 28 respuestas generales del diagnóstico.
 * - Diagnosticar en curso, con las aclaraciones/profundizaciones pendientes.
 * - Actuar y Seguir bloqueados hasta cerrar el diagnóstico por las reglas
 *   normales del Journey Maestro (no se siembran actividades ni seguimiento).
 */

import type { DiagnosticAnswer } from "@/lib/diagnostico/tipos";
import { RESPUESTAS_HERO_MODA_ORIGEN } from "@/lib/integracion/perfiles";
import {
  aplicarSembradoHero,
  reiniciarSembradoHero,
  type NivelSembradoHero,
  type SembradoHero,
} from "@/lib/demo/sembrado-hero";

/** Perfil simulado del caso Hero (tienda de ropa con canal digital). */
export const HERO_PERFIL_ID = "PYME-04";

/** Nivel de sembrado del punto de entrada Hero. */
export const HERO_NIVEL_INICIAL: NivelSembradoHero = "diagnostico";

/** Respuestas generales del caso Hero: instrumento completo (28 de 28). */
export const HERO_RESPUESTAS: DiagnosticAnswer[] = RESPUESTAS_HERO_MODA_ORIGEN;

export interface EntradaPuntoHero {
  empresaId: string;
  empresaNombre: string;
  /** Verdadero cuando se reinicia la demostración entre reuniones. */
  reiniciar?: boolean;
}

/**
 * Siembra el punto de entrada Hero. Idempotente y reiniciable: siempre deja el
 * mismo estado inicial definido arriba.
 */
export function sembrarPuntoEntradaHero(entrada: EntradaPuntoHero): SembradoHero {
  const { empresaId, empresaNombre, reiniciar = false } = entrada;
  const datos = { empresaId, empresaNombre, nivel: HERO_NIVEL_INICIAL };
  return reiniciar ? reiniciarSembradoHero(datos) : aplicarSembradoHero(datos);
}
