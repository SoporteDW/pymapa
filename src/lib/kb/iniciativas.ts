/**
 * Conversión recomendación → iniciativa (Knowledge Pack, secciones 12 y 13).
 *
 * La iniciativa se materializa en el modelo de Plan de Acción/Roadmap ya
 * existente (`Accion`), sin crear un sistema paralelo. La trazabilidad de
 * origen del pack viaja en `OrigenKB` y se conserva en el registro de la
 * empresa. No se vuelve a pedir información que Pymapa ya conoce.
 */

import type { Accion, Esfuerzo, Horizonte, Impacto, Prioridad } from "@/types";
import type {
  EscalaKB,
  HallazgoDetectadoKB,
  IniciativaKB,
  KnowledgePack,
  OrigenKB,
  ResultadoKB,
} from "./tipos";

const mapaEscala: Record<EscalaKB, Impacto & Esfuerzo> = {
  alto: "alto",
  medio: "medio",
  bajo: "bajo",
};

/** Prioridad derivada de urgencia e impacto declarados (experimental, revisable). */
export function prioridadSugerida(detectado: HallazgoDetectadoKB): Prioridad {
  const { urgencia, impacto } = detectado.recomendacion;
  if (urgencia === "alto" && impacto === "alto") return "alta";
  if (urgencia === "bajo" && impacto === "bajo") return "baja";
  if (urgencia === "alto" || impacto === "alto") return "alta";
  return "media";
}

function horizonteSugerido(prioridad: Prioridad, esfuerzo: EscalaKB): Horizonte {
  if (prioridad === "alta" && esfuerzo !== "alto") return "ahora";
  if (prioridad === "baja") return "mas_adelante";
  return "despues";
}

function duracionSugerida(esfuerzo: EscalaKB): string {
  if (esfuerzo === "bajo") return "2 a 3 semanas";
  if (esfuerzo === "alto") return "8 a 12 semanas";
  return "4 a 6 semanas";
}

export function idIniciativa(recomendacionId: string): string {
  return `kb-ec-${recomendacionId.toLowerCase()}`;
}

/**
 * Construye la ficha de acción y su origen a partir del hallazgo detectado.
 * Todos los campos iniciales provienen del conocimiento ya disponible.
 */
export function crearIniciativaDesdeRecomendacion(
  pack: KnowledgePack,
  resultado: ResultadoKB,
  detectado: HallazgoDetectadoKB
): IniciativaKB {
  const { recomendacion, hallazgo, regla } = detectado;
  const prioridad = prioridadSugerida(detectado);

  const accion: Accion = {
    id: idIniciativa(recomendacion.id),
    titulo: recomendacion.texto,
    proposito: recomendacion.objetivo,
    porQueImporta: `${hallazgo.titulo}: ${hallazgo.interpretacion}`,
    prioridad,
    impacto: mapaEscala[recomendacion.impacto] as Impacto,
    esfuerzo: mapaEscala[recomendacion.esfuerzo] as Esfuerzo,
    horizonte: horizonteSugerido(prioridad, recomendacion.esfuerzo),
    duracionEstimada: duracionSugerida(recomendacion.esfuerzo),
    responsableSugerido: "Por definir",
    pasos: recomendacion.acciones,
    dimensionId: hallazgo.dominio.toLowerCase(),
    estado: "pendiente",
    esSimulada: resultado.esDemo,
  };

  const origen: OrigenKB = {
    packId: pack.id,
    packVersion: pack.version,
    reglaId: regla.id,
    hallazgoId: hallazgo.id,
    recomendacionId: recomendacion.id,
    preguntas: detectado.trazas.map((t) => t.preguntaId),
    objetivo: recomendacion.objetivo,
    resultadoEsperado: recomendacion.resultadoEsperado,
    creadaEn: new Date().toISOString(),
  };

  return { accion, origen };
}

/** Campos que se completan después (sección 12: campos posteriores). */
export const camposPosteriores = [
  "Responsable",
  "Fecha objetivo",
  "Acciones detalladas",
  "KPI",
  "Evidencia",
];
