/**
 * Escenarios simulados de entrada para validar el motor (POC-04, 15 y 17).
 * Son datos de prueba: no representan resultados reales de ninguna empresa.
 */

import type { DiagnosticAnswer, ValorRespuesta } from "@/lib/diagnostico/tipos";
import { VALOR_NO_APLICA } from "./catalogo";

const FECHA_FIJA = "2026-01-15T10:00:00.000Z";

const DIMENSION_DE_PREGUNTA: Record<string, string> = {
  Q01: "D01",
  Q02: "D01",
  Q03: "D01",
  Q04: "D01",
  Q05: "D02",
  Q06: "D02",
  Q07: "D02",
  Q08: "D02",
  Q09: "D03",
  Q10: "D03",
  Q11: "D03",
  Q12: "D03",
  Q13: "D04",
  Q14: "D04",
  Q15: "D04",
  Q16: "D04",
  Q17: "D05",
  Q18: "D05",
  Q19: "D05",
  Q20: "D05",
  Q21: "D06",
  Q22: "D06",
  Q23: "D06",
  Q24: "D06",
};

export function respuesta(
  questionId: string,
  value: ValorRespuesta,
  answeredAt = FECHA_FIJA
): DiagnosticAnswer {
  const dimensionId = DIMENSION_DE_PREGUNTA[questionId];
  return { questionId, ...(dimensionId ? { dimensionId } : {}), value, answeredAt };
}

const contextoDigital: DiagnosticAnswer[] = [
  respuesta("C01", "pequena"),
  respuesta("C02", "comercio"),
  respuesta("C03", ["presencial", "redes", "web"]),
  respuesta("C04", "ventas"),
];

const contextoSinCanalDigital: DiagnosticAnswer[] = [
  respuesta("C01", "micro"),
  respuesta("C02", "manufactura"),
  respuesta("C03", ["presencial", "telefono"]),
  respuesta("C04", "operacion"),
];

function escala(valores: Record<string, number>): DiagnosticAnswer[] {
  return Object.entries(valores).map(([id, valor]) => respuesta(id, valor));
}

/** Todas las preguntas puntuables con el mismo valor. */
function uniforme(valor: number): DiagnosticAnswer[] {
  return Object.keys(DIMENSION_DE_PREGUNTA).map((id) => respuesta(id, valor));
}

export interface CasoSimulado {
  id: string;
  nombre: string;
  descripcion: string;
  diagnosisId: string;
  respuestas: DiagnosticAnswer[];
}

export const casosSimulados: CasoSimulado[] = [
  {
    id: "CF-MC-01",
    nombre: "Diagnóstico completo y consistente",
    descripcion: "Las 28 preguntas respondidas, sin contradicciones ni alertas críticas.",
    diagnosisId: "sim-completo",
    respuestas: [
      ...contextoDigital,
      ...escala({
        Q01: 4,
        Q02: 4,
        Q03: 4,
        Q04: 4,
        Q05: 4,
        Q06: 4,
        Q07: 4,
        Q08: 3,
        Q09: 4,
        Q10: 3,
        Q11: 4,
        Q12: 3,
        Q13: 4,
        Q14: 4,
        Q15: 3,
        Q16: 4,
        Q17: 4,
        Q18: 4,
        Q19: 4,
        Q20: 5,
        Q21: 4,
        Q22: 4,
        Q23: 4,
        Q24: 4,
      }),
    ],
  },
  {
    id: "CF-MC-02",
    nombre: "Diagnóstico incompleto",
    descripcion: "Solo una parte del instrumento respondida: baja cobertura y confianza.",
    diagnosisId: "sim-incompleto",
    respuestas: [
      ...contextoDigital,
      ...escala({ Q01: 2, Q02: 2, Q05: 3, Q09: 2, Q21: 4 }),
    ],
  },
  {
    id: "CF-MC-03",
    nombre: "Respuestas contradictorias",
    descripcion: "Declara no medir y a la vez decidir con indicadores.",
    diagnosisId: "sim-contradictorio",
    respuestas: [
      ...contextoDigital,
      ...uniforme(3),
      respuesta("Q08", 1),
      respuesta("Q16", 5),
      respuesta("Q09", 2),
      respuesta("Q12", 5),
    ],
  },
  {
    id: "CF-MC-04",
    nombre: "Brecha crítica de seguridad",
    descripcion: "Buen desempeño general con accesos y respaldos sin resolver.",
    diagnosisId: "sim-seguridad",
    respuestas: [
      ...contextoDigital,
      ...uniforme(5),
      respuesta("Q21", 1),
      respuesta("Q22", 2),
    ],
  },
  {
    id: "CF-MC-05",
    nombre: "Fortaleza transversal",
    descripcion: "Canales digitales muy sólidos: varias reglas sobre la misma capacidad.",
    diagnosisId: "sim-fortaleza",
    respuestas: [...contextoDigital, ...uniforme(4), respuesta("Q06", 5), respuesta("Q07", 5)],
  },
  {
    id: "CF-MC-06",
    nombre: "Necesidad dependiente",
    descripcion: "Falta información organizada y también indicadores de decisión.",
    diagnosisId: "sim-dependencia",
    respuestas: [
      ...contextoDigital,
      ...uniforme(3),
      respuesta("Q14", 1),
      respuesta("Q15", 2),
      respuesta("Q16", 1),
    ],
  },
  {
    id: "CF-MC-09",
    nombre: "Pregunta no aplicable",
    descripcion: "Una pregunta marcada como no aplica se excluye del denominador.",
    diagnosisId: "sim-no-aplica",
    respuestas: [
      ...contextoDigital,
      ...uniforme(4),
      respuesta("Q10", VALOR_NO_APLICA),
    ],
  },
  {
    id: "CF-MC-10",
    nombre: "Contexto sin canal digital",
    descripcion: "Pyme sin canales digitales: no se aplican reglas de operación de canales.",
    diagnosisId: "sim-sin-canal",
    respuestas: [...contextoSinCanalDigital, ...uniforme(2)],
  },
];

export function casoPorId(id: string): CasoSimulado | undefined {
  return casosSimulados.find((c) => c.id === id);
}
