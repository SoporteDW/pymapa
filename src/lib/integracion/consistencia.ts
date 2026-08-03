/**
 * POC-08 · Verificación de consistencia entre módulos ("Validaciones").
 * Comprueba que la información que intercambian diagnóstico, motor, resultados,
 * fichas, Roadmap y dashboard sea coherente y trazable. Lógica pura: se usa
 * tanto en pruebas automatizadas como en el panel de integración.
 */

import { integrar } from "./orquestador";
import type { EjecucionIntegrada } from "./orquestador";

export type EstadoVerificacion = "ok" | "aviso" | "falla";

export interface Verificacion {
  id: string;
  titulo: string;
  estado: EstadoVerificacion;
  detalle: string;
}

export interface InformeConsistencia {
  diagnosisId: string;
  verificaciones: Verificacion[];
  total: number;
  correctas: number;
  avisos: number;
  fallas: number;
  /** Sin fallas: el recorrido puede presentarse de extremo a extremo. */
  aprobado: boolean;
}

function check(
  id: string,
  titulo: string,
  ok: boolean,
  detalleOk: string,
  detalleFalla: string,
  severidad: EstadoVerificacion = "falla"
): Verificacion {
  return {
    id,
    titulo,
    estado: ok ? "ok" : severidad,
    detalle: ok ? detalleOk : detalleFalla,
  };
}

