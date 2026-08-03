/**
 * MC-03 · Evaluación de reglas (POC-04, secciones 4, 8 y 10).
 * Motor genérico de condiciones declarativas: las reglas son datos y esta capa
 * solo las interpreta, registrando la traza de cada condición evaluada.
 */

import { reglasActivas } from "./reglas";
import { COBERTURA_MINIMA_NIVEL } from "./catalogo";
import { textoPregunta } from "./normalizacion";
import type {
  Condicion,
  ContextoPyme,
  ParContradiccion,
  ReglaActivada,
  RespuestaNormalizada,
  Senal,
  TrazaCondicion,
} from "./tipos";

export interface ContextoEvaluacion {
  respuestas: Map<string, RespuestaNormalizada>;
  senalesPorPregunta: Map<string, Senal[]>;
  inconsistencias: Set<string>;
  inconsistenciasPorDimension: Set<string>;
  contexto: ContextoPyme;
  /** Promedio 0-100 de respuestas válidas por dimensión. */
  promedios: Map<string, number>;
  /** Cobertura 0-100 por dimensión. */
  cobertura: Map<string, number>;
}

export function construirContexto(
  respuestas: RespuestaNormalizada[],
  senales: Senal[],
  inconsistencias: ParContradiccion[],
  contexto: ContextoPyme
): ContextoEvaluacion {
  const mapaRespuestas = new Map(respuestas.map((r) => [r.questionId, r]));
  const senalesPorPregunta = new Map<string, Senal[]>();
  for (const senal of senales) {
    for (const questionId of senal.evidencia) {
      const lista = senalesPorPregunta.get(questionId) ?? [];
      lista.push(senal);
      senalesPorPregunta.set(questionId, lista);
    }
  }

  const promedios = new Map<string, number>();
  const cobertura = new Map<string, number>();
  const dimensiones = new Set(
    respuestas.filter((r) => r.puntuable && r.dimensionId).map((r) => r.dimensionId!)
  );
  for (const dimensionId of dimensiones) {
    const puntuables = respuestas.filter((r) => r.puntuable && r.dimensionId === dimensionId);
    const aplicables = puntuables.filter((r) => r.bandera !== "no_aplica");
    const validas = puntuables.filter(
      (r) => r.valorNormalizado !== null && (r.bandera === "ok" || r.bandera === "duplicada")
    );
    promedios.set(
      dimensionId,
      validas.length > 0
        ? validas.reduce((total, r) => total + (r.valorNormalizado ?? 0), 0) / validas.length
        : 0
    );
    cobertura.set(
      dimensionId,
      aplicables.length > 0 ? (validas.length / aplicables.length) * 100 : 0
    );
  }

  return {
    respuestas: mapaRespuestas,
    senalesPorPregunta,
    inconsistencias: new Set(inconsistencias.map((i) => i.id)),
    inconsistenciasPorDimension: new Set(inconsistencias.map((i) => i.dimensionId)),
    contexto,
    promedios,
    cobertura,
  };
}

function valorEscala(ctx: ContextoEvaluacion, questionId: string): number | null {
  const respuesta = ctx.respuestas.get(questionId);
  if (!respuesta || respuesta.valorNormalizado === null) return null;
  if (respuesta.bandera !== "ok" && respuesta.bandera !== "duplicada") return null;
  return respuesta.valorNormalizado / 25 + 1;
}

