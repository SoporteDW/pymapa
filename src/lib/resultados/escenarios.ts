/**
 * Escenarios simulados obligatorios del POC-05 (sección 13).
 * Son datos de prueba controlados: no representan a ninguna empresa real y no
 * provienen de modelos generativos.
 */

import { respuesta } from "@/lib/motor/casos-demo";
import { VALOR_NO_APLICA } from "@/lib/motor/catalogo";
import type { DiagnosticAnswer } from "@/lib/diagnostico/tipos";

const PREGUNTAS_PUNTUABLES = Array.from({ length: 24 }, (_, i) =>
  `Q${String(i + 1).padStart(2, "0")}`
);

function contexto(
  tamano: string,
  sector: string,
  canales: string[],
  objetivo: string
): DiagnosticAnswer[] {
  return [
    respuesta("C01", tamano),
    respuesta("C02", sector),
    respuesta("C03", canales),
    respuesta("C04", objetivo),
  ];
}

function uniforme(valor: number, soloIds?: string[]): DiagnosticAnswer[] {
  return (soloIds ?? PREGUNTAS_PUNTUABLES).map((id) => respuesta(id, valor));
}

function sobrescribir(
  base: DiagnosticAnswer[],
  cambios: Record<string, number | string>
): DiagnosticAnswer[] {
  const mapa = new Map(base.map((r) => [r.questionId, r]));
  for (const [id, valor] of Object.entries(cambios)) {
    mapa.set(id, respuesta(id, valor));
  }
  return [...mapa.values()];
}

export interface EscenarioResultados {
  id: string;
  nombre: string;
  descripcion: string;
  resultadoEsperado: string;
  diagnosisId: string;
  respuestas: DiagnosticAnswer[];
}

const contextoComercio = contexto("pequena", "comercio", ["presencial", "redes", "web"], "ventas");

export const escenariosResultados: EscenarioResultados[] = [
  {
    id: "ESC-05-01",
    nombre: "Pyme incipiente",
    descripcion: "Prácticas digitales mínimas en todas las áreas.",
    resultadoEsperado:
      "Puntaje bajo, prioridades críticas en fundamentos y acciones de bajo esfuerzo.",
    diagnosisId: "esc-incipiente",
    respuestas: [
      ...contexto("micro", "servicios", ["presencial", "telefono"], "operacion"),
      ...sobrescribir(uniforme(1), { Q19: 2, Q20: 2 }),
    ],
  },
  {
    id: "ESC-05-02",
    nombre: "Pyme intermedia",
    descripcion: "Canales digitales sólidos con operación interna por ordenar.",
    resultadoEsperado: "Puntaje medio, fortalezas visibles y prioridades de integración y medición.",
    diagnosisId: "esc-intermedia",
    respuestas: [
      ...contextoComercio,
      ...sobrescribir(uniforme(3), {
        Q05: 4,
        Q06: 5,
        Q07: 4,
        Q09: 2,
        Q11: 2,
        Q14: 2,
        Q16: 2,
      }),
    ],
  },
  {
    id: "ESC-05-03",
    nombre: "Pyme avanzada",
    descripcion: "Prácticas digitales estructuradas y medibles.",
    resultadoEsperado: "Puntaje alto, pocas brechas y acciones de optimización.",
    diagnosisId: "esc-avanzada",
    respuestas: [
      ...contexto("mediana", "manufactura", ["presencial", "web", "marketplace"], "eficiencia"),
      ...sobrescribir(uniforme(5), { Q12: 4, Q19: 4, Q10: VALOR_NO_APLICA as unknown as number }),
    ],
  },
  {
    id: "ESC-05-04",
    nombre: "Diagnóstico parcial",
    descripcion: "Solo una parte del instrumento fue respondida.",
    resultadoEsperado: "Confianza reducida, advertencias y resultado marcado como parcial.",
    diagnosisId: "esc-parcial",
    respuestas: [
      ...contextoComercio,
      ...uniforme(2, ["Q01", "Q02", "Q05", "Q09", "Q13", "Q21"]),
    ],
  },
  {
    id: "ESC-05-05",
    nombre: "Reglas en conflicto",
    descripcion: "Respuestas contradictorias entre práctica declarada y uso real.",
    resultadoEsperado: "Resolución por precedencia, riesgo de inconsistencia y explicación trazable.",
    diagnosisId: "esc-conflicto",
    respuestas: [
      ...contextoComercio,
      ...sobrescribir(uniforme(3), { Q08: 1, Q16: 5, Q09: 1, Q12: 5, Q21: 1, Q24: 5 }),
    ],
  },
];

export function escenarioPorId(id: string): EscenarioResultados | undefined {
  return escenariosResultados.find((e) => e.id === id);
}
