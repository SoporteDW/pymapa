/**
 * Orquestador del Motor de Conocimiento (POC-04, secciones 4, 12 y 13).
 * Ejecuta MC-01 a MC-06 y construye el contrato de salida único que consumirán
 * el POC-05, POC-06 y POC-07. Función pura: no toca almacenamiento ni interfaz.
 */

import { DEFINITION_VERSION, dimensiones } from "@/lib/diagnostico/definicion";
import {
  bandaMadurez,
  CATALOG_VERSION,
  COBERTURA_MINIMA_NIVEL,
  ENGINE_VERSION,
} from "./catalogo";
import { RULESET_VERSION } from "./reglas";
import { normalizar } from "./normalizacion";
import { calcularSenales } from "./senales";
import { construirContexto, evaluarReglas } from "./evaluador";
import { sintetizarHallazgos } from "./sintesis";
import { priorizar } from "./priorizacion";
import { construirExplicaciones } from "./explicabilidad";
import { calcularHashEntrada } from "./hash";
import type {
  Advertencia,
  CalidadMotor,
  EntradaMotor,
  EstadoEjecucion,
  Hallazgo,
  NextStepPayload,
  ResultadoDimensionMotor,
  SalidaMotor,
} from "./tipos";

function redondear(valor: number, decimales = 1): number {
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
}