/** Evalúa una condición y acumula la traza legible para desarrollo. */
export function evaluarCondicion(
  condicion: Condicion,
  ctx: ContextoEvaluacion,
  traza: TrazaCondicion[]
): boolean {
  const registrar = (descripcion: string, resultado: boolean) => {
    traza.push({ descripcion, resultado });
    return resultado;
  };

  switch (condicion.tipo) {
    case "respuestaMenorIgual": {
      const valor = valorEscala(ctx, condicion.questionId);
      // Una respuesta ausente nunca satisface una condición de brecha (CA-MC-05).
      return registrar(
        `${condicion.questionId} ≤ ${condicion.valor} (valor: ${valor ?? "sin evidencia"})`,
        valor !== null && valor <= condicion.valor
      );
    }
    case "respuestaMayorIgual": {
      const valor = valorEscala(ctx, condicion.questionId);
      return registrar(
        `${condicion.questionId} ≥ ${condicion.valor} (valor: ${valor ?? "sin evidencia"})`,
        valor !== null && valor >= condicion.valor
      );
    }
    case "sinEvidencia": {
      const valor = valorEscala(ctx, condicion.questionId);
      return registrar(`${condicion.questionId} sin evidencia`, valor === null);
    }
    case "conEvidencia": {
      const valor = valorEscala(ctx, condicion.questionId);
      return registrar(`${condicion.questionId} con evidencia`, valor !== null);
    }
    case "senal": {
      const senales = ctx.senalesPorPregunta.get(condicion.questionId) ?? [];
      const coincide = senales.some(
        (s) =>
          condicion.senales.includes(s.tipo) &&
          (condicion.intensidadMin === undefined || s.intensidad >= condicion.intensidadMin)
      );
      return registrar(
        `señal de ${condicion.questionId} en [${condicion.senales.join(", ")}]`,
        coincide
      );
    }
    case "promedioDimension": {
      const promedio = ctx.promedios.get(condicion.dimensionId) ?? 0;
      const resultado =
        condicion.operador === "<" ? promedio < condicion.valor : promedio >= condicion.valor;
      return registrar(
        `promedio ${condicion.dimensionId} ${condicion.operador} ${condicion.valor} (${promedio.toFixed(1)})`,
        resultado
      );
    }
    case "coberturaDimension": {
      const valor = ctx.cobertura.get(condicion.dimensionId) ?? 0;
      const resultado =
        condicion.operador === "<" ? valor < condicion.valor : valor >= condicion.valor;
      return registrar(
        `cobertura ${condicion.dimensionId} ${condicion.operador} ${condicion.valor}% (${valor.toFixed(0)}%)`,
        resultado
      );
    }
    case "inconsistencia":
      return registrar(
        `inconsistencia ${condicion.parId} detectada`,
        ctx.inconsistencias.has(condicion.parId)
      );
    case "contexto": {
      const valor = ctx.contexto[condicion.campo];
      return registrar(
        `contexto ${condicion.campo} ∈ [${condicion.valores.join(", ")}] (${valor ?? "sin dato"})`,
        valor !== null && condicion.valores.includes(valor)
      );
    }
    case "canalDigital":
      return registrar(
        `canal digital presente = ${condicion.presente}`,
        ctx.contexto.tieneCanalDigital === condicion.presente
      );
    case "todas": {
      const resultados = condicion.condiciones.map((c) => evaluarCondicion(c, ctx, traza));
      return registrar("todas las subcondiciones", resultados.every(Boolean));
    }
    case "alguna": {
      const resultados = condicion.condiciones.map((c) => evaluarCondicion(c, ctx, traza));
      return registrar("alguna subcondición", resultados.some(Boolean));
    }
    case "no": {
      const resultado = !evaluarCondicion(condicion.condicion, ctx, traza);
      return registrar("negación", resultado);
    }
    default:
      return registrar("condición desconocida", false);
  }
}

export interface SalidaEvaluacion {
  activadas: ReglaActivada[];
  reglasEvaluadas: number;
  descartadasPorContexto: string[];
}

/** Aplica el catálogo de reglas activas sobre las señales y el contexto. */
export function evaluarReglas(ctx: ContextoEvaluacion): SalidaEvaluacion {
  const activadas: ReglaActivada[] = [];
  const descartadasPorContexto: string[] = [];

  for (const regla of reglasActivas) {
    if (regla.applicability) {
      const trazaAplicabilidad: TrazaCondicion[] = [];
      if (!evaluarCondicion(regla.applicability, ctx, trazaAplicabilidad)) {
        descartadasPorContexto.push(regla.ruleId);
        continue;
      }
    }

    const traza: TrazaCondicion[] = [];
    if (!evaluarCondicion(regla.conditions, ctx, traza)) continue;

    const coberturaDimension = ctx.cobertura.get(regla.scope.dimensionId) ?? 100;
    let confianza = regla.confidencePolicy.base;
    if (
      regla.confidencePolicy.penalizacionInconsistencia &&
      ctx.inconsistenciasPorDimension.has(regla.scope.dimensionId)
    ) {
      confianza -= regla.confidencePolicy.penalizacionInconsistencia;
    }
    // La cobertura parcial reduce la confianza sin invalidar el hallazgo.
    confianza *= 0.6 + 0.4 * (Math.min(100, coberturaDimension) / 100);
    if (coberturaDimension < COBERTURA_MINIMA_NIVEL) confianza *= 0.9;
    confianza = Math.max(0, Math.min(1, Math.round(confianza * 100) / 100));

    const evidencia = regla.evidenceRefs.filter((id) => {
      const respuesta = ctx.respuestas.get(id);
      return respuesta?.bandera === "ok" || respuesta?.bandera === "duplicada";
    });

    activadas.push({
      ruleId: regla.ruleId,
      ruleVersion: regla.version,
      outputType: regla.outputType,
      dimensionId: regla.scope.dimensionId,
      capacidadId: regla.scope.capacidadId,
      severity: regla.severity,
      messageKey: regla.messageKey,
      evidencia,
      senales: evidencia
        .flatMap((id) => ctx.senalesPorPregunta.get(id) ?? [])
        .map((s) => s.id)
        .filter((id, i, todos) => todos.indexOf(id) === i),
      confianza,
      condicionesEvaluadas: traza,
      priorityFactors: regla.priorityFactors,
      escalaCritica: regla.escalaCritica === true,
      ...(regla.habilitadaPor ? { habilitadaPor: regla.habilitadaPor } : {}),
    });
  }

  return { activadas, reglasEvaluadas: reglasActivas.length, descartadasPorContexto };
}

export { textoPregunta };
