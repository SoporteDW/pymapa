/**
 * Registro de fuente raw histórica (M2-FACTORY-01 · B2).
 *
 *   original (DOCX/PDF/TXT) → SHA-256 → texto extraído determinista
 *   → registro sellado (identidad, extractor, outline, métricas)
 *
 * INVARIANTES:
 * - El original se preserva byte a byte; su SHA-256 fija la identidad.
 * - La extracción es determinista: mismos bytes + mismo extractor → mismo texto.
 * - El texto extraído es citable por línea (1-based); el outline de headings
 *   apunta a líneas estables.
 * - La extracción raw NO es conocimiento canónico: no interpreta, completa,
 *   resume ni normaliza contenido.
 * - Sin branching por capacidad: el registro es idéntico para toda fuente.
 */
import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import { z } from "zod";
import { computeSelfChecksum, verifySelfChecksum } from "./checksum.ts";

export const RAW_EXTRACTION_STATEMENT =
  "RAW_EXTRACTION_IS_NOT_CANONICAL_KNOWLEDGE: texto extraído mecánicamente del original para citación y provenance; no constituye conocimiento aprobado.";

export const DOCX_EXTRACTOR = { id: "pymapa-docx-text", version: "1.0.0" } as const;
export const TEXT_EXTRACTOR = { id: "pymapa-plain-text", version: "1.0.0" } as const;
export const PDF_EXTRACTOR = { id: "poppler-pdftotext", version: "1.0.0" } as const;

export const RAW_MEDIA_TYPES = ["DOCX", "PDF", "TEXT"] as const;
export type RawMediaType = (typeof RAW_MEDIA_TYPES)[number];

export function sha256Bytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function detectMediaType(filename: string, bytes: Uint8Array): RawMediaType | null {
  const lower = filename.toLowerCase();
  const zip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  const pdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  if (lower.endsWith(".docx") && zip) return "DOCX";
  if (lower.endsWith(".pdf") && pdf) return "PDF";
  if ((lower.endsWith(".txt") || lower.endsWith(".md")) && !zip && !pdf) return "TEXT";
  return null;
}

/* ------------------------------------------------------------------ */
/* ZIP (solo lectura, métodos 0 y 8)                                   */
/* ------------------------------------------------------------------ */

export function readZipEntries(bytes: Uint8Array): Map<string, Uint8Array> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder("utf-8");
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("ZIP_EOCD_NOT_FOUND");
  const total = view.getUint16(eocd + 10, true);
  let ptr = view.getUint32(eocd + 16, true);
  const entries = new Map<string, Uint8Array>();
  for (let n = 0; n < total; n += 1) {
    if (view.getUint32(ptr, true) !== 0x02014b50) throw new Error("ZIP_CENTRAL_DIRECTORY_CORRUPT");
    const flags = view.getUint16(ptr + 8, true);
    const method = view.getUint16(ptr + 10, true);
    const compressedSize = view.getUint32(ptr + 20, true);
    const nameLen = view.getUint16(ptr + 28, true);
    const extraLen = view.getUint16(ptr + 30, true);
    const commentLen = view.getUint16(ptr + 32, true);
    const localOffset = view.getUint32(ptr + 42, true);
    const name = decoder.decode(bytes.subarray(ptr + 46, ptr + 46 + nameLen));
    if (flags & 0x1) throw new Error(`ZIP_ENCRYPTED_ENTRY ${name}`);
    if (compressedSize === 0xffffffff || localOffset === 0xffffffff)
      throw new Error("ZIP64_NOT_SUPPORTED");
    if (view.getUint32(localOffset, true) !== 0x04034b50)
      throw new Error(`ZIP_LOCAL_HEADER_CORRUPT ${name}`);
    const lNameLen = view.getUint16(localOffset + 26, true);
    const lExtraLen = view.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + lNameLen + lExtraLen;
    const data = bytes.subarray(start, start + compressedSize);
    if (method === 0) entries.set(name, data);
    else if (method === 8) entries.set(name, new Uint8Array(inflateRawSync(data)));
    else throw new Error(`ZIP_METHOD_NOT_SUPPORTED ${method} ${name}`);
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

/* ------------------------------------------------------------------ */
/* XML tokenizer mínimo (sin DTD)                                       */
/* ------------------------------------------------------------------ */

interface XmlToken {
  kind: "open" | "close" | "text";
  name: string;
  attrs: Record<string, string>;
  selfClosing: boolean;
  text: string;
}

const TOKEN_RE =
  /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[([\s\S]*?)\]\]>|<(\/?)([A-Za-z_][\w.:-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>|([^<]+)/g;
const ATTR_RE = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

export function decodeXmlEntities(s: string): string {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|lt|gt|amp|quot|apos);/g, (_m, e: string) => {
    if (e === "lt") return "<";
    if (e === "gt") return ">";
    if (e === "amp") return "&";
    if (e === "quot") return '"';
    if (e === "apos") return "'";
    const code = e.startsWith("#x") ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return String.fromCodePoint(code);
  });
}

