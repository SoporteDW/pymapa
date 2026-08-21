/**
 * B6 · Contratos y accesores del checklist experto CRO/UX (304 verificaciones).
 *
 * El checklist NO es un formulario del usuario: es un activo de conocimiento.
 * Pymapa lo usa para PROFUNDIZAR de forma selectiva (un grupo, unas pocas
 * verificaciones priorizadas) cuando el diagnóstico especializado detecta una
 * zona crítica. La interfaz nunca recorre las 304 verificaciones.
 */

import { CHECKLIST_CRO_VERSION, checklistCroUx } from "./checklist-304.generated";

export interface VerificacionChecklist {
  id: string;
  grupo: string;
  subgrupo: string;
  texto: string;
  /** Impacto declarado por el activo original (1–5); null si no viene. */
  impacto: number | null;
  /** Costo/esfuerzo declarado por el activo original (1–5); null si no viene. */
  costo: number | null;
}

export interface GrupoChecklist {
  id: string;
  nombre: string;
  hoja: string;
  verificaciones: VerificacionChecklist[];
}

export interface ChecklistExperto {
  id: string;
  nombre: string;
  version: string;
  fuente: string;
  totalVerificaciones: number;
  grupos: GrupoChecklist[];
}

export { CHECKLIST_CRO_VERSION, checklistCroUx };

export function gruposChecklist(): { id: string; nombre: string; total: number }[] {
  return checklistCroUx.grupos.map((g) => ({
    id: g.id,
    nombre: g.nombre,
    total: g.verificaciones.length,
  }));
}

export function grupoChecklist(grupoId: string): GrupoChecklist | undefined {
  return checklistCroUx.grupos.find((g) => g.id === grupoId);
}

export function totalVerificaciones(): number {
  return checklistCroUx.grupos.reduce((suma, g) => suma + g.verificaciones.length, 0);
}

export interface CriterioSeleccion {
  grupoId: string;
  /** Máximo de verificaciones a activar (profundización selectiva). */
  maximo?: number;
  /** Solo verificaciones con impacto declarado >= umbral. */
  impactoMinimo?: number;
  /** Solo verificaciones cuyo subgrupo coincide (opcional). */
  subgrupos?: string[];
}

/**
 * Selección determinista: mayor impacto primero, luego menor costo, luego id.
 * Función pura: mismas entradas → misma lista.
 */
export function seleccionarVerificaciones(criterio: CriterioSeleccion): VerificacionChecklist[] {
  const grupo = grupoChecklist(criterio.grupoId);
  if (!grupo) return [];
  const impactoMinimo = criterio.impactoMinimo ?? 0;
  const candidatas = grupo.verificaciones
    .filter((v) => (v.impacto ?? 0) >= impactoMinimo)
    .filter((v) => !criterio.subgrupos || criterio.subgrupos.includes(v.subgrupo));

  const ordenadas = [...candidatas].sort((a, b) => {
    const impacto = (b.impacto ?? 0) - (a.impacto ?? 0);
    if (impacto !== 0) return impacto;
    const costo = (a.costo ?? 99) - (b.costo ?? 99);
    if (costo !== 0) return costo;
    return a.id.localeCompare(b.id);
  });

  return criterio.maximo ? ordenadas.slice(0, criterio.maximo) : ordenadas;
}
