/**
 * Utilidades de fecha del Roadmap (POC-06, 6.8 y 15).
 * Se trabaja con fechas ISO cortas (AAAA-MM-DD) para evitar desfases de zona.
 */

export function hoyISO(): string {
  return aISO(new Date());
}

export function aISO(fecha: Date): string {
  const y = fecha.getUTCFullYear();
  const m = String(fecha.getUTCMonth() + 1).padStart(2, "0");
  const d = String(fecha.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function desdeISO(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

export function sumarDias(iso: string, dias: number): string {
  const fecha = desdeISO(iso);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return aISO(fecha);
}

export function diferenciaDias(desde: string, hasta: string): number {
  const ms = desdeISO(hasta).getTime() - desdeISO(desde).getTime();
  return Math.round(ms / 86_400_000);
}

const MESES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

export function formatearFecha(iso: string | null): string {
  if (!iso) return "Sin fecha";
  const fecha = desdeISO(iso);
  return `${fecha.getUTCDate()} ${MESES[fecha.getUTCMonth()]} ${fecha.getUTCFullYear()}`;
}

export function formatearFechaHora(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  const dia = String(fecha.getDate()).padStart(2, "0");
  const hora = String(fecha.getHours()).padStart(2, "0");
  const min = String(fecha.getMinutes()).padStart(2, "0");
  return `${dia} ${MESES[fecha.getMonth()]} ${fecha.getFullYear()} · ${hora}:${min}`;
}

/** Etiqueta de mes usada por el cronograma simplificado. */
export function etiquetaMes(iso: string): string {
  const fecha = desdeISO(iso);
  return `${MESES[fecha.getUTCMonth()]} ${String(fecha.getUTCFullYear()).slice(2)}`;
}

export function primerDiaDeMes(iso: string): string {
  const fecha = desdeISO(iso);
  return aISO(new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), 1)));
}

export function sumarMeses(iso: string, meses: number): string {
  const fecha = desdeISO(iso);
  return aISO(
    new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth() + meses, fecha.getUTCDate()))
  );
}