function* tokens(xml: string): Generator<XmlToken> {
  TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(xml)) !== null) {
    if (m[1] !== undefined) {
      yield { kind: "text", name: "", attrs: {}, selfClosing: false, text: m[1] };
    } else if (m[3] !== undefined) {
      const attrs: Record<string, string> = {};
      if (m[4]) {
        ATTR_RE.lastIndex = 0;
        let a: RegExpExecArray | null;
        while ((a = ATTR_RE.exec(m[4])) !== null) {
          attrs[a[1] as string] = decodeXmlEntities(a[2] ?? a[3] ?? "");
        }
      }
      yield {
        kind: m[2] === "/" ? "close" : "open",
        name: m[3],
        attrs,
        selfClosing: m[5] === "/",
        text: "",
      };
    } else if (m[6] !== undefined) {
      yield {
        kind: "text",
        name: "",
        attrs: {},
        selfClosing: false,
        text: decodeXmlEntities(m[6]),
      };
    }
  }
}

/* ------------------------------------------------------------------ */
/* DOCX                                                                */
/* ------------------------------------------------------------------ */

interface StyleInfo {
  name: string | null;
  outlineLevel: number | null;
  basedOn: string | null;
}

function parseStyles(xml: string | null): Map<string, StyleInfo> {
  const styles = new Map<string, StyleInfo>();
  if (!xml) return styles;
  let current: { id: string; info: StyleInfo } | null = null;
  for (const t of tokens(xml)) {
    if (t.kind === "open" && t.name === "w:style") {
      const type = t.attrs["w:type"];
      const id = t.attrs["w:styleId"];
      current =
        type === "paragraph" && id
          ? { id, info: { name: null, outlineLevel: null, basedOn: null } }
          : null;
      if (t.selfClosing) current = null;
    } else if (t.kind === "close" && t.name === "w:style") {
      if (current) styles.set(current.id, current.info);
      current = null;
    } else if (current && t.kind === "open") {
      if (t.name === "w:name") current.info.name = t.attrs["w:val"] ?? null;
      if (t.name === "w:basedOn") current.info.basedOn = t.attrs["w:val"] ?? null;
      if (t.name === "w:outlineLvl") {
        const v = Number(t.attrs["w:val"]);
        if (Number.isInteger(v)) current.info.outlineLevel = v;
      }
    }
  }
  return styles;
}

function headingLevel(
  styleId: string | null,
  directOutline: number | null,
  styles: Map<string, StyleInfo>,
): number | null {
  if (directOutline !== null)
    return directOutline >= 0 && directOutline <= 8 ? directOutline + 1 : null;
  let id = styleId;
  for (let depth = 0; id && depth < 10; depth += 1) {
    const s = styles.get(id);
    const name = (s?.name ?? id).toLowerCase();
    const byName = /^heading\s*([1-9])$/.exec(name);
    if (byName) return Number(byName[1]);
    if (name === "title") return 1;
    if (s?.outlineLevel !== null && s?.outlineLevel !== undefined)
      return s.outlineLevel >= 0 && s.outlineLevel <= 8 ? s.outlineLevel + 1 : null;
    id = s?.basedOn ?? null;
  }
  return null;
}

export interface OutlineEntry {
  line: number;
  level: number;
  text: string;
}

export interface RawExtraction {
  mediaType: RawMediaType;
  extractor: { id: string; version: string };
  externalTool: { name: string; version: string } | null;
  status: "EXTRACTED" | "EXTRACTOR_UNAVAILABLE" | "FAILED";
  text: string | null;
  outline: OutlineEntry[];
  pageStartLines: number[];
  warnings: string[];
  stats: Record<string, number>;
}

/**
 * Convención del texto DOCX (determinista, documentada en el registro):
 * - un párrafo por línea; párrafos vacíos → línea vacía;
 * - heading nivel N → "#"×N + " " + texto;
 * - elemento de lista → "  "×nivel + "- " + texto;
 * - fila de tabla → "| celda | celda |" (párrafos de celda unidos por espacio);
 * - w:tab → "\t"; w:br / w:cr → salto de línea;
 * - cambios con seguimiento: se conserva lo insertado y se omite lo eliminado;
 * - notas al pie / al final se añaden tras el cuerpo con encabezado literal
 *   "[[FOOTNOTES]]" / "[[ENDNOTES]]" y su identificador entre corchetes.
 */
