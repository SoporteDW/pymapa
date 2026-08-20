/**
 * Uso conversacional del diagnóstico (Knowledge Pack, sección 18).
 *
 * Mecanismo determinista basado en trazabilidad y plantillas: no genera texto
 * nuevo ni conocimiento propio. Está desacoplado para que una versión posterior
 * pueda delegar la redacción en un modelo de IA usando el mismo contexto.
 *
 * Toda respuesta distingue tres niveles:
 *  - declarado      → "Nos indicaste que…"
 *  - interpretacion → "A partir de esas respuestas, Pymapa identifica…"
 *  - recomendacion  → "Por eso recomendamos…"
 */

import { TEXTO_INSUFICIENTE, type DominioKB, type ResultadoKB } from "./tipos";

export type IntencionKB =
  | "prioridad"
  | "hallazgos"
  | "por_que"
  | "social_selling"
  | "ecommerce"
  | "iniciativa"
  | "faltante";

export interface BloqueRespuestaKB {
  nivel: "declarado" | "interpretacion" | "recomendacion" | "aviso";
  etiqueta: string;
  texto: string;
}

export interface RespuestaConversacionalKB {
  intencion: IntencionKB;
  pregunta: string;
  bloques: BloqueRespuestaKB[];
  /** Hallazgos citados, para abrir "Ver por qué" desde la conversación. */
  hallazgosCitados: string[];
}

export const consultasSugeridas: { intencion: IntencionKB; pregunta: string }[] = [
  { intencion: "prioridad", pregunta: "¿Qué debería mejorar primero?" },
  { intencion: "hallazgos", pregunta: "¿Cuáles son mis principales hallazgos?" },
  { intencion: "por_que", pregunta: "¿Por qué me recomiendas esto?" },
  { intencion: "social_selling", pregunta: "¿Qué encontramos sobre mis redes sociales?" },
  { intencion: "ecommerce", pregunta: "¿Qué encontramos sobre mi e-commerce?" },
  { intencion: "iniciativa", pregunta: "¿Qué iniciativa debería comenzar?" },
  { intencion: "faltante", pregunta: "¿Qué información te falta para evaluarme mejor?" },
];

const ETIQUETAS: Record<BloqueRespuestaKB["nivel"], string> = {
  declarado: "Información declarada por el cliente",
  interpretacion: "Interpretación de Pymapa",
  recomendacion: "Recomendación",
  aviso: "Alcance de la respuesta",
};

function bloque(nivel: BloqueRespuestaKB["nivel"], texto: string): BloqueRespuestaKB {
  return { nivel, etiqueta: ETIQUETAS[nivel], texto };
}

function sinEvidencia(intencion: IntencionKB, pregunta: string): RespuestaConversacionalKB {
  return {
    intencion,
    pregunta,
    bloques: [
      bloque("aviso", TEXTO_INSUFICIENTE),
      bloque(
        "recomendacion",
        "Por eso recomendamos completar el instrumento del Diagnóstico Inteligente · E-commerce para que Pymapa pueda interpretar tu situación."
      ),
    ],
    hallazgosCitados: [],
  };
}

function declaradoDe(resultado: ResultadoKB, dominios: DominioKB[]): string[] {
  return resultado.hallazgos
    .filter((h) => dominios.includes(h.hallazgo.dominio))
    .flatMap((h) => h.trazas.filter((t) => t.respondida))
    .map((t) => `${t.pregunta} → ${t.respuesta}`)
    .filter((texto, indice, lista) => lista.indexOf(texto) === indice);
}

function respuestaPorDominios(
  intencion: IntencionKB,
  pregunta: string,
  resultado: ResultadoKB,
  dominios: DominioKB[]
): RespuestaConversacionalKB {
  const detectados = resultado.hallazgos.filter((h) => dominios.includes(h.hallazgo.dominio));
  const estados = resultado.estados.filter((e) => dominios.includes(e.dominio));

  if (detectados.length === 0) {
    const insuficiente = estados.every((e) => e.estado !== "preliminar");
    return {
      intencion,
      pregunta,
      bloques: insuficiente
        ? [
            bloque("aviso", TEXTO_INSUFICIENTE),
            bloque(
              "recomendacion",
              "Por eso recomendamos responder las preguntas de este bloque antes de concluir."
            ),
          ]
        : [
            bloque(
              "interpretacion",
              "A partir de esas respuestas, Pymapa no identifica hallazgos en este bloque. Es una conclusión preliminar."
            ),
          ],
      hallazgosCitados: [],
    };
  }

  const declarado = declaradoDe(resultado, dominios);
  return {
    intencion,
    pregunta,
    bloques: [
      bloque("declarado", `Nos indicaste que: ${declarado.join(" · ")}`),
      bloque(
        "interpretacion",
        `A partir de esas respuestas, Pymapa identifica: ${detectados
          .map((h) => `${h.hallazgo.titulo} — ${h.hallazgo.interpretacion}`)
          .join(" ")}`
      ),
      bloque(
        "recomendacion",
        `Por eso recomendamos: ${detectados.map((h) => h.recomendacion.texto).join(" ")}`
      ),
    ],
    hallazgosCitados: detectados.map((h) => h.hallazgo.id),
  };
}

