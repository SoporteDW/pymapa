/**
 * B3 · Servicio de evidencias (operaciones puras sobre el registro).
 *
 * Ciclo de vida: solicitada → recibida → en_analisis → analizada.
 * El análisis es SIMULADO y determinista: se construye a partir de las señales
 * declaradas en el catálogo de conocimiento y de los metadatos del archivo.
 * No hay lectura documental real ni IA.
 */

import type {
  AclaracionDefinicion,
  SolicitudEvidenciaDefinicion,
} from "@/lib/suficiencia/tipos";
import type {
  AclaracionRegistrada,
  AnalisisEvidencia,
  ArchivoEvidencia,
  EvidenciaEmpresa,
  RegistroEvidenciasEmpresa,
} from "./tipos";

export const VERSION_ANALISIS_SIMULADO = "analisis-simulado-0.1.0";

function identificador(prefijo: string): string {
  return `${prefijo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export interface ContextoSolicitud {
  empresaId: string;
  diagnosticoId: string | null;
  preguntaIds: string[];
  hallazgoIds?: string[];
}

/** Registra la solicitud de una evidencia concreta (aún sin archivo). */
export function solicitarEvidencia(
  registro: RegistroEvidenciasEmpresa,
  solicitud: SolicitudEvidenciaDefinicion,
  contexto: ContextoSolicitud,
  ahora: string = new Date().toISOString()
): { registro: RegistroEvidenciasEmpresa; evidencia: EvidenciaEmpresa } {
  const existente = registro.evidencias.find(
    (e) => e.solicitudId === solicitud.id && e.estado !== "rechazada"
  );
  if (existente) return { registro, evidencia: existente };

  const evidencia: EvidenciaEmpresa = {
    id: identificador("ev"),
    solicitudId: solicitud.id,
    titulo: solicitud.titulo,
    motivo: solicitud.motivo,
    instrucciones: solicitud.instrucciones,
    tipo: solicitud.tipo,
    estado: "solicitada",
    vinculo: {
      empresaId: contexto.empresaId,
      dominioId: solicitud.dominioId,
      diagnosticoId: contexto.diagnosticoId,
      preguntaIds: contexto.preguntaIds,
      hallazgoIds: contexto.hallazgoIds ?? [],
      actividadIds: [],
      entregableIds: [],
    },
    solicitadaEn: ahora,
    recibidaEn: null,
    archivo: null,
    analisis: null,
  };

  return {
    registro: { ...registro, evidencias: [...registro.evidencias, evidencia] },
    evidencia,
  };
}

/** Marca la evidencia como recibida con los metadatos del archivo cargado. */
export function registrarCarga(
  registro: RegistroEvidenciasEmpresa,
  evidenciaId: string,
  archivo: ArchivoEvidencia,
  ahora: string = new Date().toISOString()
): RegistroEvidenciasEmpresa {
  return {
    ...registro,
    evidencias: registro.evidencias.map((e) =>
      e.id === evidenciaId
        ? { ...e, estado: "recibida" as const, archivo, recibidaEn: ahora, analisis: null }
        : e
    ),
  };
}

/**
 * Análisis simulado y determinista. Verifica las señales del catálogo y
 * considera resuelta la necesidad cuando la evidencia tiene un archivo con
 * contenido declarado (tamaño mayor a cero).
 */
export function analizarSimulado(
  evidencia: EvidenciaEmpresa,
  solicitud: SolicitudEvidenciaDefinicion | undefined,
  ahora: string = new Date().toISOString()
): AnalisisEvidencia {
  const senales = solicitud?.senales ?? [];
  const util = Boolean(evidencia.archivo && evidencia.archivo.tamañoBytes > 0);
  const nombre = evidencia.archivo?.nombre ?? "documento";

  return {
    id: identificador("an"),
    version: VERSION_ANALISIS_SIMULADO,
    simulado: true,
    realizadoEn: ahora,
    senalesVerificadas: senales,
    observaciones: util
      ? [
          `Se recibió “${nombre}” y quedó asociado a este dominio como conocimiento de la empresa.`,
          senales.length > 0
            ? `Revisión simulada de: ${senales.join(", ")}.`
            : "Revisión simulada del documento recibido.",
          "El análisis es simulado: en esta versión Pymapa no lee el contenido del documento.",
        ]
      : [
          "El archivo recibido no contiene información utilizable, por lo que la necesidad sigue abierta.",
        ],
    resuelveSuficiencia: util,
  };
}

export function registrarAnalisis(
  registro: RegistroEvidenciasEmpresa,
  evidenciaId: string,
  solicitud: SolicitudEvidenciaDefinicion | undefined,
  ahora?: string
): { registro: RegistroEvidenciasEmpresa; analisis: AnalisisEvidencia | null } {
  const evidencia = registro.evidencias.find((e) => e.id === evidenciaId);
  if (!evidencia || !evidencia.archivo) return { registro, analisis: null };

  const analisis = analizarSimulado(evidencia, solicitud, ahora);
  return {
    registro: {
      ...registro,
      evidencias: registro.evidencias.map((e) =>
        e.id === evidenciaId ? { ...e, estado: "analizada" as const, analisis } : e
      ),
    },
    analisis,
  };
}

/** Registra la respuesta a una pregunta de aclaración. */
export function registrarAclaracion(
  registro: RegistroEvidenciasEmpresa,
  definicion: AclaracionDefinicion,
  respuesta: string,
  preguntaIds: string[],
  ahora: string = new Date().toISOString()
): RegistroEvidenciasEmpresa {
  const texto = respuesta.trim();
  if (texto.length === 0) return registro;

  const registrada: AclaracionRegistrada = {
    id: identificador("ac"),
    aclaracionId: definicion.id,
    dominioId: definicion.dominioId,
    pregunta: definicion.pregunta,
    motivo: definicion.motivo,
    respuesta: texto,
    preguntaIds,
    registradaEn: ahora,
  };

  return {
    ...registro,
    aclaraciones: [
      ...registro.aclaraciones.filter((a) => a.aclaracionId !== definicion.id),
      registrada,
    ],
  };
}

/** Evidencias relacionadas con un eslabón de la cadena (dominio, pregunta, hallazgo). */
export function evidenciasRelacionadas(
  registro: RegistroEvidenciasEmpresa,
  filtro: { dominioId?: string; preguntaId?: string; hallazgoId?: string }
): EvidenciaEmpresa[] {
  return registro.evidencias.filter((e) => {
    if (filtro.dominioId && e.vinculo.dominioId !== filtro.dominioId) return false;
    if (filtro.preguntaId && !e.vinculo.preguntaIds.includes(filtro.preguntaId)) return false;
    if (filtro.hallazgoId && !e.vinculo.hallazgoIds.includes(filtro.hallazgoId)) return false;
    return true;
  });
}