export function extractDocxText(bytes: Uint8Array): RawExtraction {
  const entries = readZipEntries(bytes);
  const decoder = new TextDecoder("utf-8");
  const read = (name: string) => {
    const e = entries.get(name);
    return e ? decoder.decode(e) : null;
  };
  const documentXml = read("word/document.xml");
  if (!documentXml) throw new Error("DOCX_DOCUMENT_XML_MISSING");
  const styles = parseStyles(read("word/styles.xml"));
  const stats: Record<string, number> = {
    paragraphs: 0,
    headings: 0,
    listItems: 0,
    tables: 0,
    tableRows: 0,
    images: 0,
    insertions: 0,
    deletions: 0,
    footnotes: 0,
    endnotes: 0,
    textBoxes: 0,
    fallbackBlocksSkipped: 0,
  };
  const lines: string[] = [];
  const outline: OutlineEntry[] = [];

  const walk = (xml: string, mode: "body" | "notes", noteTag?: string) => {
    interface Para {
      parts: string[];
      styleId: string | null;
      outline: number | null;
      list: boolean;
      ilvl: number;
    }
    const paraStack: Para[] = [];
    let inPPr = 0;
    let inText = false;
    let inDel = 0;
    let inFallback = 0;
    let tableDepth = 0;
    let row: string[] | null = null;
    let cell: string[] | null = null;
    let noteId: string | null = null;
    let noteParts: string[] = [];

    const emitLine = (line: string) => {
      for (const l of line.split("\n")) lines.push(l);
    };

    for (const t of tokens(xml)) {
      if (inFallback > 0) {
        if (t.kind === "open" && t.name === "mc:Fallback" && !t.selfClosing) inFallback += 1;
        if (t.kind === "close" && t.name === "mc:Fallback") inFallback -= 1;
        continue;
      }
      const para = paraStack[paraStack.length - 1];
      if (t.kind === "text") {
        if (inText && para && inDel === 0) para.parts.push(t.text);
        continue;
      }
      if (t.kind === "open") {
        switch (t.name) {
          case "mc:Fallback":
            if (!t.selfClosing) {
              inFallback = 1;
              stats["fallbackBlocksSkipped"] = (stats["fallbackBlocksSkipped"] ?? 0) + 1;
            }
            break;
          case "w:footnote":
          case "w:endnote": {
            const type = t.attrs["w:type"];
            noteId =
              type === "separator" ||
              type === "continuationSeparator" ||
              type === "continuationNotice"
                ? null
                : (t.attrs["w:id"] ?? null);
            noteParts = [];
            break;
          }
          case "w:p":
            if (!t.selfClosing)
              paraStack.push({ parts: [], styleId: null, outline: null, list: false, ilvl: 0 });
            else if (tableDepth === 0 && mode === "body") emitLine("");
            break;
          case "w:pPr":
            if (!t.selfClosing) inPPr += 1;
            break;
          case "w:pStyle":
            if (para && inPPr > 0) para.styleId = t.attrs["w:val"] ?? null;
            break;
          case "w:outlineLvl":
            if (para && inPPr > 0) {
              const v = Number(t.attrs["w:val"]);
              if (Number.isInteger(v)) para.outline = v;
            }
            break;
          case "w:numPr":
            if (para && inPPr > 0) para.list = true;
            break;
          case "w:ilvl":
            if (para && inPPr > 0) para.ilvl = Number(t.attrs["w:val"] ?? 0) || 0;
            break;
          case "w:t":
            if (!t.selfClosing) inText = true;
            break;
          case "w:tab":
            if (para && inPPr === 0 && inDel === 0) para.parts.push("\t");
            break;
          case "w:br":
          case "w:cr":
            if (para && inPPr === 0 && inDel === 0) para.parts.push("\n");
            break;
          case "w:noBreakHyphen":
            if (para && inDel === 0) para.parts.push("\u2011");
            break;
          case "w:del":
            if (!t.selfClosing) {
              inDel += 1;
              stats["deletions"] = (stats["deletions"] ?? 0) + 1;
            }
            break;
          case "w:ins":
            if (!t.selfClosing) stats["insertions"] = (stats["insertions"] ?? 0) + 1;
            break;
          case "w:drawing":
          case "w:pict":
            stats["images"] = (stats["images"] ?? 0) + 1;
            break;
          case "w:txbxContent":
            stats["textBoxes"] = (stats["textBoxes"] ?? 0) + 1;
            break;
          case "w:footnoteReference":
          case "w:endnoteReference":
            if (para && t.attrs["w:id"]) para.parts.push(`[${t.attrs["w:id"]}]`);
            break;
          case "w:tbl":
            if (!t.selfClosing) {
              tableDepth += 1;
              if (tableDepth === 1) stats["tables"] = (stats["tables"] ?? 0) + 1;
            }
            break;
          case "w:tr":
            if (tableDepth === 1 && !t.selfClosing) row = [];
            break;
          case "w:tc":
            if (tableDepth === 1 && !t.selfClosing) cell = [];
            break;
          default:
            break;
        }
        continue;
      }
      // close
      switch (t.name) {
        case "w:pPr":
          inPPr = Math.max(0, inPPr - 1);
          break;
        case "w:t":
          inText = false;
          break;
        case "w:del":
          inDel = Math.max(0, inDel - 1);
          break;
        case "w:p": {
          const p = paraStack.pop();
          if (!p) break;
          const text = p.parts.join("");
          stats["paragraphs"] = (stats["paragraphs"] ?? 0) + 1;
          if (mode === "notes") {
            if (noteId !== null) noteParts.push(text);
            break;
          }
          if (tableDepth > 0 || paraStack.length > 0) {
            if (tableDepth > 0 && cell && text.length > 0) cell.push(text.replace(/\n/g, " "));
            else if (tableDepth === 0 && text.length > 0) emitLine(text);
            break;
          }
          const level = headingLevel(p.styleId, p.outline, styles);
          if (level !== null && text.trim().length > 0) {
            stats["headings"] = (stats["headings"] ?? 0) + 1;
            outline.push({ line: lines.length + 1, level, text: text.replace(/\n/g, " ") });
            emitLine(`${"#".repeat(level)} ${text.replace(/\n/g, " ")}`);
          } else if (p.list && text.length > 0) {
            stats["listItems"] = (stats["listItems"] ?? 0) + 1;
            emitLine(`${"  ".repeat(p.ilvl)}- ${text}`);
          } else {
            emitLine(text);
          }
          break;
        }
        case "w:tc":
          if (tableDepth === 1 && row && cell) row.push(cell.join(" "));
          if (tableDepth === 1) cell = null;
          break;
        case "w:tr":
          if (tableDepth === 1 && row) {
            stats["tableRows"] = (stats["tableRows"] ?? 0) + 1;
            emitLine(`| ${row.join(" | ")} |`);
          }
          if (tableDepth === 1) row = null;
          break;
        case "w:tbl":
          tableDepth = Math.max(0, tableDepth - 1);
          break;
        case "w:footnote":
        case "w:endnote":
          if (noteId !== null) {
            const key = noteTag === "footnotes" ? "footnotes" : "endnotes";
            stats[key] = (stats[key] ?? 0) + 1;
            emitLine(`[${noteId}] ${noteParts.join(" ")}`);
          }
          noteId = null;
          break;
        default:
          break;
      }
    }
  };

  walk(documentXml, "body");
  for (const [part, tag, header] of [
    ["word/footnotes.xml", "footnotes", "[[FOOTNOTES]]"],
    ["word/endnotes.xml", "endnotes", "[[ENDNOTES]]"],
  ] as const) {
    const xml = read(part);
    if (!xml) continue;
    const before = lines.length;
    lines.push(header);
    walk(xml, "notes", tag);
    if (lines.length === before + 1) lines.pop();
  }

  const warnings: string[] = [];
  if ((stats["images"] ?? 0) > 0)
    warnings.push(
      `IMAGES_NOT_TRANSCRIBED: ${stats["images"]} imagen(es)/dibujo(s) sin texto extraíble; su contenido no forma parte del texto raw.`,
    );
  if ((stats["deletions"] ?? 0) > 0 || (stats["insertions"] ?? 0) > 0)
    warnings.push(
      `TRACKED_CHANGES_PRESENT: ${stats["insertions"]} inserción(es) conservadas, ${stats["deletions"]} eliminación(es) omitidas; revisar si el original debía aceptarse antes de registrar.`,
    );
  if ((stats["textBoxes"] ?? 0) > 0)
    warnings.push(
      `TEXT_BOXES_PRESENT: ${stats["textBoxes"]} cuadro(s) de texto emitidos en línea antes del párrafo que los contiene.`,
    );
  if ((stats["headings"] ?? 0) === 0)
    warnings.push(
      "NO_HEADINGS_DETECTED: el documento no declara estilos de heading; el outline queda vacío.",
    );

  return {
    mediaType: "DOCX",
    extractor: { ...DOCX_EXTRACTOR },
    externalTool: null,
    status: "EXTRACTED",
    text: `${lines.join("\n")}\n`,
    outline,
    pageStartLines: [],
    warnings,
    stats,
  };
}

