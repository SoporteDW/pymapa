/**
 * Macroentrega 4.1 · Máquina de estados del journey del diagnóstico.
 *
 * Fuente única de verdad narrativa. Separa dos ejes que antes se mezclaban:
 *
 *  1. Cuestionario (28 preguntas obligatorias): en curso → completado.
 *  2. Suficiencia / profundización: solo existe cuando el cuestionario está
 *     completado. Que falte evidencia NO reduce ni reabre el cuestionario.
 *
 * Secuencia visible:
 *   Cuestionario → Resultado preliminar → Profundización → Diagnóstico final
 *
 * Función pura: no lee almacenamiento ni conoce componentes.
 */

export type EstadoJourneyDiagnostico =
  | "no_iniciado"
  | "cuestionario_en_curso"
  | "profundizacion_pendiente"
  /** Toda la profundización solicitada quedó resuelta: solo falta procesar el cierre. */
  | "profundizacion_completada"
  | "listo_para_cerrar"
  | "diagnostico_final";


export interface EntradaEstadoJourney {
  /** Preguntas obligatorias respondidas y total del instrumento. */
  respondidas: number;
  total: number;
  /** Necesidades de información detectadas por el motor de suficiencia. */
  necesidadesTotales: number;
  necesidadesResueltas: number;
  /** El usuario ya cerró formalmente el diagnóstico y tiene su informe. */
  cerrado: boolean;
}

export interface AvanceProfundizacion {
  total: number;
  completadas: number;
  pendientes: number;
  porcentaje: number;
}

export interface SiguientePasoDiagnostico {
  label: string;
  ruta: string;
}

export interface EstadoJourney {
  estado: EstadoJourneyDiagnostico;
  /** Etiqueta narrativa del módulo: Preliminar / Profundización / Completado. */
  etiqueta: string;
  titulo: string;
  descripcion: string;
  cuestionario: { respondidas: number; total: number; porcentaje: number; completo: boolean };
  profundizacion: AvanceProfundizacion;
  /** Único CTA principal admitido en este estado. */
  siguiente: SiguientePasoDiagnostico;
  /** Porcentaje del módulo Diagnóstico (cuestionario + profundización + cierre). */
  porcentajeModulo: number;
}

const acotar = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function estadoJourneyDiagnostico(entrada: EntradaEstadoJourney): EstadoJourney {
  const total = entrada.total > 0 ? entrada.total : 0;
  const respondidas = Math.min(entrada.respondidas, total);
  const porcentajeCuestionario = total > 0 ? acotar((respondidas / total) * 100) : 0;
  const completo = total > 0 && respondidas >= total;

  const necesidades = Math.max(0, entrada.necesidadesTotales);
  const completadas = Math.min(Math.max(0, entrada.necesidadesResueltas), necesidades);
  const profundizacion: AvanceProfundizacion = {
    total: necesidades,
    completadas,
    pendientes: necesidades - completadas,
    porcentaje: necesidades === 0 ? 100 : acotar((completadas / necesidades) * 100),
  };

  if (!completo) {
    const iniciado = respondidas > 0;
    return {
      estado: iniciado ? "cuestionario_en_curso" : "no_iniciado",
      etiqueta: iniciado ? "Cuestionario en curso" : "No iniciado",
      titulo: iniciado ? "Continúa tu cuestionario" : "Comienza tu diagnóstico",
      descripcion: iniciado
        ? `Has respondido ${respondidas} de ${total} preguntas. Retomarás justo donde te quedaste.`
        : "Son preguntas breves sobre seis aspectos de tu empresa. Puedes guardar y continuar después.",
      cuestionario: { respondidas, total, porcentaje: porcentajeCuestionario, completo },
      profundizacion,
      siguiente: {
        label: iniciado ? "Continuar diagnóstico" : "Comenzar diagnóstico",
        ruta: "/diagnostico",
      },
      porcentajeModulo: acotar((respondidas / (total || 1)) * 60),
    };
  }

  if (entrada.cerrado) {
    return {
      estado: "diagnostico_final",
      etiqueta: "Completado",
      titulo: "Diagnóstico completado",
      descripcion:
        "Tu diagnóstico está cerrado y su informe disponible. El siguiente paso es convertir los hallazgos en acciones.",
      cuestionario: { respondidas, total, porcentaje: porcentajeCuestionario, completo },
      profundizacion,
      siguiente: { label: "Construir mi Plan de Acción", ruta: "/plan-de-accion" },
      porcentajeModulo: 100,
    };
  }

  if (profundizacion.pendientes > 0) {
    return {
      estado: "profundizacion_pendiente",
      etiqueta: "Profundización",
      titulo: "Tu resultado todavía es preliminar",
      descripcion:
        profundizacion.total === 1
          ? "Necesitamos confirmar 1 aspecto antes de emitir tu diagnóstico final."
          : `Necesitamos confirmar ${profundizacion.total} aspectos antes de emitir tu diagnóstico final.`,
      cuestionario: { respondidas, total, porcentaje: porcentajeCuestionario, completo },
      profundizacion,
      siguiente: {
        label: profundizacion.completadas > 0 ? "Continuar profundización" : "Comenzar profundización",
        ruta: "/diagnostico/cierre",
      },
      porcentajeModulo: acotar(60 + profundizacion.porcentaje * 0.3),
    };
  }

  return {
    estado: "listo_para_cerrar",
    etiqueta: "Preliminar · listo para cerrar",
    titulo: "Ya tenemos la información necesaria para cerrar tu diagnóstico",
    descripcion:
      "Respondiste todo el cuestionario y no queda información pendiente por confirmar.",
    cuestionario: { respondidas, total, porcentaje: porcentajeCuestionario, completo },
    profundizacion,
    siguiente: { label: "Cerrar mi diagnóstico", ruta: "/diagnostico/listo" },
    porcentajeModulo: 95,
  };
}