export function ejecutarMotor(entrada: EntradaMotor): SalidaMotor {
  const fecha = entrada.fecha ?? new Date();
  const { respuestas: normalizadas, contexto, advertencias } = normalizar(entrada.respuestas);
  const { senales, inconsistencias } = calcularSenales(normalizadas);
  const ctx = construirContexto(normalizadas, senales, inconsistencias, contexto);
  const { activadas, reglasEvaluadas, descartadasPorContexto } = evaluarReglas(ctx);
  const hallazgos = sintetizarHallazgos(activadas);

  /* ---------- Calidad global (POC-04, 10 y 13) ---------- */
  const obligatorias = normalizadas.filter((r) => r.bandera !== "no_aplica");
  const excluidas = normalizadas.length - obligatorias.length;
  const validas = obligatorias.filter((r) => r.bandera === "ok" || r.bandera === "duplicada");
  const sinEvidencia = obligatorias.length - validas.length;
  const coverage = obligatorias.length > 0 ? (validas.length / obligatorias.length) * 100 : 0;
  const consistencyScore =
    1 - inconsistencias.length / Math.max(1, ctx.inconsistencias.size + 4 - inconsistencias.length);
  const confidence =
    hallazgos.length > 0
      ? hallazgos.reduce((total, h) => total + h.confianza, 0) / hallazgos.length
      : 0;

  const advertenciasTotales: Advertencia[] = [...advertencias];
  for (const par of inconsistencias) {
    advertenciasTotales.push({
      codigo: `MC-201-${par.id}`,
      mensaje: `Inconsistencia ${par.id}: ${par.descripcion}`,
      severidad: "media",
      referencias: [par.preguntaBaja, par.preguntaAlta],
    });
  }
  if (coverage < COBERTURA_MINIMA_NIVEL) {
    advertenciasTotales.push({
      codigo: "MC-202",
      mensaje:
        "Cobertura insuficiente: los niveles se presentan como provisionales y no como conclusión definitiva.",
      severidad: "alta",
      referencias: [],
    });
  }

  /* ---------- Resultados por dimensión ---------- */
  const dimensionResults: ResultadoDimensionMotor[] = dimensiones.map((dimension) => {
    const puntaje = redondear(ctx.promedios.get(dimension.id) ?? 0);
    const cobertura = redondear(ctx.cobertura.get(dimension.id) ?? 0);
    const banda = bandaMadurez(puntaje);
    const hallazgosDimension = hallazgos.filter((h) => h.dimensionId === dimension.id);
    const alertasCriticas = hallazgosDimension.filter(
      (h) => h.escalaCritica || h.severidad === "critica"
    ).length;
    const provisional = cobertura < COBERTURA_MINIMA_NIVEL;
    const dependenciasSinResolver = hallazgosDimension.some((h) => h.tipo === "dependencia");
    const notas: string[] = [];
    if (provisional) {
      notas.push("Cobertura insuficiente: nivel provisional, sin conclusión definitiva.");
    }
    if (alertasCriticas > 0) {
      // Las alertas críticas prevalecen sobre el promedio (POC-04, 12).
      notas.push("Alerta crítica activa: prevalece sobre el promedio de la dimensión.");
    }
    if (dependenciasSinResolver) {
      notas.push("Existen dependencias fundamentales sin resolver en esta dimensión.");
    }
    const confianzaDimension =
      hallazgosDimension.length > 0
        ? hallazgosDimension.reduce((t, h) => t + h.confianza, 0) / hallazgosDimension.length
        : 0;

    const nivelBase = provisional ? null : banda.nivel;
    const nivelAjustado =
      nivelBase !== null && alertasCriticas > 0 ? Math.min(nivelBase, 2) : nivelBase;

    return {
      dimensionId: dimension.id,
      nombre: dimension.nombre,
      peso: dimension.peso,
      puntaje,
      madurezNivel: nivelAjustado,
      madurezNombre: provisional
        ? `${banda.nombre} (provisional)`
        : alertasCriticas > 0
          ? `${banda.nombre} (limitada por alerta crítica)`
          : banda.nombre,
      madurezProvisional: provisional,
      cobertura,
      confianza: redondear(confianzaDimension, 2),
      fortalezas: hallazgosDimension
        .filter((h) => h.tipo === "fortaleza" || h.tipo === "capacidad_parcial")
        .map((h) => h.id),
      brechas: hallazgosDimension
        .filter((h) => h.tipo === "brecha" || h.tipo === "riesgo")
        .map((h) => h.id),
      alertasCriticas,
      notas,
    };
  });

  /* ---------- Priorización y explicabilidad ---------- */
  const { prioridades, dependencias } = priorizar(hallazgos, activadas, dimensionResults);
  const explicaciones = construirExplicaciones(hallazgos, activadas, prioridades, normalizadas);

  const status: EstadoEjecucion = coverage < COBERTURA_MINIMA_NIVEL ? "provisional" : "completado";
  const inputHash = calcularHashEntrada(entrada.respuestas, {
    definitionVersion: entrada.definitionVersion || DEFINITION_VERSION,
    catalogVersion: CATALOG_VERSION,
    ruleSetVersion: RULESET_VERSION,
  });

  const quality: CalidadMotor = {
    coverage: redondear(coverage),
    consistencyScore: redondear(Math.max(0, Math.min(1, consistencyScore)), 2),
    confidence: redondear(confidence, 2),
    respondidas: validas.length,
    aplicables: obligatorias.length,
    excluidasNoAplica: excluidas,
    sinEvidencia,
    inconsistencias: inconsistencias.length,
    warnings: advertenciasTotales,
  };

  const nextStepPayload: NextStepPayload = {
    diagnosisId: entrada.diagnosisId,
    executionId: `${entrada.diagnosisId}-${inputHash}-${RULESET_VERSION}`,
    ruleSetVersion: RULESET_VERSION,
    contexto,
    necesidades: prioridades.map((p) => {
      const hallazgo = hallazgos.find((h) => h.id === p.hallazgoId) as Hallazgo;
      return {
        prioridadId: p.id,
        hallazgoId: p.hallazgoId,
        dimensionId: p.dimensionId,
        capacidadId: p.capacidadId,
        titulo: p.titulo,
        banda: p.banda,
        score: p.score,
        orden: p.orden,
        ...(hallazgo?.habilitadaPor ? { habilitadaPor: hallazgo.habilitadaPor } : {}),
        evidencia: hallazgo?.evidencia ?? [],
        reglas: hallazgo?.reglas.map((r) => `${r.ruleId}@${r.version}`) ?? [],
        confianza: hallazgo?.confianza ?? 0,
        esHipotesis: hallazgo?.esHipotesis ?? false,
      };
    }),
    fortalezas: hallazgos
      .filter((h) => h.tipo === "fortaleza" || h.tipo === "capacidad_parcial")
      .map((h) => ({ hallazgoId: h.id, dimensionId: h.dimensionId, titulo: h.titulo })),
    advertencias: advertenciasTotales,
  };

  return {
    metadata: {
      executionId: nextStepPayload.executionId,
      diagnosisId: entrada.diagnosisId,
      companyId: entrada.companyId ?? null,
      timestamp: fecha.toISOString(),
      catalogVersion: CATALOG_VERSION,
      ruleSetVersion: RULESET_VERSION,
      engineVersion: ENGINE_VERSION,
      definitionVersion: entrada.definitionVersion || DEFINITION_VERSION,
      inputHash,
      status,
    },
    quality,
    dimensionResults,
    findings: hallazgos,
    priorities: prioridades,
    dependencies: dependencias,
    explanations: explicaciones,
    nextStepPayload,
    trace: {
      respuestas: normalizadas,
      senales,
      reglasActivadas: activadas,
      reglasEvaluadas,
      reglasDescartadasPorContexto: descartadasPorContexto,
    },
  };
}

/** Serialización estable de la salida para exportación y comparación (CA-MC-08). */
export function serializarSalida(salida: SalidaMotor): string {
  return JSON.stringify(salida, null, 2);
}
