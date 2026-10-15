/**
 * Document-First · Compuerta G1 · Reglas explícitas de interpretación para las
 * 28 preguntas legacy (C01–C04, Q01–Q24) de `src/lib/diagnostico/definicion.ts`.
 *
 * Mecanismo declarado: reglas léxicas explícitas y versionadas (no IA). Cada
 * regla está justificada contra el enunciado literal y la escala 1–5:
 *   1 No existe · 2 Informal/esporádica · 3 Parcial · 4 Definido y regular · 5 Consolidado.
 * Una regla solo propone; la persona revisa y confirma. Sin coincidencia en el
 * texto cargado → la pregunta queda pendiente (nunca se convierte en "1").
 *
 * Salvaguardas: se ignoran fragmentos que citan puntuaciones históricas
 * (p. ej. "Q18=5") o identificadores de preguntas: no son evidencia.
 */

import { preguntasEnOrden } from "@/lib/diagnostico/definicion";
import type { ValorRespuesta } from "@/lib/diagnostico/tipos";
import { normalizar, type DocumentoExtraido, type FragmentoDocumento } from "./pdf-texto";

export const VERSION_REGLAS_G1 = "g1-reglas-1.0.0";

export type EstadoCobertura = "SUPPORTED_FOR_PROPOSAL" | "PARTIAL_NEEDS_REVIEW" | "NOT_SUPPORTED";

interface ReglaPregunta {
  preguntaId: string;
  /** Todas las expresiones deben aparecer en el mismo fragmento normalizado. */
  patrones: RegExp[];
  valor: ValorRespuesta | ((t: string) => ValorRespuesta | null);
  estado: Exclude<EstadoCobertura, "NOT_SUPPORTED">;
  regla: string;
}

/** Fragmentos excluidos como evidencia (puntuaciones legacy o metainstrucciones). */
export function fragmentoExcluido(texto: string): boolean {
  return /\bq\d{2}\b|\bc0[1-4]\b|q\d{2}\s*=\s*\d/i.test(texto);
}

const canalesC03 = (t: string): string[] | null => {
  const v: string[] = [];
  if (/tienda fisica|punto de venta|local fisico/.test(t)) v.push("presencial");
  if (/whatsapp|mensajeria/.test(t)) v.push("mensajeria");
  if (/redes sociales/.test(t)) v.push("redes");
  if (/sitio web propio/.test(t)) v.push("web");
  if (/tienda en linea|marketplace/.test(t)) v.push("marketplace");
  return v.length >= 2 ? v : null;
};

