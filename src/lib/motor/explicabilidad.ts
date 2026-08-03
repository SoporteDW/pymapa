/**
 * MC-06 · Explicabilidad (POC-04, sección 14).
 * Construye tres niveles de explicación por hallazgo: usuario, prueba y desarrollo.
 */

import { etiquetaRespuesta, obtenerPregunta } from "@/lib/diagnostico/definicion";
import { CATALOG_VERSION } from "./catalogo";
import { RULESET_VERSION } from "./reglas";
import { mensajeDe } from "./mensajes";
import { obtenerRegla } from "./reglas";
import type {
  Explicacion,
  Hallazgo,
  Prioridad,
  ReglaActivada,
  RespuestaNormalizada,
} from "./tipos";

export function construirExplicaciones(
  hallazgos: Hallazgo[],
  activadas: ReglaActivada[],
  prioridades: Prioridad[],
  respuestas: RespuestaNormalizada[]
): Explicacion[] {
  const mapaRespuestas = new Map(respuestas.map((r) => [r.questionId, r]));

  return hallazgos.map((hallazgo) => {
    const reglasDelHallazgo = activadas.filter((r) =>
      hallazgo.reglas.some((rr) => rr.ruleId === r.ruleId)
    );
    const prioridad = prioridades.find((p) => p.hallazgoId === hallazgo.id);
    const claveMensaje = obtenerRegla(hallazgo.reglas[0]?.ruleId ?? "")?.messageKey ?? "";
    const mensaje = mensajeDe(claveMensaje);

    const evidencia = hallazgo.evidencia.map((questionId) => {
      const pregunta = obtenerPregunta(questionId);
      const normalizada = mapaRespuestas.get(questionId);
      return {
        questionId,
        texto: pregunta?.texto ?? questionId,
        respuesta:
          pregunta && normalizada
            ? (etiquetaRespuesta(pregunta, normalizada.valorOriginal) ?? "Sin respuesta")
            : "Sin respuesta",
      };
    });

    const prefijoHipotesis = hallazgo.esHipotesis
      ? "Hipótesis a validar (evidencia limitada o contradictoria): "
      : "";

    return {
      hallazgoId: hallazgo.id,
      usuario: `${prefijoHipotesis}${mensaje.usuario} ${hallazgo.implicacion}`,
      prueba: {
        quePasoDetectado: hallazgo.estadoActual,
        evidencia,
        reglas: reglasDelHallazgo.map((r) => ({
          ruleId: r.ruleId,
          version: r.ruleVersion,
          severidad: r.severity,
        })),
        confianza: hallazgo.confianza,
        ...(prioridad ? { factoresPrioridad: prioridad.factores } : {}),
      },
      desarrollo: {
        catalogVersion: CATALOG_VERSION,
        ruleSetVersion: RULESET_VERSION,
        senales: hallazgo.senales,
        condiciones: reglasDelHallazgo.flatMap((r) =>
          r.condicionesEvaluadas.map((c) => ({
            descripcion: `${r.ruleId} · ${c.descripcion}`,
            resultado: c.resultado,
          }))
        ),
      },
    };
  });
}
