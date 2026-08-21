/**
 * B6 · Profundización selectiva con el checklist experto.
 *
 * Regla metodológica: el checklist de 304 verificaciones no se aplica completo.
 * Cuando el diagnóstico especializado señala una zona crítica (por ejemplo
 * carrito o checkout), Pymapa activa SOLO el grupo pertinente y un subconjunto
 * priorizado por impacto. Declarativo y parametrizable: agregar una regla no
 * requiere tocar la interfaz.
 */

import {
  CHECKLIST_CRO_VERSION,
  seleccionarVerificaciones,
  grupoChecklist,
  type VerificacionChecklist,
} from "./checklist";

export interface ReglaProfundizacion {
  id: string;
  grupoId: string;
  /** Temas / palabras clave del hallazgo especializado que la disparan. */
  senales: string[];
  /** Dominio del diagnóstico general al que aporta. */
  dominioId: string;
  motivo: string;
  maximo: number;
  impactoMinimo: number;
}

export const reglasProfundizacion: ReglaProfundizacion[] = [
  {
    id: "PROF-CRO-CHECKOUT",
    grupoId: "checkout",
    senales: ["checkout", "pago", "pagos", "abandono", "conversion", "conversión"],
    dominioId: "D03",
    motivo:
      "El diagnóstico señala fricción en el cierre de la compra: revisamos el checkout con las verificaciones de mayor impacto.",
    maximo: 12,
    impactoMinimo: 3,
  },
  {
    id: "PROF-CRO-CARRITO",
    grupoId: "carrito",
    senales: ["carrito", "cart", "abandono", "envio", "envío", "costos"],
    dominioId: "D03",
    motivo:
      "El carrito concentra abandono declarado: profundizamos en claridad de costos, edición y continuidad de compra.",
    maximo: 10,
    impactoMinimo: 3,
  },
  {
    id: "PROF-CRO-PRODUCTO",
    grupoId: "producto",
    senales: ["producto", "ficha", "catalogo", "catálogo", "descripcion", "descripción"],
    dominioId: "D02",
    motivo:
      "La ficha de producto define la decisión de compra: verificamos información, prueba social y llamado a la acción.",
    maximo: 12,
    impactoMinimo: 3,
  },
  {
    id: "PROF-CRO-HOME",
    grupoId: "home",
    senales: ["home", "inicio", "propuesta de valor", "navegacion", "navegación"],
    dominioId: "D02",
    motivo:
      "La página de inicio no comunica con claridad la propuesta de valor: revisamos orientación y navegación.",
    maximo: 8,
    impactoMinimo: 3,
  },
  {
    id: "PROF-CRO-GENERAL",
    grupoId: "general",
    senales: ["confianza", "seguridad", "movil", "móvil", "velocidad", "tecnologia", "tecnología"],
    dominioId: "D04",
    motivo:
      "Se detectan señales transversales de confianza y desempeño: revisamos las verificaciones generales del sitio.",
    maximo: 10,
    impactoMinimo: 3,
  },
];

export interface Profundizacion {
  reglaId: string;
  grupoId: string;
  grupoNombre: string;
  dominioId: string;
  motivo: string;
  instrumentoId: string;
  instrumentoVersion: string;
  /** Verificaciones activadas (subconjunto priorizado, nunca las 304). */
  verificaciones: VerificacionChecklist[];
  /** Total de verificaciones disponibles en el grupo, para dar contexto. */
  totalGrupo: number;
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export interface EntradaProfundizacion {
  /** Textos disponibles: títulos de hallazgos, temas, iniciativas. */
  senales: string[];
  /** Límite de profundizaciones simultáneas (foco metodológico). */
  maximoProfundizaciones?: number;
}

/** Determinista: mismas señales → mismas profundizaciones y mismo orden. */
export function sugerirProfundizaciones(entrada: EntradaProfundizacion): Profundizacion[] {
  const texto = normalizar(entrada.senales.join(" | "));
  const activas = reglasProfundizacion.filter((regla) =>
    regla.senales.some((senal) => texto.includes(normalizar(senal)))
  );

  return activas
    .slice(0, entrada.maximoProfundizaciones ?? 2)
    .map((regla) => construirProfundizacion(regla));
}

export function construirProfundizacion(regla: ReglaProfundizacion): Profundizacion {
  const grupo = grupoChecklist(regla.grupoId);
  return {
    reglaId: regla.id,
    grupoId: regla.grupoId,
    grupoNombre: grupo?.nombre ?? regla.grupoId,
    dominioId: regla.dominioId,
    motivo: regla.motivo,
    instrumentoId: "INS-EC-CHECKLIST-304",
    instrumentoVersion: CHECKLIST_CRO_VERSION,
    verificaciones: seleccionarVerificaciones({
      grupoId: regla.grupoId,
      maximo: regla.maximo,
      impactoMinimo: regla.impactoMinimo,
    }),
    totalGrupo: grupo?.verificaciones.length ?? 0,
  };
}

export function profundizacionPorRegla(reglaId: string): Profundizacion | null {
  const regla = reglasProfundizacion.find((r) => r.id === reglaId);
  return regla ? construirProfundizacion(regla) : null;
}