export const REGLAS_G1: ReglaPregunta[] = [
  { preguntaId: "C01", patrones: [/\b(micro|pequena|mediana) empresa\b/], estado: "PARTIAL_NEEDS_REVIEW",
    valor: (t) => (/microempresa|micro empresa/.test(t) ? "micro" : /pequena empresa/.test(t) ? "pequena" : /mediana empresa/.test(t) ? "mediana" : null),
    regla: "El documento declara la categoría de tamaño, pero no el número de personas que pide la opción: confirmar." },
  { preguntaId: "C02", patrones: [/sector:\s*(comercio|servicios|manufactura|tecnologia)/], estado: "SUPPORTED_FOR_PROPOSAL",
    valor: (t) => t.match(/sector:\s*(comercio|servicios|manufactura|tecnologia)/)?.[1] ?? null,
    regla: "Sector declarado literalmente." },
  { preguntaId: "C03", patrones: [/\bopera\b/, /(tienda fisica|redes sociales|tienda en linea)/], estado: "SUPPORTED_FOR_PROPOSAL",
    valor: canalesC03, regla: "Canales enumerados como operación habitual." },
  { preguntaId: "C04", patrones: [/objetivo prioritario/, /(aumentar|vender|incrementar) .*ventas/], estado: "PARTIAL_NEEDS_REVIEW",
    valor: "ventas", regla: "Objetivo de ventas declarado para un ciclo distinto a 12 meses: confirmar horizonte." },
  { preguntaId: "Q01", patrones: [/prioridades del trimestre/], estado: "SUPPORTED_FOR_PROPOSAL", valor: 3,
    regla: "Hay objetivos digitales definidos para el periodo; no consta que el equipo los conozca de forma regular (parcial = 3)." },
  { preguntaId: "Q02", patrones: [/registro .*decisiones/], estado: "SUPPORTED_FOR_PROPOSAL", valor: 3,
    regla: "Decisiones registradas vinculadas a prioridades comerciales, sin cartera consolidada (parcial = 3)." },
  { preguntaId: "Q03", patrones: [/coordina la agenda digital/], estado: "SUPPORTED_FOR_PROPOSAL", valor: 4,
    regla: "Persona responsable de coordinar la agenda digital definida (definido y aplicado = 4)." },
  { preguntaId: "Q04", patrones: [/(se reune|reunion) cada (lunes|semana|mes)/], estado: "SUPPORTED_FOR_PROPOSAL",
    valor: (t) => (/(no dispone|sin seguimiento|no .*sistematic)/.test(t) ? 3 : 4),
    regla: "Revisión periódica existente; sin seguimiento sistemático de compromisos → parcial (3)." },
  { preguntaId: "Q05", patrones: [/(clasificacion|segmentacion|segmentos)/, /(puntual|esporadic)/], estado: "SUPPORTED_FOR_PROPOSAL", valor: 2,
    regla: "La información de clientes se usa de forma esporádica (campañas puntuales) = 2." },
  { preguntaId: "Q06", patrones: [/costo .*envio se conoce tarde/], estado: "SUPPORTED_FOR_PROPOSAL", valor: 3,
    regla: "Canales con información de producto, pero costos de envío no claros a tiempo (parcial = 3)." },
  { preguntaId: "Q07", patrones: [/misma consulta sin coordinacion/], estado: "SUPPORTED_FOR_PROPOSAL", valor: 2,
    regla: "Respuestas duplicadas sin coordinación: continuidad entre canales informal = 2." },
  { preguntaId: "Q08", patrones: [/(muestra|conteos)/, /(sesiones|compras registradas|carritos)/], estado: "PARTIAL_NEEDS_REVIEW", valor: 2,
    regla: "Existen conteos de práctica no auditados ni conciliados: medición esporádica (2), requiere revisión." },
  { preguntaId: "Q09", patrones: [/(lista de comprobacion informal|no un procedimiento aprobado)/], estado: "SUPPORTED_FOR_PROPOSAL", valor: 2,
    regla: "Proceso descrito sin procedimiento aprobado ni versionado = informal (2)." },
  { preguntaId: "Q10", patrones: [/(validacion manual|exportaciones manuales|se exportan semanalmente)/], estado: "SUPPORTED_FOR_PROPOSAL", valor: 2,
    regla: "Tareas repetitivas resueltas manualmente = informal (2)." },
  { preguntaId: "Q11", patrones: [/(pueden duplicarse|duplicad)/], estado: "SUPPORTED_FOR_PROPOSAL", valor: 2,
    regla: "Duplicación de datos entre canales = flujo informal (2)." },
  { preguntaId: "Q12", patrones: [/muestra de \d+ pedidos/], estado: "PARTIAL_NEEDS_REVIEW", valor: 2,
    regla: "Muestra puntual de tiempos de preparación; no medición longitudinal (2), requiere revisión." },
  { preguntaId: "Q13", patrones: [/herramientas declaradas/], estado: "PARTIAL_NEEDS_REVIEW", valor: 3,
    regla: "Herramientas listadas cubren parte de las necesidades; adecuación no demostrada (3), requiere revisión." },
  { preguntaId: "Q14", patrones: [/se consulta principalmente en hojas de calculo/], estado: "SUPPORTED_FOR_PROPOSAL", valor: 3,
    regla: "Información consultable en hojas, sin tablero único (parcial = 3)." },
  { preguntaId: "Q15", patrones: [/(no existe identificador unificado|ni conciliacion automatica)/], estado: "SUPPORTED_FOR_PROPOSAL", valor: 2,
    regla: "Intercambio de datos por exportación manual, sin integración (2)." },
  { preguntaId: "Q16", patrones: [/reportes ad hoc/], estado: "SUPPORTED_FOR_PROPOSAL", valor: 2,
    regla: "Uso esporádico de reportes ad hoc para decidir (2)." },
  { preguntaId: "Q18", patrones: [/sesion interna/, /(sobre|capacitacion|guia)/], estado: "SUPPORTED_FOR_PROPOSAL",
    valor: 2,
    regla: "Una sesión interna puntual = acompañamiento esporádico (2); el documento no acredita capacitación regular." },
  { preguntaId: "Q19", patrones: [/se comparten por mensajeria/], estado: "SUPPORTED_FOR_PROPOSAL", valor: 2,
    regla: "Aprendizajes compartidos informalmente, sin registro homogéneo (2)." },
  { preguntaId: "Q20", patrones: [/ha probado cambios/], estado: "SUPPORTED_FOR_PROPOSAL", valor: 3,
    regla: "Se prueban cambios pequeños, sin registro de experimentos (parcial = 3)." },
  { preguntaId: "Q21", patrones: [/acceso .* asignado/], estado: "SUPPORTED_FOR_PROPOSAL", valor: 2,
    regla: "Accesos asignados sin matriz aprobada ni revisión = control informal (2)." },
  { preguntaId: "Q24", patrones: [/ante una caida/], estado: "SUPPORTED_FOR_PROPOSAL", valor: 2,
    regla: "Plan informal ante caídas, no probado = 2." },
  // Q17, Q22, Q23: no hay regla que proponga valor. Una frase como
  // "se desconoce la frecuencia real de respaldos" es un VACÍO, no un "1".
];

