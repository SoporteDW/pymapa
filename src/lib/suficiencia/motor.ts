/**
 * B2 · Motor de suficiencia.
 *
 * Función pura y determinista: respuestas + evidencias + aclaraciones →
 * estado cualitativo por dominio. No calcula puntajes ni confianza; no decide
 * recomendaciones. Solo responde: ¿podemos concluir este dominio o necesitamos
 * complementar información?
 */

import { dominios, preguntasPuntuablesDeDominio } from "@/lib/dominios/registro";
import type { DiagnosticAnswer } from "@/lib/diagnostico/tipos";
import type { AclaracionRegistrada, EvidenciaEmpresa } from "@/lib/evidencias/tipos";
import { catalogoSuficiencia } from "./catalogo";
import type {
  CatalogoSuficiencia,
  EstadoSuficiencia,
  NecesidadInformacion,
  ReglaSuficiencia,
  ResultadoSuficiencia,
  SuficienciaDominio,
} from "./tipos";

export interface EntradaSuficiencia {
  respuestas: DiagnosticAnswer[];
  evidencias: EvidenciaEmpresa[];
  aclaraciones: AclaracionRegistrada[];
  catalogo?: CatalogoSuficiencia;
  evaluadoEn?: string;
}

const ORDEN_ESTADOS: EstadoSuficiencia[] = [
  "insuficiente",
  "evidencia_pendiente",
  "aclaracion_pendiente",
  "suficiente",
];

function preguntasDeRegla(regla: ReglaSuficiencia): string[] {
  return regla.condicion.preguntas === "dominio"
    ? preguntasPuntuablesDeDominio(regla.dominioId)
    : regla.condicion.preguntas;
}

/** Valores numéricos válidos (escala 1-5) de un conjunto de preguntas. */
function valoresDe(respuestas: DiagnosticAnswer[], preguntaIds: string[]): number[] {
  return preguntaIds
    .map((id) => respuestas.find((r) => r.questionId === id)?.value)
    .map((valor) => Number(valor))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 5);
}

function condicionSeCumple(regla: ReglaSuficiencia, respuestas: DiagnosticAnswer[]): boolean {
  const preguntaIds = preguntasDeRegla(regla);
  const valores = valoresDe(respuestas, preguntaIds);
  const umbral = regla.condicion.umbral ?? 0;

  switch (regla.condicion.tipo) {
    case "respuestas_incompletas":
      return valores.length < preguntaIds.length;
    case "nivel_declarado_bajo":
      return valores.some((v) => v <= umbral);
    case "respuestas_dispersas":
      if (valores.length < 2) return false;
      return Math.max(...valores) - Math.min(...valores) >= umbral;
    default:
      return false;
  }
}

/** Una evidencia resuelve la necesidad únicamente cuando ya fue analizada. */
function evidenciaResuelve(
  evidencias: EvidenciaEmpresa[],
  solicitudId: string,
  dominioId: string
): boolean {
  return evidencias.some(
    (e) =>
      e.solicitudId === solicitudId &&
      e.vinculo.dominioId === dominioId &&
      e.estado === "analizada" &&
      (e.analisis?.resuelveSuficiencia ?? false)
  );
}

function aclaracionResuelve(aclaraciones: AclaracionRegistrada[], aclaracionId: string): boolean {
  return aclaraciones.some((a) => a.aclaracionId === aclaracionId && a.respuesta.trim().length > 0);
}

function mensajeDominio(estado: EstadoSuficiencia, nombre: string): string {
  switch (estado) {
    case "insuficiente":
      return `Faltan respuestas en ${nombre}: sin ellas no podemos interpretar este dominio.`;
    case "evidencia_pendiente":
      return `Podemos avanzar en ${nombre}, pero necesitamos una evidencia documental antes de cerrar la interpretación.`;
    case "aclaracion_pendiente":
      return `En ${nombre} necesitamos una aclaración breve para no interpretar de forma equivocada.`;
    case "suficiente":
      return `La información declarada en ${nombre} es suficiente para interpretar este dominio.`;
  }
}

function peorEstado(estados: EstadoSuficiencia[]): EstadoSuficiencia {
  for (const estado of ORDEN_ESTADOS) {
    if (estados.includes(estado)) return estado;
  }
  return "suficiente";
}

