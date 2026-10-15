/**
 * Document-First · Extracción de texto real de un PDF (bytes → páginas → fragmentos).
 *
 * Funciona en navegador y en Workers (unpdf). No reconoce archivos por nombre,
 * hash ni metadatos: solo lee el contenido textual de cada página. Un PDF
 * escaneado (sin capa de texto) se informa como ilegible; no hay OCR aprobado.
 */

export const LIMITE_BYTES_PDF = 8 * 1024 * 1024;
export const LIMITE_PAGINAS_PDF = 30;
export const VERSION_EXTRACTOR = "df-pdf-text-1.0.0";

export interface LineaPagina {
  pagina: number;
  texto: string;
}

export interface FragmentoDocumento {
  /** Identificador estable dentro de la extracción: p<página>-f<índice>. */
  id: string;
  pagina: number;
  /** Encabezado de sección más cercano (si existe). */
  seccion: string | null;
  /** Texto literal de la fuente (oración o fila de tabla). */
  texto: string;
}

export interface DocumentoExtraido {
  extractorVersion: string;
  paginas: number;
  sha256: string;
  lineas: LineaPagina[];
  fragmentos: FragmentoDocumento[];
  /** Texto completo por página, para verificar citas literales. */
  textoPorPagina: Record<number, string>;
}

export type ErrorExtraccion =
  | "NO_ES_PDF"
  | "ARCHIVO_DEMASIADO_GRANDE"
  | "DEMASIADAS_PAGINAS"
  | "SIN_TEXTO_LEGIBLE"
  | "PDF_CORRUPTO";

export class ExtraccionError extends Error {
  constructor(public readonly codigo: ErrorExtraccion) {
    super(codigo);
  }
}

export function esPdf(bytes: Uint8Array): boolean {
  return bytes.length > 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const copia = new Uint8Array(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copia.buffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Normaliza para comparar reglas: minúsculas, sin tildes, espacios simples. */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

interface ItemTexto {
  str: string;
  transform: number[];
}

/** Reconstruye líneas por coordenada vertical y descarta encabezados/pies repetidos. */
export function construirLineas(paginas: ItemTexto[][]): LineaPagina[] {
  const porPagina: LineaPagina[][] = paginas.map((items, idx) => {
    const filas = new Map<number, { x: number; s: string }[]>();
    for (const it of items) {
      if (typeof it.str !== "string") continue;
      const y = Math.round(it.transform[5] ?? 0);
      const fila = filas.get(y) ?? [];
      fila.push({ x: it.transform[4] ?? 0, s: it.str });
      filas.set(y, fila);
    }
    return [...filas.keys()]
      .sort((a, b) => b - a)
      .map((y) => ({
        pagina: idx + 1,
        texto: filas
          .get(y)!
          .sort((a, b) => a.x - b.x)
          .map((o) => o.s)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim(),
      }))
      .filter((l) => l.texto.length > 0);
  });
  // Encabezados/pies: líneas idénticas (sin número final) presentes en ≥2 páginas.
  const conteo = new Map<string, number>();
  for (const pag of porPagina) {
    const vistas = new Set(pag.map((l) => l.texto.replace(/\s*\d+$/, "")));
    for (const v of vistas) conteo.set(v, (conteo.get(v) ?? 0) + 1);
  }
  const repetidas = new Set([...conteo].filter(([, n]) => n >= 2 && porPagina.length >= 2).map(([t]) => t));
  return porPagina.flat().filter((l) => !repetidas.has(l.texto.replace(/\s*\d+$/, "")));
}

const RE_SECCION = /^(\d{2}\s·\s.+|P\d\s·\s.+)$/;

/** Divide las líneas en fragmentos (oraciones) con página y sección. */
export function construirFragmentos(lineas: LineaPagina[]): FragmentoDocumento[] {
  const fragmentos: FragmentoDocumento[] = [];
  let seccion: string | null = null;
  const paginas = [...new Set(lineas.map((l) => l.pagina))];
  for (const pagina of paginas) {
    const delaPagina = lineas.filter((l) => l.pagina === pagina);
    let buffer = "";
    let idx = 0;
    const volcar = () => {
      const oraciones = buffer
        .split(/(?<=[.;])\s+(?=[A-ZÁÉÍÓÚÑ(¿0-9])/)
        .map((s) => s.trim())
        .filter((s) => s.length > 3);
      for (const o of oraciones) fragmentos.push({ id: `p${pagina}-f${idx++}`, pagina, seccion, texto: o });
      buffer = "";
    };
    for (const l of delaPagina) {
      if (RE_SECCION.test(l.texto)) {
        volcar();
        seccion = l.texto;
        continue;
      }
      buffer = buffer ? `${buffer} ${l.texto}` : l.texto;
    }
    volcar();
  }
  return fragmentos;
}

/** Lee los bytes reales del PDF cargado. */
export async function extraerPdf(bytes: Uint8Array): Promise<DocumentoExtraido> {
  if (!esPdf(bytes)) throw new ExtraccionError("NO_ES_PDF");
  if (bytes.length > LIMITE_BYTES_PDF) throw new ExtraccionError("ARCHIVO_DEMASIADO_GRANDE");
  const sha256 = await sha256Hex(bytes);
  const { getDocumentProxy } = await import("unpdf");
  let pdf: Awaited<ReturnType<typeof getDocumentProxy>>;
  try {
    pdf = await getDocumentProxy(new Uint8Array(bytes));
  } catch {
    throw new ExtraccionError("PDF_CORRUPTO");
  }
  if (pdf.numPages > LIMITE_PAGINAS_PDF) throw new ExtraccionError("DEMASIADAS_PAGINAS");
  const paginas: ItemTexto[][] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const contenido = await page.getTextContent();
    paginas.push((contenido.items as unknown[]).filter((it): it is ItemTexto => typeof (it as ItemTexto).str === "string"));
  }
  const lineas = construirLineas(paginas);
  if (lineas.reduce((n, l) => n + l.texto.length, 0) < 40) throw new ExtraccionError("SIN_TEXTO_LEGIBLE");
  const textoPorPagina: Record<number, string> = {};
  for (const l of lineas) textoPorPagina[l.pagina] = `${textoPorPagina[l.pagina] ?? ""} ${l.texto}`.trim();
  return {
    extractorVersion: VERSION_EXTRACTOR,
    paginas: pdf.numPages,
    sha256,
    lineas,
    fragmentos: construirFragmentos(lineas),
    textoPorPagina,
  };
}

export function mensajeErrorExtraccion(codigo: string): string {
  switch (codigo) {
    case "NO_ES_PDF":
      return "El archivo no es un PDF válido.";
    case "ARCHIVO_DEMASIADO_GRANDE":
      return "El archivo supera el tamaño máximo de 8 MB.";
    case "DEMASIADAS_PAGINAS":
      return `El documento supera ${LIMITE_PAGINAS_PDF} páginas.`;
    case "SIN_TEXTO_LEGIBLE":
      return "No encontramos texto legible. Si es un documento escaneado, súbelo en una versión con texto.";
    default:
      return "No pudimos leer el documento. Prueba con otra copia del archivo.";
  }
}
