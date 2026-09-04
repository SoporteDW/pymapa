/**
 * B7 · Catálogo versionado de indicadores de seguimiento (capa conocimiento).
 *
 * No hay scoring: cada plantilla declara qué se mide, en qué unidad, en qué
 * dirección mejora y qué se pide en cada hito. La selección es determinista a
 * partir de señales del título/objetivo de la actividad y de su dominio.
 */

import type {
  DireccionIndicador,
  HitoSeguimientoId,
  SolicitudSeguimiento,
} from "./tipos";

export const CATALOGO_SEGUIMIENTO_VERSION = "seguimiento-1.0.0";

export interface PlantillaIndicador {
  id: string;
  nombre: string;
  descripcion: string;
  unidad: string;
  direccion: DireccionIndicador;
  /** Valores demostrativos usados cuando la empresa no declara línea base. */
  lineaBaseSugerida: number;
  metaSugerida: number;
  dominios: string[];
  senales: string[];
  fuente: string;
}

export const plantillasIndicador: PlantillaIndicador[] = [
  {
    id: "IND-EC-CONSULTAS",
    nombre: "Tiempo promedio de respuesta a consultas de compra",
    descripcion:
      "Horas promedio que tarda el equipo en responder una consulta de compra recibida por cualquier canal.",
    unidad: "horas",
    direccion: "menor_mejor",
    lineaBaseSugerida: 24,
    metaSugerida: 4,
    dominios: ["D03"],
    senales: ["consulta", "consultas", "respuesta a consultas"],
    fuente: "Knowledge Pack e-commerce · atención comercial",
  },
  {

    id: "IND-EC-CHECKOUT",
    nombre: "Abandono de checkout",
    descripcion:
      "Porcentaje de compras que se inician en el checkout y no se completan.",
    unidad: "%",
    direccion: "menor_mejor",
    lineaBaseSugerida: 72,
    metaSugerida: 55,
    dominios: ["D03"],
    senales: ["checkout", "pago", "abandono", "cierre de compra"],
    fuente: "Knowledge Pack e-commerce · reglas CRO",
  },
  {
    id: "IND-EC-CARRITO",
    nombre: "Conversión del carrito",
    descripcion: "Porcentaje de carritos creados que terminan en pedido.",
    unidad: "%",
    direccion: "mayor_mejor",
    lineaBaseSugerida: 18,
    metaSugerida: 26,
    dominios: ["D03"],
    senales: ["carrito", "envío", "costos", "continuidad"],
    fuente: "Knowledge Pack e-commerce · reglas CRO",
  },
  {
    id: "IND-PROC-TIEMPO",
    nombre: "Tiempo de ciclo del proceso",
    descripcion: "Días promedio que toma completar el proceso intervenido.",
    unidad: "días",
    direccion: "menor_mejor",
    lineaBaseSugerida: 9,
    metaSugerida: 5,
    dominios: ["D02", "D04"],
    senales: ["proceso", "operación", "flujo", "tiempo"],
    fuente: "Instrumento propio Pymapa · mapa de procesos",
  },
  {
    id: "IND-GEN-ADOPCION",
    nombre: "Adopción de la mejora",
    descripcion:
      "Porcentaje del equipo o de las operaciones que ya trabaja con la mejora implementada.",
    unidad: "%",
    direccion: "mayor_mejor",
    lineaBaseSugerida: 20,
    metaSugerida: 70,
    dominios: [],
    senales: [],
    fuente: "Instrumento propio Pymapa · seguimiento general",
  },
];

/** Hitos disponibles. Parametrizables: no todos los seguimientos usan los tres. */
export const hitosDisponibles: {
  id: HitoSeguimientoId;
  dias: number;
  etiqueta: string;
  solicitudes: SolicitudSeguimiento[];
}[] = [
  {
    id: "d30",
    dias: 30,
    etiqueta: "30 días · primera medición",
    solicitudes: [
      { tipo: "indicador", texto: "Registra el valor actual del indicador." },
      {
        tipo: "observacion",
        texto: "Describe qué cambió en la operación desde la validación.",
      },
    ],
  },
  {
    id: "d60",
    dias: 60,
    etiqueta: "60 días · segunda medición",
    solicitudes: [
      { tipo: "indicador", texto: "Registra el valor del indicador este mes." },
      {
        tipo: "evidencia",
        texto: "Adjunta un reporte o captura que respalde el valor informado.",
      },
    ],
  },
  {
    id: "d90",
    dias: 90,
    etiqueta: "90 días · evaluación",
    solicitudes: [
      { tipo: "indicador", texto: "Registra el valor de cierre del período." },
      {
        tipo: "respuesta",
        texto: "¿La mejora se sostiene sin esfuerzo extraordinario del equipo?",
      },
      { tipo: "documento", texto: "Documento breve con la conclusión interna." },
    ],
  },
];

/** Selección determinista del indicador para una actividad concreta. */
export function seleccionarPlantillaIndicador(entrada: {
  titulo: string;
  objetivo: string;
  dominioId: string;
}): PlantillaIndicador {
  const texto = `${entrada.titulo} ${entrada.objetivo}`.toLowerCase();
  const porSenal = plantillasIndicador.find(
    (p) =>
      p.senales.some((s) => texto.includes(s)) &&
      (p.dominios.length === 0 || p.dominios.includes(entrada.dominioId))
  );
  if (porSenal) return porSenal;
  const porDominio = plantillasIndicador.find((p) => p.dominios.includes(entrada.dominioId));
  return porDominio ?? plantillasIndicador[plantillasIndicador.length - 1]!;
}