/** Ejecuta las verificaciones IC-01 a IC-10 sobre una ejecución integrada. */
export function verificarConsistencia(ejecucion: EjecucionIntegrada): InformeConsistencia {
  const { diagnostico, salidaMotor, resultado, roadmap, dashboard } = ejecucion;
  const verificaciones: Verificacion[] = [];

  verificaciones.push(
    check(
      "IC-01",
      "Todos los módulos respondieron",
      ejecucion.modulosConError.length === 0,
      "Diagnóstico, motor, resultados, Roadmap y tablero se generaron sin errores.",
      `Módulos con error: ${ejecucion.modulosConError.join(", ") || "desconocido"}.`
    )
  );

  verificaciones.push(
    check(
      "IC-02",
      "El motor recibió las respuestas del diagnóstico",
      Boolean(salidaMotor) &&
        salidaMotor!.trace.respuestas.length > 0 &&
        salidaMotor!.metadata.diagnosisId === ejecucion.diagnosisId,
      `${salidaMotor?.trace.respuestas.length ?? 0} respuestas normalizadas para el diagnóstico ${ejecucion.diagnosisId}.`,
      "El motor no pudo asociar las respuestas al diagnóstico de origen."
    )
  );

  const dimensionesDiagnostico = new Set((diagnostico?.dimensionResults ?? []).map((d) => d.dimensionId));
  const dimensionesResultado = new Set((resultado?.dimensions ?? []).map((d) => d.dimensionId));
  verificaciones.push(
    check(
      "IC-03",
      "Las dimensiones coinciden entre diagnóstico y resultados",
      dimensionesDiagnostico.size > 0 &&
        dimensionesDiagnostico.size === dimensionesResultado.size &&
        [...dimensionesDiagnostico].every((id) => dimensionesResultado.has(id)),
      `${dimensionesResultado.size} dimensiones presentes en ambos módulos.`,
      "El conjunto de dimensiones difiere entre el cálculo del diagnóstico y los resultados."
    )
  );

  const hallazgos = new Set((resultado?.fortalezas ?? [])
    .concat(resultado?.brechas ?? [], resultado?.riesgos ?? [], resultado?.oportunidades ?? [])
    .map((h) => h.id));
  /**
   * Una pyme madura puede no tener brechas ni riesgos: en ese caso la ausencia de
   * prioridades y de fichas es el resultado correcto, no una inconsistencia.
   */
  const hayHallazgosAccionables =
    (resultado?.brechas.length ?? 0) + (resultado?.riesgos.length ?? 0) > 0;
  const prioridadesSinHallazgo = (resultado?.priorities ?? []).filter(
    (p) => p.findingRefs.length === 0 || !p.findingRefs.some((ref) => hallazgos.has(ref))
  );
  verificaciones.push(
    check(
      "IC-04",
      "Cada prioridad se apoya en hallazgos existentes",
      prioridadesSinHallazgo.length === 0 &&
        (hayHallazgosAccionables ? (resultado?.priorities.length ?? 0) > 0 : true),
      (resultado?.priorities.length ?? 0) > 0
        ? `${resultado?.priorities.length ?? 0} prioridades con hallazgos trazables.`
        : "Sin brechas ni riesgos: no corresponde generar prioridades.",
      prioridadesSinHallazgo.length > 0
        ? `Prioridades sin hallazgo válido: ${prioridadesSinHallazgo.map((p) => p.id).join(", ")}.`
        : "Hay brechas o riesgos, pero no se generaron prioridades."
    )
  );

  const prioridades = new Set((resultado?.priorities ?? []).map((p) => p.id));
  const fichasSinPrioridad = (resultado?.actions ?? []).filter((a) => !prioridades.has(a.priorityId));
  verificaciones.push(
    check(
      "IC-05",
      "Cada Ficha de Acción proviene de una prioridad",
      fichasSinPrioridad.length === 0 &&
        ((resultado?.priorities.length ?? 0) > 0 ? (resultado?.actions.length ?? 0) > 0 : true),
      (resultado?.actions.length ?? 0) > 0
        ? `${resultado?.actions.length ?? 0} fichas vinculadas a prioridades.`
        : "Sin prioridades vigentes: no corresponde generar Fichas de Acción.",
      fichasSinPrioridad.length > 0
        ? `Fichas sin prioridad de origen: ${fichasSinPrioridad.map((a) => a.id).join(", ")}.`
        : "Hay prioridades, pero no se generaron Fichas de Acción."
    )
  );

  const fichas = new Set((resultado?.actions ?? []).map((a) => a.id));
  const accionesHuerfanas = (roadmap?.acciones ?? []).filter((a) => !fichas.has(a.fichaAccionId));
  verificaciones.push(
    check(
      "IC-06",
      "El Roadmap refleja las Fichas de Acción",
      Boolean(roadmap) &&
        roadmap!.acciones.length === (resultado?.actions.length ?? -1) &&
        accionesHuerfanas.length === 0,
      `${roadmap?.acciones.length ?? 0} acciones del plan corresponden a las fichas vigentes.`,
      accionesHuerfanas.length > 0
        ? `Acciones sin ficha de origen: ${accionesHuerfanas.map((a) => a.id).join(", ")}.`
        : "La cantidad de acciones del plan no coincide con las Fichas de Acción."
    )
  );

  const idsAcciones = new Set((roadmap?.acciones ?? []).map((a) => a.id));
  const dependenciasRotas = (roadmap?.acciones ?? []).flatMap((a) =>
    a.dependencias.filter((d) => !idsAcciones.has(d)).map((d) => `${a.id}→${d}`)
  );
  verificaciones.push(
    check(
      "IC-07",
      "Las dependencias del plan apuntan a acciones existentes",
      dependenciasRotas.length === 0,
      "Todas las dependencias son resolubles dentro del plan.",
      `Dependencias sin destino: ${dependenciasRotas.join(", ")}.`
    )
  );

  verificaciones.push(
    check(
      "IC-08",
      "El tablero muestra la misma madurez que los resultados",
      Boolean(dashboard) &&
        Boolean(resultado) &&
        dashboard!.maturityScore === Math.round(resultado!.overallScore) &&
        dashboard!.executionId === resultado!.executionId,
      `Madurez ${dashboard?.maturityScore ?? "—"} puntos, ejecución ${dashboard?.executionId ?? "—"}.`,
      "El indicador de madurez del tablero no coincide con el resultado vigente."
    )
  );

  const cobertura = salidaMotor?.quality.coverage ?? 0;
  const parcialCoherente =
    !resultado ||
    (resultado.completeness === "parcial" ? cobertura < 1 : cobertura >= 1) ||
    resultado.advertencias.length > 0;
  verificaciones.push(
    check(
      "IC-09",
      "La completitud declarada corresponde a la cobertura real",
      parcialCoherente,
      `Cobertura ${Math.round(cobertura * 100)}% con resultado ${resultado?.completeness ?? "—"}.`,
      "El resultado se declara completo pese a una cobertura parcial de respuestas.",
      "aviso"
    )
  );

  // IC-10: determinismo. Reejecutar la misma entrada debe producir la misma huella.
  let deterministico = false;
  let detalleDeterminismo = "No se pudo reejecutar la cadena.";
  try {
    const repeticion = integrar({
      diagnosisId: ejecucion.diagnosisId,
      companyId: ejecucion.companyId,
      respuestas: ejecucion.respuestas,
    });
    deterministico =
      Boolean(salidaMotor) &&
      repeticion.salidaMotor?.metadata.inputHash === salidaMotor!.metadata.inputHash &&
      repeticion.resultado?.overallScore === resultado?.overallScore;
    detalleDeterminismo = deterministico
      ? `Huella estable ${salidaMotor?.metadata.inputHash} y puntaje reproducible.`
      : "La reejecución produjo una huella o un puntaje distinto.";
  } catch (error) {
    console.warn("No se pudo verificar el determinismo:", error);
  }
  verificaciones.push({
    id: "IC-10",
    titulo: "La cadena es determinista ante la misma entrada",
    estado: deterministico ? "ok" : "falla",
    detalle: detalleDeterminismo,
  });

  const fallas = verificaciones.filter((v) => v.estado === "falla").length;
  const avisos = verificaciones.filter((v) => v.estado === "aviso").length;
  return {
    diagnosisId: ejecucion.diagnosisId,
    verificaciones,
    total: verificaciones.length,
    correctas: verificaciones.filter((v) => v.estado === "ok").length,
    avisos,
    fallas,
    aprobado: fallas === 0,
  };
}