function mensajeGeneral(estado: EstadoSuficiencia, dominiosAfectados: string[]): string {
  if (estado === "suficiente") {
    return "La información es suficiente para continuar hacia el resultado del diagnóstico.";
  }
  const lista = dominiosAfectados.join(", ");
  if (estado === "insuficiente") {
    return `Antes de cerrar este diagnóstico necesitamos completar las respuestas pendientes en: ${lista}.`;
  }
  if (estado === "evidencia_pendiente") {
    return `Antes de cerrar este diagnóstico necesitamos complementar alguna información en: ${lista}.`;
  }
  return `Antes de cerrar este diagnóstico necesitamos una aclaración en: ${lista}.`;
}

export function evaluarSuficiencia(entrada: EntradaSuficiencia): ResultadoSuficiencia {
  const catalogo = entrada.catalogo ?? catalogoSuficiencia;
  const { respuestas, evidencias, aclaraciones } = entrada;

  const resultadoDominios: SuficienciaDominio[] = dominios.map((dominio) => {
    const preguntaIds = preguntasPuntuablesDeDominio(dominio.id);
    const respondidas = valoresDe(respuestas, preguntaIds).length;

    const necesidades: NecesidadInformacion[] = catalogo.reglas
      .filter((r) => r.dominioId === dominio.id)
      .filter((r) => condicionSeCumple(r, respuestas))
      .map((regla) => {
        const esEvidencia = regla.exige === "evidencia";
        const referenciaId = (esEvidencia ? regla.solicitudId : regla.aclaracionId) ?? regla.id;
        const solicitud = catalogo.solicitudes.find((s) => s.id === referenciaId);
        const aclaracion = catalogo.aclaraciones.find((a) => a.id === referenciaId);
        return {
          reglaId: regla.id,
          dominioId: dominio.id,
          tipo: regla.exige,
          referenciaId,
          titulo: esEvidencia ? (solicitud?.titulo ?? referenciaId) : (aclaracion?.pregunta ?? referenciaId),
          porQue: regla.porQue,
          preguntaIds: preguntasDeRegla(regla),
          resuelta: esEvidencia
            ? evidenciaResuelve(evidencias, referenciaId, dominio.id)
            : aclaracionResuelve(aclaraciones, referenciaId),
        };
      });

    const pendientes = necesidades.filter((n) => !n.resuelta);
    let estado: EstadoSuficiencia;
    if (respondidas < preguntaIds.length) {
      estado = "insuficiente";
    } else if (pendientes.some((n) => n.tipo === "evidencia")) {
      estado = "evidencia_pendiente";
    } else if (pendientes.some((n) => n.tipo === "aclaracion")) {
      estado = "aclaracion_pendiente";
    } else {
      estado = "suficiente";
    }

    return {
      dominioId: dominio.id,
      nombre: dominio.nombre,
      estado,
      mensaje: mensajeDominio(estado, dominio.nombre),
      respondidas,
      total: preguntaIds.length,
      necesidades,
    };
  });

  const estadoGeneral = peorEstado(resultadoDominios.map((d) => d.estado));
  const afectados = resultadoDominios.filter((d) => d.estado === estadoGeneral).map((d) => d.nombre);
  const necesidadesPendientes = resultadoDominios
    .flatMap((d) => d.necesidades)
    .filter((n) => !n.resuelta);

  return {
    catalogoId: catalogo.id,
    catalogoVersion: catalogo.version,
    evaluadoEn: entrada.evaluadoEn ?? new Date().toISOString(),
    estadoGeneral,
    mensajeGeneral: mensajeGeneral(estadoGeneral, afectados),
    dominios: resultadoDominios,
    necesidadesPendientes,
    puedeCerrar: estadoGeneral === "suficiente",
  };
}

/** Etiqueta legible del estado (usada por la interfaz sin duplicar lógica). */
export function etiquetaSuficiencia(estado: EstadoSuficiencia): string {
  switch (estado) {
    case "suficiente":
      return "Información suficiente";
    case "insuficiente":
      return "Información insuficiente";
    case "evidencia_pendiente":
      return "Evidencia pendiente";
    case "aclaracion_pendiente":
      return "Aclaración pendiente";
  }
}
