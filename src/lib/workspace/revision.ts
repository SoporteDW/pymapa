/**
 * B5 · Revisión simulada del entregable.
 *
 * Determinista y explicable: no hay lectura real del documento. La revisión NO
 * define requisitos propios: consume exactamente la misma lista que el
 * formulario de entrega muestra al usuario (`requisitos.ts`), de modo que no
 * puede existir un requisito invisible. Toda salida queda marcada como
 * `simulada: true`.
 */

import type { ArchivoEvidencia } from "@/lib/evidencias/tipos";
import { requisitosDeEntrega, requisitosPendientes } from "./requisitos";
import type { RevisionEntrega, VerificacionWorkspace } from "./tipos";

export const REVISION_VERSION = "revision-simulada-2.0.0";

export interface EntradaRevision {
  criteriosValidacion: string[];
  criteriosDeclarados: string[];
  nota: string;
  archivos: ArchivoEvidencia[];
  /** Verificaciones activadas por profundización, si la actividad las tiene. */
  verificaciones?: VerificacionWorkspace[] | undefined;
  /**
   * P0.2 · true solo cuando el entregable exige expresamente un archivo.
   * Si es false, la ausencia de adjunto NO puede bloquear la validación.
   */
  requiereArchivo?: boolean;
  numeroEntrega: number;
  revisadoEn?: string;
}

export function revisarEntrega(entrada: EntradaRevision): RevisionEntrega {
  const revisadoEn = entrada.revisadoEn ?? new Date().toISOString();

  const requisitos = requisitosDeEntrega({
    criteriosValidacion: entrada.criteriosValidacion,
    criteriosDeclarados: entrada.criteriosDeclarados,
    nota: entrada.nota,
    archivos: entrada.archivos,
    verificaciones: entrada.verificaciones,
    requiereArchivo: entrada.requiereArchivo === true,
  });

  const pendientes = requisitosPendientes(requisitos);
  const ajustes = pendientes.map((r) => r.ajuste);

  const cumplidos = entrada.criteriosValidacion.filter((c) =>
    entrada.criteriosDeclarados.includes(c)
  );
  const criteriosPendientes = entrada.criteriosValidacion.filter(
    (c) => !entrada.criteriosDeclarados.includes(c)
  );

  const veredicto: RevisionEntrega["veredicto"] =
    ajustes.length === 0 ? "validado" : "requiere_ajustes";

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
    criteriosPendientes,
    ajustesSolicitados: ajustes,
  };
}
