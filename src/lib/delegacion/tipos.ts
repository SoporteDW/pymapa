/**
 * B8 · Contratos de colaboración y delegación.
 *
 * La transformación no la ejecuta una sola persona: cualquier eslabón del
 * recorrido (pregunta, evidencia, actividad, entregable, seguimiento) puede
 * delegarse a la fuente empresarial más competente.
 *
 * Alcance MVP: no hay usuarios corporativos, permisos ni envío real de correo.
 * La solicitud queda "preparada (demo)" y el pendiente es rastreable hasta que
 * se recibe y se incorpora al conocimiento de la empresa.
 */

export type EstadoDelegacion = "pendiente_tercero" | "recibido" | "incorporado";

export type OrigenDelegacionTipo =
  | "pregunta"
  | "evidencia"
  | "aclaracion"
  | "actividad"
  | "entregable"
  | "seguimiento";

export interface OrigenDelegacion {
  tipo: OrigenDelegacionTipo;
  referenciaId: string;
  referenciaTitulo: string;
  dominioId: string;
  dominioNombre: string;
  /** Ruta del recorrido a la que vuelve el responsable principal. */
  rutaRetorno: string;
}

export interface Delegacion {
  id: string;
  empresaId: string;
  origen: OrigenDelegacion;
  nombre: string;
  correo: string;
  area: string;
  tarea: string;
  fechaEsperada: string | null;
  estado: EstadoDelegacion;
  /** Marca explícita: en esta versión el envío es simulado. */
  correoSimulado: true;
  /** Cuerpo preparado del correo, disponible para copiar o abrir el cliente. */
  mensajePreparado: string;
  solicitadaEn: string;
  recibidaEn: string | null;
  incorporadaEn: string | null;
  /** Lo que respondió el tercero y quedó incorporado como conocimiento. */
  respuesta: string;
  actualizadoEn: string;
}

export interface RegistroDelegacionEmpresa {
  empresaId: string;
  empresaNombre: string;
  delegaciones: Delegacion[];
  actualizadoEn: string;
}
