/**
 * Referencias demostrativas de instrumentos de financiación (capa conocimiento).
 *
 * Son DATOS, no un motor: no hay API, integración, matching automático,
 * elegibilidad ni simulación. Pymapa solo señala que una intervención podría
 * explorar instrumentos de este tipo; la aplicabilidad la valida la entidad
 * financiera.
 */

export const INSTRUMENTOS_FINANCIEROS_VERSION = "referencias-financieras-1.0.0";

export const ADVERTENCIA_INSTRUMENTOS =
  "Referencia para exploración. Su aplicabilidad debe ser validada con la entidad financiera. Pymapa no determina elegibilidad ni aprueba financiación.";

export interface InstrumentoFinancieroReferencia {
  id: string;
  entidad: string;
  nombre: string;
  orientacion: string;
  /** Tipos de intervención con los que la referencia guarda relación. */
  pertinencia: string[];
}

export const instrumentosFinancierosReferencia: InstrumentoFinancieroReferencia[] = [
  {
    id: "REF-BC-PRODUCTIVIDAD",
    entidad: "Bancóldex",
    nombre: "Impulso a la Productividad",
    orientacion:
      "Intervenciones orientadas a mejorar productividad y capacidad de gestión de la empresa.",
    pertinencia: ["proceso", "formacion", "asistencia_tecnica"],
  },
  {
    id: "REF-BC-TRANSFORMACION",
    entidad: "Bancóldex",
    nombre: "Transformación Digital",
    orientacion:
      "Intervenciones de digitalización, modernización tecnológica e implementación de herramientas.",
    pertinencia: ["tecnologia", "asistencia_tecnica"],
  },
];

/** Selección por pertinencia declarada; si nada coincide, se muestran todas. */
export function referenciasPara(tipos: string[]): InstrumentoFinancieroReferencia[] {
  const coincidencias = instrumentosFinancierosReferencia.filter((i) =>
    i.pertinencia.some((p) => tipos.includes(p))
  );
  return coincidencias.length > 0 ? coincidencias : instrumentosFinancierosReferencia;
}
