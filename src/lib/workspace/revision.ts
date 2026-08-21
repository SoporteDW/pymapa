/**
 * B5 · Revisión simulada del entregable.
 *
 * Determinista y explicable: no hay lectura real del documento. La revisión
 * verifica los criterios de validación del instrumento contra lo que la empresa
 * declaró y adjuntó, y devuelve un veredicto con ajustes concretos.
 * Toda salida queda marcada con `simulada: true`.
 */

import type { ArchivoEvidencia } from "@/lib/evidencias/tipos";
import type { RevisionEntrega, VerificacionWorkspace } from "./tipos";

export const REVISION_VERSION = "revision-simulada-1.0.0";

export interface EntradaRevision {
  criteriosValidacion: string[];
  criteriosDeclarados: string[];
  nota: string;
  archivos: ArchivoEvidencia[];
  /** Verificaciones activadas por profundización, si la actividad las tiene. */
  verificaciones?: VerificacionWorkspace[];
  numeroEntrega: number;
  revisadoEn?: string;
}

const MINIMO_NOTA = 40;

export function revisarEntrega(entrada: EntradaRevision): RevisionEntrega {
  const revisadoEn = entrada.revisadoEn ?? new Date().toISOString();
  const cumplidos = entrada.criteriosValidacion.filter((c) =>
    entrada.criteriosDeclarados.includes(c)
  );
  const pendientes = entrada.criteriosValidacion.filter(
    (c) => !entrada.criteriosDeclarados.includes(c)
  );

  const ajustes: string[] = pendientes.map(
    (criterio) => `Completar y documentar: ${criterio.replace(/\.$/, "")}.`
  );

  if (entrada.archivos.length === 0) {
    ajustes.push("Adjuntar el entregable o una evidencia que respalde el trabajo realizado.");
  }
  if (entrada.nota.trim().length < MINIMO_NOTA) {
    ajustes.push(
      "Describir en la nota de entrega qué se hizo, quién participó y qué resultado se obtuvo."
    );
  }

  const sinRevisar = (entrada.verificaciones ?? []).filter((v) => v.estado === "sin_revisar");
  if (sinRevisar.length > 0) {
    ajustes.push(
      `Marcar el resultado de ${sinRevisar.length} verificación(es) del checklist que quedaron sin revisar.`
    );
  }

  const veredicto: RevisionEntrega["veredicto"] = ajustes.length === 0 ? "validado" : "requiere_ajustes";

  return {
    id: `rev-${entrada.numeroEntrega}-${revisadoEn}`,
    simulada: true,
    revisadoEn,
    veredicto,
    mensaje:
      veredicto === "validado"
        ? "El entregable cumple los criterios definidos por el instrumento: actividad validada."
        : `La entrega avanza, pero faltan ${ajustes.length} ajuste(s) para poder validar la actividad.`,
    criteriosCumplidos: cumplidos,
    criteriosPendientes: pendientes,
    ajustesSolicitados: ajustes,
  };
}
