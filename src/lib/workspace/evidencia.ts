/**
 * P0.2 · Regla de producto: EVIDENCIA ≠ ARCHIVO.
 *
 * Una actividad puede comprobarse con checks, respuestas declaradas, datos,
 * indicadores o comentarios. El archivo adjunto solo es obligatorio cuando el
 * instrumento (capa de conocimiento) lo declara expresamente, o cuando el
 * formato del entregable es en sí mismo un archivo (una captura).
 *
 * Capa: reglas de ejecución. No conoce UI ni almacenamiento.
 */

import type { EntregableEsperado } from "@/lib/instrumentos/tipos";
import type { EntregableWorkspace } from "./tipos";

interface EntregableComparable {
  formato: (EntregableEsperado | EntregableWorkspace)["formato"];
  requiereArchivo?: boolean | undefined;
}

/** ¿Esta actividad exige un documento para poder entregarse? */
export function exigeArchivo(entregable: EntregableComparable): boolean {
  if (typeof entregable.requiereArchivo === "boolean") return entregable.requiereArchivo;
  // Una captura es, por definición, un archivo. El resto es opcional.
  return entregable.formato === "captura";
}

export const TEXTO_EVIDENCIA_REQUERIDA = "Evidencia requerida";
export const TEXTO_EVIDENCIA_OPCIONAL = "Evidencia adicional · Opcional";

export function etiquetaEvidencia(entregable: EntregableComparable): string {
  return exigeArchivo(entregable) ? TEXTO_EVIDENCIA_REQUERIDA : TEXTO_EVIDENCIA_OPCIONAL;
}
