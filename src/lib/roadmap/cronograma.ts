/**
 * Cronograma simplificado (POC-06, sección 11).
 * Proyecta las acciones sobre una escala mensual y separa las no programadas.
 */

import { accionesDeFase } from "./filtros";
import { fasesRoadmap } from "./fases";
import { desdeISO, etiquetaMes, hoyISO, primerDiaDeMes, sumarMeses } from "./fechas";
import type { AccionRoadmap, FaseRoadmap, Roadmap } from "./tipos";

export interface ColumnaMes {
  clave: string;
  etiqueta: string;
  inicio: string;
  fin: string;
}

export interface BarraCronograma {
  accion: AccionRoadmap;
  /** Porcentaje de desplazamiento y ancho sobre la escala total (0–100). */
  offset: number;
  ancho: number;
  referenciaDependencias: string[];
}

export interface GrupoCronograma {
  fase: FaseRoadmap;
  barras: BarraCronograma[];
}

export interface Cronograma {
  meses: ColumnaMes[];
  grupos: GrupoCronograma[];
  porProgramar: AccionRoadmap[];
  marcadorHoy: number | null;
}

function limites(acciones: AccionRoadmap[], hoy: string): { inicio: string; fin: string } {
  const fechas = acciones.flatMap((a) => [a.fechaInicio, a.fechaObjetivo]).filter(
    (f): f is string => Boolean(f)
  );
  const min = fechas.length > 0 ? fechas.reduce((a, b) => (a < b ? a : b)) : hoy;
  const max = fechas.length > 0 ? fechas.reduce((a, b) => (a > b ? a : b)) : sumarMeses(hoy, 3);
  return { inicio: primerDiaDeMes(min < hoy ? min : hoy), fin: max };
}

function proporcion(fecha: string, inicio: string, fin: string): number {
  const total = desdeISO(fin).getTime() - desdeISO(inicio).getTime();
  if (total <= 0) return 0;
  const valor = desdeISO(fecha).getTime() - desdeISO(inicio).getTime();
  return Math.max(0, Math.min(100, (valor / total) * 100));
}

export function construirCronograma(roadmap: Roadmap, hoy = hoyISO()): Cronograma {
  const programables = roadmap.acciones.filter(
    (a) => a.estado !== "DESCARTADA" && a.fechaInicio && a.fechaObjetivo
  );
  const porProgramar = roadmap.acciones.filter(
    (a) => a.estado !== "DESCARTADA" && (!a.fechaInicio || !a.fechaObjetivo)
  );

  const { inicio, fin } = limites(programables, hoy);
  const finAjustado = fin <= inicio ? sumarMeses(inicio, 3) : fin;

  const meses: ColumnaMes[] = [];
  let cursor = primerDiaDeMes(inicio);
  let guardas = 0;
  while (cursor <= finAjustado && guardas < 24) {
    const siguiente = sumarMeses(cursor, 1);
    meses.push({
      clave: cursor,
      etiqueta: etiquetaMes(cursor),
      inicio: cursor,
      fin: siguiente,
    });
    cursor = siguiente;
    guardas += 1;
  }

  const escalaFin = meses.length > 0 ? meses[meses.length - 1]!.fin : finAjustado;

  const grupos: GrupoCronograma[] = fasesRoadmap.map((fase) => ({
    fase,
    barras: accionesDeFase(roadmap, fase.id)
      .filter((accion) => accion.fechaInicio && accion.fechaObjetivo)
      .map((accion) => {
        const offset = proporcion(accion.fechaInicio!, inicio, escalaFin);
        const finBarra = proporcion(accion.fechaObjetivo!, inicio, escalaFin);
        return {
          accion,
          offset,
          ancho: Math.max(4, finBarra - offset),
          referenciaDependencias: accion.dependencias
            .map((id) => roadmap.acciones.find((a) => a.id === id)?.titulo)
            .filter((titulo): titulo is string => Boolean(titulo)),
        };
      }),
  }));

  const marcadorHoy =
    hoy >= inicio && hoy <= escalaFin ? proporcion(hoy, inicio, escalaFin) : null;

  return { meses, grupos, porProgramar, marcadorHoy };
}
