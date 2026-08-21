/**
 * B9 · Contratos de "salida de la autopista": apoyo humano especializado.
 *
 * Metáfora del modelo: la empresa recorre la autopista de forma autogestionada
 * y, en momentos concretos, conviene salir temporalmente para resolver algo que
 * el recorrido autónomo no puede resolver bien. Después regresa al recorrido.
 *
 * Todo lo relativo a agenda y sesiones es DEMOSTRATIVO y así queda marcado.
 */

export type EspecialidadApoyo =
  | "ecommerce_cro"
  | "tecnologia"
  | "analitica"
  | "finanzas"
  | "legal"
  | "estrategia";

export type MotivoApoyoTipo =
  | "evidencia_insuficiente_reiterada"
  | "actividad_no_valida"
  | "resultado_empeora"
  | "decision_especializada"
  | "dependencia_externa"
  | "conocimiento_insuficiente";

export type OrigenApoyoTipo = "actividad" | "seguimiento" | "evidencia" | "hallazgo";

export interface OrigenApoyo {
  tipo: OrigenApoyoTipo;
  referenciaId: string;
  referenciaTitulo: string;
  dominioId: string;
  dominioNombre: string;
  /** Ruta a la que regresa la empresa al terminar la sesión. */
  rutaRetorno: string;
}

export interface ReservaSesionApoyo {
  especialistaId: string;
  especialistaNombre: string;
  fecha: string;
  hora: string;
  confirmadaEn: string;
  /** Marca explícita: no constituye una cita real. */
  demostrativa: true;
}

export interface ResultadoSesionApoyo {
  realizadaEn: string;
  conclusion: string;
  /** Qué debe hacer la empresa al volver al recorrido. */
  recomendacionRetorno: string;
  /** Marca explícita: la sesión es simulada en esta versión. */
  demostrativa: true;
}

export type EstadoApoyo = "sugerida" | "reservada" | "realizada" | "descartada";

export interface RecomendacionApoyo {
  id: string;
  empresaId: string;
  reglaId: string;
  reglaVersion: string;
  motivoTipo: MotivoApoyoTipo;
  especialidad: EspecialidadApoyo;
  /** Texto mostrado como "por qué" (explicabilidad). */
  porQue: string;
  /** Qué debería resolver la sesión. */
  objetivos: string[];
  origen: OrigenApoyo;
  estado: EstadoApoyo;
  reserva: ReservaSesionApoyo | null;
  resultado: ResultadoSesionApoyo | null;
  creadaEn: string;
  actualizadoEn: string;
}

export interface RegistroApoyoEmpresa {
  empresaId: string;
  empresaNombre: string;
  recomendaciones: RecomendacionApoyo[];
  actualizadoEn: string;
}