export interface PropuestaPregunta {
  preguntaId: string;
  preguntaTexto: string;
  dimensionId?: string;
  estado: EstadoCobertura;
  valorPropuesto: ValorRespuesta | null;
  fragmentoId: string | null;
  pagina: number | null;
  cita: string | null;
  regla: string;
  reglaVersion: string;
}

export function aplicarReglasG1(doc: Pick<DocumentoExtraido, "fragmentos">): PropuestaPregunta[] {
  const candidatos = doc.fragmentos.filter((f) => !fragmentoExcluido(f.texto));
  return preguntasEnOrden.map((p) => {
    const regla = REGLAS_G1.find((r) => r.preguntaId === p.id);
    let hallado: { f: FragmentoDocumento; valor: ValorRespuesta } | null = null;
    if (regla) {
      for (const f of candidatos) {
        const t = normalizar(f.texto);
        if (!regla.patrones.every((re) => re.test(t))) continue;
        const valor = typeof regla.valor === "function" ? regla.valor(t) : regla.valor;
        if (valor === null) continue;
        hallado = { f, valor };
        break;
      }
    }
    const base = { preguntaId: p.id, preguntaTexto: p.texto, reglaVersion: VERSION_REGLAS_G1, ...(p.dimensionId ? { dimensionId: p.dimensionId } : {}) };
    if (!regla || !hallado) {
      return { ...base, estado: "NOT_SUPPORTED" as const, valorPropuesto: null, fragmentoId: null, pagina: null, cita: null,
        regla: regla ? "El documento cargado no contiene una afirmación que respalde esta pregunta." : "Sin regla de interpretación: requiere respuesta directa." };
    }
    return { ...base, estado: regla.estado, valorPropuesto: hallado.valor, fragmentoId: hallado.f.id, pagina: hallado.f.pagina, cita: hallado.f.texto, regla: regla.regla };
  });
}

export function resumenCobertura(propuestas: PropuestaPregunta[]) {
  const n = (e: EstadoCobertura) => propuestas.filter((p) => p.estado === e).length;
  return { soportadas: n("SUPPORTED_FOR_PROPOSAL"), parciales: n("PARTIAL_NEEDS_REVIEW"), sinSoporte: n("NOT_SUPPORTED"), total: propuestas.length };
}
