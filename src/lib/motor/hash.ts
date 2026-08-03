/**
 * Huella determinística de la entrada del motor (POC-04, 16).
 * Permite comparar ejecuciones y verificar el determinismo (CF-MC-07).
 */

import type { DiagnosticAnswer } from "@/lib/diagnostico/tipos";

function serializar(valor: unknown): string {
  if (Array.isArray(valor)) return `[${valor.map(serializar).join(",")}]`;
  if (valor === null || valor === undefined) return "null";
  return String(valor);
}

/** Hash estable de las respuestas y las versiones aplicadas. */
export function calcularHashEntrada(
  respuestas: DiagnosticAnswer[],
  versiones: { definitionVersion: string; catalogVersion: string; ruleSetVersion: string }
): string {
  const canonico = [...respuestas]
    .map((r) => `${r.questionId}=${serializar(r.value)}`)
    .sort()
    .join("|");
  const cadena = `${versiones.definitionVersion}#${versiones.catalogVersion}#${versiones.ruleSetVersion}#${canonico}`;

  let hash = 5381;
  for (let i = 0; i < cadena.length; i += 1) {
    hash = (hash * 33) ^ cadena.charCodeAt(i);
  }
  return `h${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