export function extractPlainText(bytes: Uint8Array): RawExtraction {
  let text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  text = text.replace(/\r\n?/g, "\n");
  if (!text.endsWith("\n")) text = `${text}\n`;
  const outline: OutlineEntry[] = [];
  text.split("\n").forEach((l, i) => {
    const m = /^(#{1,9}) (\S.*)$/.exec(l);
    if (m) outline.push({ line: i + 1, level: (m[1] as string).length, text: m[2] as string });
  });
  return {
    mediaType: "TEXT",
    extractor: { ...TEXT_EXTRACTOR },
    externalTool: null,
    status: "EXTRACTED",
    text,
    outline,
    pageStartLines: [],
    warnings: [],
    stats: { lines: text.split("\n").length },
  };
}

/** Ejecutor externo inyectable (el pipeline no lanza procesos por sí mismo). */
export interface PdfTextRunner {
  /** Versión reportada por la herramienta, o null si no está disponible. */
  version(): string | null;
  /** Texto UTF-8 con saltos de página "\f" (pdftotext -layout -enc UTF-8). */
  extract(bytes: Uint8Array): string;
}

export function extractPdfText(bytes: Uint8Array, runner: PdfTextRunner | null): RawExtraction {
  const version = runner?.version() ?? null;
  if (!runner || !version) {
    return {
      mediaType: "PDF",
      extractor: { ...PDF_EXTRACTOR },
      externalTool: null,
      status: "EXTRACTOR_UNAVAILABLE",
      text: null,
      outline: [],
      pageStartLines: [],
      warnings: [
        "EXTRACTOR_UNAVAILABLE: pdftotext no disponible; el original se registra pero no hay texto citable.",
      ],
      stats: {},
    };
  }
  const raw = runner.extract(bytes).replace(/\r\n?/g, "\n");
  const pages = raw.split("\f");
  if (pages.length > 1 && pages[pages.length - 1]?.trim() === "") pages.pop();
  const lines: string[] = [];
  const pageStartLines: number[] = [];
  for (const page of pages) {
    pageStartLines.push(lines.length + 1);
    const pl = page.split("\n");
    if (pl.length > 1 && pl[pl.length - 1] === "") pl.pop();
    lines.push(...pl);
  }
  return {
    mediaType: "PDF",
    extractor: { ...PDF_EXTRACTOR },
    externalTool: { name: "pdftotext", version },
    status: "EXTRACTED",
    text: `${lines.join("\n")}\n`,
    outline: [],
    pageStartLines,
    warnings: [
      "PDF_TEXT_LAYER: el orden de lectura y las tablas dependen de la capa de texto del PDF; los headings no son detectables y el outline queda vacío.",
    ],
    stats: { pages: pages.length },
  };
}

export function extractRawSource(input: {
  filename: string;
  bytes: Uint8Array;
  pdfRunner?: PdfTextRunner | null;
}): RawExtraction {
  const mediaType = detectMediaType(input.filename, input.bytes);
  if (!mediaType) throw new Error(`UNSUPPORTED_MEDIA_TYPE ${input.filename}`);
  if (mediaType === "DOCX") return extractDocxText(input.bytes);
  if (mediaType === "PDF") return extractPdfText(input.bytes, input.pdfRunner ?? null);
  return extractPlainText(input.bytes);
}

/* ------------------------------------------------------------------ */
/* Registro                                                            */
/* ------------------------------------------------------------------ */

const sha = z.string().regex(/^[0-9a-f]{64}$/);

export const rawSourceRegistrationSchema = z.object({
  $schema: z.string().optional(),
  registrationId: z.string().min(1),
  capabilityId: z.string().regex(/^[A-Z]{2}-\d{2}$/),
  domainId: z.string().regex(/^[A-Z]{2}$/),
  masterVersion: z.string().min(1),
  status: z.literal("REGISTERED"),
  statement: z.literal(RAW_EXTRACTION_STATEMENT),
  original: z.object({
    filename: z.string().min(1),
    ref: z.string().min(1),
    mediaType: z.enum(RAW_MEDIA_TYPES),
    byteLength: z.number().int().positive(),
    sha256: sha,
  }),
  extraction: z.object({
    extractorId: z.string().min(1),
    extractorVersion: z.string().min(1),
    externalTool: z.object({ name: z.string().min(1), version: z.string().min(1) }).nullable(),
    status: z.enum(["EXTRACTED", "EXTRACTOR_UNAVAILABLE", "FAILED"]),
    warnings: z.array(z.string()),
    stats: z.record(z.string(), z.number()),
  }),
  text: z
    .object({
      ref: z.string().min(1),
      sha256: sha,
      byteLength: z.number().int().nonnegative(),
      lineCount: z.number().int().positive(),
    })
    .nullable(),
  outline: z.array(
    z.object({
      line: z.number().int().positive(),
      level: z.number().int().min(1).max(9),
      text: z.string().min(1),
    }),
  ),
  pageStartLines: z.array(z.number().int().positive()),
  /** Marcador histórico declarado por el operador; debe aparecer literal en el texto. */
  declaredHistoricalMarker: z
    .object({ text: z.string().min(1), lines: z.array(z.number().int().positive()) })
    .nullable(),
  registeredAt: z.string().min(1),
  /**
   * Segmento de una fuente multi-capacidad (M2-BATCH-02). El texto registrado
   * es el tramo [fromLine, toLine] (1-based, inclusivo) del texto completo
   * extraído del original; la numeración de líneas del texto es la del tramo.
   */
  segment: z
    .object({
      rule: z.string().min(1),
      fullTextSha256: sha,
      fullTextLineCount: z.number().int().positive(),
      fromLine: z.number().int().positive(),
      toLine: z.number().int().positive(),
      boundaryEvidence: z.object({ text: z.string().min(1), line: z.number().int().positive() }),
    })
    .optional(),
  checksum: z.string().regex(/^sha256:[0-9a-f]{64}$/),
});
export type RawSourceRegistration = z.infer<typeof rawSourceRegistrationSchema>;

export function findLiteralLines(text: string, needle: string): number[] {
  const out: number[] = [];
  text.split("\n").forEach((l, i) => {
    if (l.includes(needle)) out.push(i + 1);
  });
  return out;
}

export function buildRawSourceRegistration(input: {
  capabilityId: string;
  domainId: string;
  masterVersion: string;
  filename: string;
  originalRef: string;
  textRef: string;
  bytes: Uint8Array;
  extraction: RawExtraction;
  historicalMarker?: string | null;
  registeredAt: string;
}): RawSourceRegistration {
  const text = input.extraction.text;
  const textBytes = text === null ? null : new TextEncoder().encode(text);
  const marker = input.historicalMarker ?? null;
  const body: Omit<RawSourceRegistration, "checksum"> = {
    registrationId: `RAW-${input.capabilityId}-${sha256Bytes(input.bytes).slice(0, 12)}`,
    capabilityId: input.capabilityId,
    domainId: input.domainId,
    masterVersion: input.masterVersion,
    status: "REGISTERED",
    statement: RAW_EXTRACTION_STATEMENT,
    original: {
      filename: input.filename,
      ref: input.originalRef,
      mediaType: input.extraction.mediaType,
      byteLength: input.bytes.byteLength,
      sha256: sha256Bytes(input.bytes),
    },
    extraction: {
      extractorId: input.extraction.extractor.id,
      extractorVersion: input.extraction.extractor.version,
      externalTool: input.extraction.externalTool,
      status: input.extraction.status,
      warnings: input.extraction.warnings,
      stats: input.extraction.stats,
    },
    text:
      text === null || textBytes === null
        ? null
        : {
            ref: input.textRef,
            sha256: sha256Bytes(textBytes),
            byteLength: textBytes.byteLength,
            lineCount: text.split("\n").length,
          },
    outline: input.extraction.outline,
    pageStartLines: input.extraction.pageStartLines,
    declaredHistoricalMarker:
      marker === null
        ? null
        : { text: marker, lines: text === null ? [] : findLiteralLines(text, marker) },
    registeredAt: input.registeredAt,
  };
  return { ...body, checksum: computeSelfChecksum(body as Record<string, unknown>) };
}

export type RawRegistrationIssueCode =
  | "SCHEMA"
  | "CHECKSUM"
  | "IDENTITY"
  | "ORIGINAL_MISSING"
  | "ORIGINAL_INTEGRITY"
  | "TEXT_MISSING"
  | "TEXT_INTEGRITY"
  | "NON_DETERMINISTIC_EXTRACTION"
  | "OUTLINE_NOT_ANCHORED"
  | "HISTORICAL_MARKER_NOT_FOUND"
  | "EXTRACTOR_UNAVAILABLE"
  | "EXTRACTION_WARNING";

export interface RawRegistrationIssue {
  code: RawRegistrationIssueCode;
  /** INFO se reporta pero no altera la clasificación de la capacidad. */
  severity: "FAIL" | "REVIEW" | "INFO";
  message: string;
}

export interface RawRegistrationVerification {
  ok: boolean;
  registration: RawSourceRegistration | null;
  issues: RawRegistrationIssue[];
  /** true si el texto se re-extrajo del original y coincidió byte a byte. */
  reextractionVerified: boolean;
}

/**
 * Verificación reproducible: identidad del original, identidad del texto,
 * re-extracción determinista (extractores internos) y anclaje del outline.
 */
export function verifyRawSourceRegistration(input: {
  registration: unknown;
  expectedCapabilityId?: string;
  originalBytes: Uint8Array | null;
  textBytes: Uint8Array | null;
  pdfRunner?: PdfTextRunner | null;
}): RawRegistrationVerification {
  const issues: RawRegistrationIssue[] = [];
  const parsed = rawSourceRegistrationSchema.safeParse(input.registration);
  if (!parsed.success) {
    return {
      ok: false,
      registration: null,
      reextractionVerified: false,
      issues: parsed.error.issues.map((i) => ({
        code: "SCHEMA" as const,
        severity: "FAIL" as const,
        message: `${i.path.join(".")}: ${i.message}`,
      })),
    };
  }
  const reg = parsed.data;
  const self = verifySelfChecksum(input.registration as Record<string, unknown>);
  if (!self.ok)
    issues.push({
      code: "CHECKSUM",
      severity: "FAIL",
      message: `checksum del registro inválido (esperado ${self.expected})`,
    });
  if (input.expectedCapabilityId && reg.capabilityId !== input.expectedCapabilityId)
    issues.push({
      code: "IDENTITY",
      severity: "FAIL",
      message: `el registro declara ${reg.capabilityId}, esperado ${input.expectedCapabilityId}`,
    });

  let reextractionVerified = false;
  if (!input.originalBytes) {
    issues.push({
      code: "ORIGINAL_MISSING",
      severity: "FAIL",
      message: `falta el original ${reg.original.ref}`,
    });
  } else {
    const hash = sha256Bytes(input.originalBytes);
    if (
      hash !== reg.original.sha256 ||
      input.originalBytes.byteLength !== reg.original.byteLength
    ) {
      issues.push({
        code: "ORIGINAL_INTEGRITY",
        severity: "FAIL",
        message: `el original ${reg.original.ref} cambió (sha256 ${hash}, registrado ${reg.original.sha256}); un original registrado es inmutable: registrar una nueva versión en su lugar`,
      });
    }
  }

  if (reg.extraction.status === "EXTRACTOR_UNAVAILABLE") {
    issues.push({
      code: "EXTRACTOR_UNAVAILABLE",
      severity: "REVIEW",
      message:
        "sin texto citable: registrar con el extractor disponible antes de extraer candidatos",
    });
  }

  let text: string | null = null;
  if (reg.text) {
    if (!input.textBytes) {
      issues.push({
        code: "TEXT_MISSING",
        severity: "FAIL",
        message: `falta el texto extraído ${reg.text.ref}`,
      });
    } else {
      const hash = sha256Bytes(input.textBytes);
      if (hash !== reg.text.sha256) {
        issues.push({
          code: "TEXT_INTEGRITY",
          severity: "FAIL",
          message: `el texto ${reg.text.ref} cambió (sha256 ${hash}, registrado ${reg.text.sha256})`,
        });
      } else {
        text = new TextDecoder("utf-8").decode(input.textBytes);
      }
    }
  }

  if (input.originalBytes && reg.text && !issues.some((i) => i.code === "ORIGINAL_INTEGRITY")) {
    const builtIn =
      reg.extraction.extractorId === DOCX_EXTRACTOR.id ||
      reg.extraction.extractorId === TEXT_EXTRACTOR.id;
    const canRun =
      builtIn || (input.pdfRunner?.version() ?? null) === reg.extraction.externalTool?.version;
    if (canRun) {
      const again = extractRawSource({
        filename: reg.original.filename,
        bytes: input.originalBytes,
        pdfRunner: input.pdfRunner ?? null,
      });
      const seg = reg.segment;
      const fullHash =
        again.text === null ? null : sha256Bytes(new TextEncoder().encode(again.text));
      const againHash =
        again.text === null
          ? null
          : seg
            ? fullHash === seg.fullTextSha256
              ? sha256Bytes(
                  new TextEncoder().encode(
                    again.text
                      .split("\n")
                      .slice(seg.fromLine - 1, seg.toLine)
                      .join("\n"),
                  ),
                )
              : null
            : fullHash;
      if (again.extractor.version !== reg.extraction.extractorVersion) {
        issues.push({
          code: "NON_DETERMINISTIC_EXTRACTION",
          severity: "REVIEW",
          message: `extractor ${reg.extraction.extractorId} ${reg.extraction.extractorVersion} ≠ disponible ${again.extractor.version}; re-registrar como nueva versión si se quiere cambiar de extractor`,
        });
      } else if (againHash !== reg.text.sha256) {
        issues.push({
          code: "NON_DETERMINISTIC_EXTRACTION",
          severity: "FAIL",
          message: `re-extraer el original no reproduce el texto registrado (${againHash} ≠ ${reg.text.sha256})`,
        });
      } else {
        reextractionVerified = true;
      }
    }
  }

  if (text !== null) {
    const lines = text.split("\n");
    for (const o of reg.outline) {
      const l = lines[o.line - 1];
      if (l === undefined || !l.includes(o.text))
        issues.push({
          code: "OUTLINE_NOT_ANCHORED",
          severity: "FAIL",
          message: `heading "${o.text}" no aparece en la línea ${o.line}`,
        });
    }
    const marker = reg.declaredHistoricalMarker;
    if (marker) {
      const found = findLiteralLines(text, marker.text);
      if (found.length === 0)
        issues.push({
          code: "HISTORICAL_MARKER_NOT_FOUND",
          severity: "REVIEW",
          message: `el marcador histórico declarado "${marker.text}" no aparece literal en el texto; no puede usarse como evidencia de cierre`,
        });
      else if (found.join(",") !== marker.lines.join(","))
        issues.push({
          code: "HISTORICAL_MARKER_NOT_FOUND",
          severity: "FAIL",
          message: `el marcador histórico aparece en ${found.join(",")} y el registro declara ${marker.lines.join(",")}`,
        });
    }
  }
  for (const w of reg.extraction.warnings) {
    issues.push({ code: "EXTRACTION_WARNING", severity: "INFO", message: w });
  }

  return {
    ok: !issues.some((i) => i.severity === "FAIL"),
    registration: reg,
    issues,
    reextractionVerified,
  };
}

/* ------------------------------------------------------------------ */
/* Fuentes multi-capacidad (M2-BATCH-02)                               */
/* ------------------------------------------------------------------ */

export const MULTI_CAPABILITY_SEGMENT_RULE =
  "K4_CLOSURE_AND_IDENTITY_HEADING_BOUNDARY: el tramo de la capacidad k+1 empieza en el primer heading «<ID k+1> · …» posterior a la última línea que declara literalmente <IDcompacto k>-K4-v<n> · K4-VALIDATED · CLOSED; el tramo k termina en la línea anterior (el cierre y el resumen posterior de k quedan en k; la primera capacidad incluye el preámbulo del dominio; la última extiende hasta el final del texto). No decide contenido ni canonicidad.";

export interface CapabilitySegment {
  capabilityId: string;
  fromLine: number;
  toLine: number;
  boundaryEvidence: { text: string; line: number };
}

/**
 * Segmentación determinista de un texto que contiene varias capacidades,
 * delimitada solo por los marcadores literales de cierre K4 de cada una.
 * Falla si falta un marcador o si los marcadores no están ordenados.
 */
export function segmentMultiCapabilityText(
  text: string,
  capabilityIds: string[],
): { ok: true; segments: CapabilitySegment[] } | { ok: false; reasons: string[] } {
  const lines = text.split("\n");
  const reasons: string[] = [];
  const ends: { id: string; line: number; text: string }[] = [];
  for (const id of capabilityIds) {
    const own = id.replace("-", "");
    const re = new RegExp(`^${own}-K4-v\\d+(?:\\.\\d+)* · K4-VALIDATED · CLOSED$`);
    const at = lines.flatMap((l, i) =>
      re.test(l.replace(/^#{1,9}\s+/, "").trim()) ? [i + 1] : [],
    );
    if (!at.length) reasons.push(`${id}: sin marcador literal de cierre K4`);
    else
      ends.push({
        id,
        line: at[at.length - 1] as number,
        text: (lines[(at[at.length - 1] as number) - 1] as string).replace(/^#{1,9}\s+/, "").trim(),
      });
  }
  for (let k = 1; k < ends.length; k += 1)
    if ((ends[k] as { line: number }).line <= (ends[k - 1] as { line: number }).line)
      reasons.push(
        `${ends[k]?.id}: marcador de cierre fuera de orden respecto de ${ends[k - 1]?.id}`,
      );
  const starts: number[] = [1];
  for (let k = 1; k < ends.length; k += 1) {
    const prev = (ends[k - 1] as { line: number }).line;
    const id = (ends[k] as { id: string }).id;
    const at = lines.findIndex(
      (l, i) =>
        i + 1 > prev && /^#{1,9}\s+/.test(l) && l.replace(/^#{1,9}\s+/, "").startsWith(`${id} · `),
    );
    if (at < 0 || at + 1 > (ends[k] as { line: number }).line)
      reasons.push(
        `${id}: sin heading de identidad «${id} · …» tras el cierre de ${ends[k - 1]?.id}`,
      );
    else starts.push(at + 1);
  }
  if (reasons.length) return { ok: false, reasons };
  return {
    ok: true,
    segments: ends.map((e, k) => ({
      capabilityId: e.id,
      fromLine: starts[k] as number,
      toLine: k === ends.length - 1 ? lines.length : (starts[k + 1] as number) - 1,
      boundaryEvidence: { text: e.text, line: e.line },
    })),
  };
}

/** Registro de un tramo de fuente multi-capacidad (original compartido e inmutable). */
export function buildSegmentRegistration(input: {
  capabilityId: string;
  domainId: string;
  masterVersion: string;
  filename: string;
  originalRef: string;
  textRef: string;
  bytes: Uint8Array;
  extraction: RawExtraction;
  segment: CapabilitySegment;
  registeredAt: string;
}): { registration: RawSourceRegistration; text: string } {
  const full = input.extraction.text as string;
  const all = full.split("\n");
  const seg = input.segment;
  const text = all.slice(seg.fromLine - 1, seg.toLine).join("\n");
  const shift = seg.fromLine - 1;
  const base = buildRawSourceRegistration({
    ...input,
    extraction: {
      ...input.extraction,
      text,
      outline: input.extraction.outline
        .filter((o) => o.line >= seg.fromLine && o.line <= seg.toLine)
        .map((o) => ({ ...o, line: o.line - shift })),
      pageStartLines: [],
    },
    historicalMarker: seg.boundaryEvidence.text,
  });
  const { checksum: _c, ...body } = base;
  const withSeg = {
    ...body,
    segment: {
      rule: MULTI_CAPABILITY_SEGMENT_RULE,
      fullTextSha256: sha256Bytes(new TextEncoder().encode(full)),
      fullTextLineCount: all.length,
      fromLine: seg.fromLine,
      toLine: seg.toLine,
      boundaryEvidence: seg.boundaryEvidence,
    },
  };
  return {
    registration: {
      ...withSeg,
      checksum: computeSelfChecksum(withSeg as Record<string, unknown>),
    } as RawSourceRegistration,
    text,
  };
}
