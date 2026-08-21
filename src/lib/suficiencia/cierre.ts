/**
 * B4-gate · Estado de cierre del diagnóstico.
 *
 * La suficiencia cualitativa actúa como compuerta: mientras falte evidencia o
 * una aclaración, el resultado es PRELIMINAR (se puede leer y trabajar, pero
 * queda marcado como tal). Cuando todos los dominios están suficientes, el
 * diagnóstico queda CERRADO y sus resultados se consideran validados.
 */

import type { ResultadoSuficiencia } from "./tipos";

export type EstadoCierreDiagnostico = "preliminar" | "cerrado";

export interface CierreDiagnostico {
  estado: EstadoCierreDiagnostico;
  etiqueta: string;
  mensaje: string;
  /** Necesidades que impiden cerrar, en texto listo para mostrar. */
  faltantes: string[];
  /** Permite decidir si se muestra el aviso de resultado preliminar. */
  esPreliminar: boolean;
}

export function evaluarCierre(suficiencia: ResultadoSuficiencia): CierreDiagnostico {
  const pendientes = suficiencia.necesidadesPendientes.filter((n) => !n.resuelta);

  if (suficiencia.puedeCerrar && pendientes.length === 0) {
    return {
      estado: "cerrado",
      etiqueta: "Diagnóstico cerrado",
      mensaje:
        "La información es suficiente en todos los dominios: estos resultados están validados y sostienen el plan de acción.",
      faltantes: [],
      esPreliminar: false,
    };
  }

  return {
    estado: "preliminar",
    etiqueta: "Resultado preliminar",
    mensaje:
      "Puedes leer y trabajar estos resultados, pero aún no están cerrados: falta complementar información para confirmar la interpretación.",
    faltantes: pendientes.map((n) =>
      n.tipo === "evidencia" ? `Evidencia pendiente: ${n.titulo}` : `Aclaración pendiente: ${n.titulo}`
    ),
    esPreliminar: true,
  };
}