export function responderConsulta(
  resultado: ResultadoKB,
  intencion: IntencionKB,
  preguntaTexto?: string
): RespuestaConversacionalKB {
  const pregunta =
    preguntaTexto ?? consultasSugeridas.find((c) => c.intencion === intencion)?.pregunta ?? "";

  if (resultado.progreso.respondidas === 0) return sinEvidencia(intencion, pregunta);

  switch (intencion) {
    case "prioridad":
    case "iniciativa":
    case "por_que": {
      const primero = resultado.hallazgos[0];
      if (!primero) {
        return {
          intencion,
          pregunta,
          bloques: [
            bloque(
              "interpretacion",
              "A partir de esas respuestas, Pymapa no identifica hallazgos que requieran una intervención inmediata. Conclusión preliminar."
            ),
          ],
          hallazgosCitados: [],
        };
      }
      const declarado = primero.trazas
        .filter((t) => t.respondida)
        .map((t) => `${t.pregunta} → ${t.respuesta}`)
        .join(" · ");
      const cierre =
        intencion === "iniciativa"
          ? `Por eso recomendamos comenzar por la iniciativa “${primero.recomendacion.texto}” (impacto ${primero.recomendacion.impacto}, esfuerzo ${primero.recomendacion.esfuerzo}, urgencia ${primero.recomendacion.urgencia}; valores experimentales y revisables).`
          : `Por eso recomendamos: ${primero.recomendacion.texto}`;
      return {
        intencion,
        pregunta,
        bloques: [
          bloque("declarado", `Nos indicaste que: ${declarado}`),
          bloque(
            "interpretacion",
            `A partir de esas respuestas, Pymapa identifica ${primero.hallazgo.titulo.toLowerCase()}: ${primero.hallazgo.interpretacion} (regla ${primero.regla.id}, evaluación: ${primero.regla.evaluacion})`
          ),
          bloque("recomendacion", cierre),
        ],
        hallazgosCitados: [primero.hallazgo.id],
      };
    }

    case "hallazgos": {
      if (resultado.hallazgos.length === 0) {
        return {
          intencion,
          pregunta,
          bloques: [
            bloque(
              "interpretacion",
              "A partir de esas respuestas, Pymapa no identifica hallazgos con la evidencia disponible. Conclusión preliminar."
            ),
          ],
          hallazgosCitados: [],
        };
      }
      return {
        intencion,
        pregunta,
        bloques: [
          bloque(
            "declarado",
            `Nos indicaste ${resultado.progreso.respondidas} respuestas del instrumento de E-commerce.`
          ),
          bloque(
            "interpretacion",
            `A partir de esas respuestas, Pymapa identifica: ${resultado.hallazgos
              .map((h) => `${h.hallazgo.id} · ${h.hallazgo.titulo}`)
              .join(" · ")}`
          ),
          bloque(
            "recomendacion",
            `Por eso recomendamos revisar primero “${resultado.hallazgos[0]!.recomendacion.texto}”.`
          ),
        ],
        hallazgosCitados: resultado.hallazgos.map((h) => h.hallazgo.id),
      };
    }

    case "social_selling":
      return respuestaPorDominios(intencion, pregunta, resultado, ["SS"]);

    case "ecommerce": {
      const base = respuestaPorDominios(intencion, pregunta, resultado, ["EC", "TEC", "CRO"]);
      const perfil = resultado.perfilTecnologico;
      return {
        ...base,
        bloques: [
          ...base.bloques,
          bloque(
            "interpretacion",
            `Perfil tecnológico requerido (preliminar): ${perfil.perfil}${
              perfil.razones.length > 0 ? ` Razones: ${perfil.razones.join(" ")}` : ""
            } Pymapa no recomienda todavía una plataforma concreta.`
          ),
        ],
      };
    }

    case "faltante": {
      if (resultado.faltantes.length === 0) {
        return {
          intencion,
          pregunta,
          bloques: [
            bloque(
              "interpretacion",
              "Respondiste todas las preguntas aplicables del instrumento. Para mayor precisión se requerirían instrumentos especializados posteriores."
            ),
          ],
          hallazgosCitados: [],
        };
      }
      return {
        intencion,
        pregunta,
        bloques: [
          bloque("aviso", `${TEXTO_INSUFICIENTE} Faltan ${resultado.faltantes.length} respuesta(s).`),
          bloque(
            "recomendacion",
            `Por eso recomendamos responder: ${resultado.faltantes
              .map((f) => `${f.preguntaId} (${f.pregunta})`)
              .join(" · ")}`
          ),
        ],
        hallazgosCitados: [],
      };
    }
  }
}
