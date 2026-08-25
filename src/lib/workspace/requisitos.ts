/**
 * Corrección estructural de Actuar · Requisitos VISIBLES de la entrega.
 *
 * Fuente única de los requisitos bloqueantes de una entrega. La revisión
 * (`revision.ts`) y el formulario de entrega derivan de esta misma función, de
 * modo que es imposible que la interfaz muestre "todo cumplido" y la revisión
 * exija algo que el usuario nunca vio.
 *
 * Principio heredado de Diagnosticar: qué debe demostrarse ≠ medio obligatorio
 * para demostrarlo. Un archivo solo es requisito cuando el entregable lo exige
 * expresamente (`exigeArchivo`). Pedir colaboración interna o apoyo experto son
 * mecanismos disponibles, nunca requisitos para cerrar una Actividad.
 *
 * Capa: reglas de ejecución. No conoce UI ni almacenamiento.
 */

import { exigeArchivo } from "./evidencia";
import type { ActividadWorkspace, BorradorEntrega } from "./tipos";

export const MINIMO_NOTA_ENTREGA = 40;

export type TipoRequisito = "criterio" | "nota" | "checklist" | "archivo";

export interface RequisitoEntrega {
  id: string;
  tipo: TipoRequisito;
  /** Qué debe demostrarse, en lenguaje de la pyme. */
  titulo: string;
  /** Cómo se comprueba en esta versión del demo. */
  detalle: string;
  cumplido: boolean;
  /**
   * true cuando el requisito impide siquiera enviar la entrega (mínimos de
   * forma). Los requisitos de fondo (criterios del entregable, checklist) NO
   * bloquean el envío: si faltan, la revisión los devuelve como ajustes.
   */
  bloqueante: boolean;
  /** Texto exacto que la revisión devolverá si el requisito sigue sin cumplirse. */
  ajuste: string;
}

export interface EntradaRequisitos {
  criteriosValidacion: string[];
  criteriosDeclarados: string[];
  nota: string;
  archivos: { nombre: string }[];
  /** Verificaciones del checklist especializado, si la actividad las activó. */
  verificaciones?: { id: string; estado: string }[] | undefined;
  /** true solo cuando el entregable exige expresamente un archivo. */
  requiereArchivo: boolean;
}

/** Lista completa y ordenada de los requisitos bloqueantes de la entrega. */
export function requisitosDeEntrega(entrada: EntradaRequisitos): RequisitoEntrega[] {
  const requisitos: RequisitoEntrega[] = entrada.criteriosValidacion.map((criterio, indice) => ({
    id: `criterio-${indice}`,
    tipo: "criterio",
    titulo: criterio,
    detalle: "Márcalo cuando puedas afirmar que quedó hecho en tu empresa.",
    cumplido: entrada.criteriosDeclarados.includes(criterio),
    bloqueante: false,
    ajuste: `Completar y documentar: ${criterio.replace(/\.$/, "")}.`,
  }));

  const sinRevisar = (entrada.verificaciones ?? []).filter((v) => v.estado === "sin_revisar");
  if ((entrada.verificaciones ?? []).length > 0) {
    requisitos.push({
      id: "checklist",
      tipo: "checklist",
      titulo: "Marcar el resultado de todas las verificaciones del checklist",
      detalle:
        sinRevisar.length > 0
          ? `Quedan ${sinRevisar.length} verificación(es) sin revisar.`
          : "Todas las verificaciones tienen un resultado registrado.",
      cumplido: sinRevisar.length === 0,
      bloqueante: false,
      ajuste: `Marcar el resultado de ${sinRevisar.length} verificación(es) del checklist que quedaron sin revisar.`,
    });
  }

  requisitos.push({
    id: "nota",
    tipo: "nota",
    titulo: "Describir qué se hizo en la nota de entrega",
    detalle: `Al menos ${MINIMO_NOTA_ENTREGA} caracteres: qué se hizo, quién participó y qué resultado obtuvieron.`,
    cumplido: entrada.nota.trim().length >= MINIMO_NOTA_ENTREGA,
    bloqueante: true,
    ajuste:
      "Describir en la nota de entrega qué se hizo, quién participó y qué resultado se obtuvo.",
  });

  if (entrada.requiereArchivo) {
    requisitos.push({
      id: "archivo",
      tipo: "archivo",
      titulo: "Adjuntar el documento requerido por este entregable",
      detalle: "Este entregable es, por su naturaleza, un documento o una captura.",
      cumplido: entrada.archivos.length > 0,
      bloqueante: true,
      ajuste: "Adjuntar el documento requerido por este entregable.",
    });
  }

  return requisitos;
}

/** Requisitos de una actividad concreta con su borrador vigente. */
export function requisitosDeActividad(
  actividad: ActividadWorkspace,
  borrador: BorradorEntrega
): RequisitoEntrega[] {
  return requisitosDeEntrega({
    criteriosValidacion: actividad.entregable.criteriosValidacion,
    criteriosDeclarados: borrador.criteriosDeclarados,
    nota: borrador.nota,
    archivos: borrador.archivos,
    verificaciones: actividad.profundizacion?.verificaciones,
    requiereArchivo: exigeArchivo(actividad.entregable),
  });
}

export function requisitosPendientes(requisitos: RequisitoEntrega[]): RequisitoEntrega[] {
  return requisitos.filter((r) => !r.cumplido);
}

/** Requisitos mínimos de forma que impiden enviar la entrega a revisión. */
export function requisitosBloqueantesPendientes(
  requisitos: RequisitoEntrega[]
): RequisitoEntrega[] {
  return requisitos.filter((r) => !r.cumplido && r.bloqueante);
}

export function puedeEnviarseARevision(requisitos: RequisitoEntrega[]): boolean {
  return requisitosBloqueantesPendientes(requisitos).length === 0;
}

/** true cuando la entrega cumple todo y la revisión podrá validar la Actividad. */
export function puedeValidarse(requisitos: RequisitoEntrega[]): boolean {
  return requisitosPendientes(requisitos).length === 0;
}
