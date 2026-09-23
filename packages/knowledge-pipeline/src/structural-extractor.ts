/**
 * Extractor estructural determinista de candidatos (M2-BATCH-01).
 *
 *   texto raw registrado → segmentación por headings con identificador →
 *   CANDIDATO clasificado solo por evidencia literal
 *
 * Es una herramienta genérica (DETERMINISTIC_TOOL): no conoce ninguna
 * capacidad, no interpreta semántica y no decide qué objeto es canónico.
 *
 * Reglas de clasificación (todas literales y documentadas):
 * - un heading "ID · título" (o "ID") abre un ítem; su cuerpo son las líneas
 *   no vacías hasta el siguiente heading; todo campo es literal del rango;
 * - el objectType es `SOURCE_ID_<prefijo>`: el tipo semántico lo decide la
 *   revisión canónica, no la herramienta;
 * - marcador de borrador en el propio heading (CANDIDATE, DRAFT, v0.x, …)
 *   → HISTORICAL_DRAFT;
 * - un identificador con dos o más definiciones (título distinto o reformulado
 *   con cuerpo distinto) → todas HISTORICAL_DRAFT: la cronología NUNCA decide
 *   la supersesión; el validador lo reporta como SUPERSESSION_AMBIGUOUS;
 * - ítem bajo una sección cuyo heading contiene "Backlog" → GOVERNED_BACKLOG;
 * - identificador con una única definición y
 *   cierre histórico literal → FINAL_APPROVED, citando como evidencia de
 *   aprobación el marcador de cierre literal (provenance, no publicación);
 * - identificadores de otras capacidades y secciones de frontera → no son
 *   ítems: se registran como referencias cruzadas en el reporte.
 */
import { computeSelfChecksum } from "./checksum.ts";
import type { CandidateItem, ExtractionCandidate } from "./candidate.ts";
import type { RawSourceRegistration } from "./raw-source.ts";

export const STRUCTURAL_EXTRACTOR = {
  id: "pymapa-structural-segmenter",
  version: "0.1.0",
} as const;

/** Vocabulario de cierre histórico del Knowledge Master (no es publicación técnica). */
export const HISTORICAL_CLOSURE_SUFFIX = " · K4-VALIDATED · CLOSED";

const DRAFT_TOKENS =
  /\b(?:CANDIDATE|CANDIDATA|CANDIDATO|CANDIDATOS|CANDIDATAS|DRAFT|BORRADOR|PROVISIONAL|PRELIMINAR)\b|-v0\.\d/i;
const ID_RE = /^([A-Z][A-Z0-9]*(?:-[A-Za-z0-9.]+)*)(?:\s*·\s*(.*))?$/;

export interface StructuralOccurrence {
  line: number;
  heading: string;
}

export interface StructuralExtractionReport {
  reportType: "STRUCTURAL_EXTRACTION_REPORT";
  statement: string;
  capabilityId: string;
  registrationId: string;
  textSha256: string;
  extractor: string;
  identity: { declaredName: string | null; literalLines: number[]; verified: boolean };
  historicalClosure: {
    marker: string | null;
    lines: number[];
    selectedLine: number | null;
    statement: string;
  };
  chronology: { line: number; marker: string }[];
  counts: {
    lines: number;
    headings: number;
    idHeadings: number;
    distinctSourceIds: number;
    singleDefinition: number;
    restatedIdentical: number;
    conflictingDefinitions: number;
    draftMarked: number;
    governedBacklog: number;
    finalApprovedCandidates: number;
    historicalDrafts: number;
  };
  ambiguousSupersessions: { sourceId: string; occurrences: StructuralOccurrence[] }[];
  crossCapabilityReferences: {
    target: string;
    kind: "CAPABILITY" | "DOMAIN";
    line: number;
    heading: string;
  }[];
  nonTextElements: { statement: string; warnings: string[] };
  checksum: string;
}

function prefixOf(id: string): string {
  return (/^[A-Z]+/.exec(id)?.[0] ?? "X").toUpperCase();
}

function compact(capabilityId: string): string {
  return capabilityId.replace("-", "");
}

function headingText(line: string): string | null {
  const m = /^#{1,9}\s+(.*)$/.exec(line);
  return m ? (m[1] ?? "").trim() : null;
}

function stripNumbering(t: string): string {
  return t.replace(/^\d+(?:\.\d+)*\.?\s+/, "");
}

export function extractStructuralCandidate(input: {
  registration: RawSourceRegistration;
  rawText: string;
  capabilityName: string | null;
  /** Todos los identificadores de capacidad del Master (31 slots). */
  capabilityIds: string[];
  domainIds: string[];
  agent?: string;
}): { candidate: ExtractionCandidate; report: StructuralExtractionReport } {
  const reg = input.registration;
  const capId = reg.capabilityId;
  const own = compact(capId);
  const lines = input.rawText.split("\n");
  const others = input.capabilityIds.filter((c) => c !== capId);
  const otherCompact = others.map(compact);

  /* -------- identidad -------- */
  const identityNeedle = input.capabilityName ? `${capId} · ${input.capabilityName}` : null;
  const identityLines = identityNeedle
    ? lines.flatMap((l, i) => (l.includes(identityNeedle) ? [i + 1] : []))
    : [];

  /* -------- cierre histórico y cronología -------- */
  const closureRe = new RegExp(`^${own}-K4-v\\d+(?:\\.\\d+)*${HISTORICAL_CLOSURE_SUFFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
  const markerRe = new RegExp(`^${own}-[A-Z0-9]+-v\\d+(?:\\.\\d+)*\\s·\\s.+$`);
  const closureLines: number[] = [];
  const chronology: { line: number; marker: string }[] = [];
  let closureText: string | null = null;
  lines.forEach((l, i) => {
    const t = l.replace(/^#{1,9}\s+/, "").trim();
    if (closureRe.test(t)) {
      closureLines.push(i + 1);
      closureText = t;
    }
    if (markerRe.test(t)) chronology.push({ line: i + 1, marker: t });
  });
  const closureLine = closureLines.length ? (closureLines[closureLines.length - 1] as number) : null;
  const marker = closureText as string | null;

  /* -------- segmentación -------- */
  const headings: { line: number; text: string; level: number }[] = [];
  lines.forEach((l, i) => {
    const t = headingText(l);
    if (t !== null) headings.push({ line: i + 1, text: t, level: (/^#+/.exec(l)?.[0] ?? "").length });
  });
  const cross: StructuralExtractionReport["crossCapabilityReferences"] = [];
  type Raw = {
    sourceId: string;
    line: number;
    end: number;
    heading: string;
    title: string | null;
    body: string[];
    backlog: boolean;
  };
  const raws: Raw[] = [];
  const stack: { level: number; text: string }[] = [];
  headings.forEach((h, idx) => {
    while (stack.length && (stack[stack.length - 1] as { level: number }).level >= h.level) stack.pop();
    const ancestors = stack.map((s) => s.text);
    stack.push({ level: h.level, text: h.text });
    for (const o of others)
      if (h.text.includes(o)) cross.push({ target: o, kind: "CAPABILITY", line: h.line, heading: h.text });
    for (const d of input.domainIds)
      if (d !== reg.domainId && new RegExp(`(?:^|[\\s/(])${d}(?:$|[\\s/)·,.])`).test(h.text))
        cross.push({ target: d, kind: "DOMAIN", line: h.line, heading: h.text });
    const t = stripNumbering(h.text);
    const m = ID_RE.exec(t);
    if (!m) return;
    const sourceId = m[1] as string;
    if (!/\d/.test(sourceId)) return;
    if (input.capabilityIds.includes(sourceId)) return; // encabezados de bloque o de otra capacidad
    if (otherCompact.some((c) => sourceId.includes(c))) return; // objeto de otra capacidad → referencia cruzada
    if (sourceId.startsWith(`${own}-`) && /-v\d/.test(sourceId)) return; // marcador de versión → cronología
    const next = headings[idx + 1]?.line ?? lines.length + 1;
    const body: string[] = [];
    let end = h.line;
    for (let n = h.line + 1; n < next; n += 1) {
      const txt = lines[n - 1] ?? "";
      if (txt.trim().length > 0) {
        body.push(txt);
        end = n;
      }
    }
    raws.push({
      sourceId,
      line: h.line,
      end,
      heading: t,
      title: m[2]?.trim() ? (m[2] as string).trim() : null,
      body,
      backlog: [...ancestors, h.text].some((a) => /backlog/i.test(a)),
    });
  });

  /* -------- clasificación -------- */
  const bySource = new Map<string, Raw[]>();
  raws.forEach((r) => bySource.set(r.sourceId, [...(bySource.get(r.sourceId) ?? []), r]));
  const items: CandidateItem[] = [];
  const ambiguous: StructuralExtractionReport["ambiguousSupersessions"] = [];
  let single = 0;
  let restated = 0;
  let conflicting = 0;
  let draftMarked = 0;
  for (const [sourceId, occ] of bySource) {
    const titles = new Set(occ.map((o) => o.title ?? ""));
    const conflict = titles.size > 1;
    if (occ.length === 1) single += 1;
    else if (conflict) conflicting += 1;
    else restated += 1;
    if (occ.length > 1)
      ambiguous.push({ sourceId, occurrences: occ.map((o) => ({ line: o.line, heading: o.heading })) });
    occ.forEach((o) => {
      const draft = DRAFT_TOKENS.test(o.heading);
      if (draft) draftMarked += 1;
      const classification: CandidateItem["classification"] = o.backlog
        ? "GOVERNED_BACKLOG"
        : draft || occ.length > 1 || !marker || !closureLine || o.line > closureLine
          ? "HISTORICAL_DRAFT"
          : "FINAL_APPROVED";
      const fields: Record<string, unknown> = { heading: o.heading };
      if (o.title) fields["title"] = o.title;
      if (o.body.length) fields["body"] = o.body;
      items.push({
        key: occ.length === 1 ? sourceId : `${sourceId}@L${o.line}`,
        classification,
        objectType: `SOURCE_ID_${prefixOf(sourceId)}`,
        sourceId,
        fields: fields as CandidateItem["fields"],
        sourceLines: [o.line, Math.max(o.line, o.end)],
        ...(classification === "FINAL_APPROVED" && marker && closureLine
          ? { approvalEvidence: { text: marker, sourceLines: [closureLine, closureLine] as [number, number] } }
          : {}),
      });
    });
  }

  /* -------- conteos de control declarados por la fuente -------- */
  const prefixes = new Set(items.map((i) => prefixOf(i.sourceId ?? "")));
  const limit = closureLine ?? lines.length;
  const lastCount = new Map<string, { declared: number; line: number }>();
  lines.slice(0, limit).forEach((l, i) => {
    const a = /^(\d+) ([A-Z]{2,})(?:\s.*)?$/.exec(l.trim());
    const b = /^\| ([A-Z]{2,})(?: [^|]*)? \| (\d+) \|$/.exec(l.trim());
    const p = a ? a[2] : b ? b[1] : null;
    const n = a ? a[1] : b ? b[2] : null;
    if (p && n && prefixes.has(p)) lastCount.set(p, { declared: Number(n), line: i + 1 });
  });
  const controlCounts = [...lastCount.entries()]
    .sort(([x], [y]) => (x < y ? -1 : 1))
    .map(([p, v]) => ({
      label: p,
      declared: v.declared,
      objectType: `SOURCE_ID_${p}`,
      sourceLines: [v.line, v.line] as [number, number],
    }));

  items.sort((x, y) => (x.sourceLines?.[0] ?? 0) - (y.sourceLines?.[0] ?? 0));
  const body: Omit<ExtractionCandidate, "checksum"> = {
    candidateId: `CAND-${capId}-${STRUCTURAL_EXTRACTOR.version}-${(reg.text?.sha256 ?? "").slice(0, 12)}`,
    capabilityId: capId,
    status: "CANDIDATE",
    registration: { registrationId: reg.registrationId, textSha256: reg.text?.sha256 ?? "" },
    producedBy: {
      method: "DETERMINISTIC_TOOL",
      agent: input.agent ?? `${STRUCTURAL_EXTRACTOR.id}@${STRUCTURAL_EXTRACTOR.version}`,
      note: "Segmentación literal por headings con identificador; clasificación solo por evidencia literal. No decide supersesión ni tipo semántico.",
    },
    baselineId: marker ? (marker.split(" · ")[0] as string) : null,
    historicalStatus:
      marker && closureLine ? { marker, sourceLines: [closureLine, closureLine] } : null,
    provenanceVocabulary: [],
    controlCounts,
    verbatimKeys: ["heading", "title", "body"],
    items,
  };
  const candidate = {
    ...body,
    checksum: computeSelfChecksum(body as unknown as Record<string, unknown>),
  } as ExtractionCandidate;

  const count = (c: CandidateItem["classification"]) =>
    items.filter((i) => i.classification === c).length;
  const reportBody: Omit<StructuralExtractionReport, "checksum"> = {
    reportType: "STRUCTURAL_EXTRACTION_REPORT",
    statement:
      "Reporte técnico del extractor estructural. No es conocimiento canónico ni aprobación; las referencias cruzadas no son relaciones inferidas.",
    capabilityId: capId,
    registrationId: reg.registrationId,
    textSha256: reg.text?.sha256 ?? "",
    extractor: `${STRUCTURAL_EXTRACTOR.id}@${STRUCTURAL_EXTRACTOR.version}`,
    identity: {
      declaredName: input.capabilityName,
      literalLines: identityLines,
      verified: identityLines.length > 0,
    },
    historicalClosure: {
      marker,
      lines: closureLines,
      selectedLine: closureLine,
      statement:
        "Cierre histórico literal (provenance). No equivale a publicación técnica actual ni a aceptación canónica.",
    },
    chronology,
    counts: {
      lines: lines.length,
      headings: headings.length,
      idHeadings: raws.length,
      distinctSourceIds: bySource.size,
      singleDefinition: single,
      restatedIdentical: restated,
      conflictingDefinitions: conflicting,
      draftMarked,
      governedBacklog: count("GOVERNED_BACKLOG"),
      finalApprovedCandidates: count("FINAL_APPROVED"),
      historicalDrafts: count("HISTORICAL_DRAFT"),
    },
    ambiguousSupersessions: ambiguous.sort((a, b) => (a.sourceId < b.sourceId ? -1 : 1)),
    crossCapabilityReferences: cross,
    nonTextElements: {
      statement:
        "Advertencias del registro raw sobre elementos no textuales; su verificación consta en el reporte del lote.",
      warnings: reg.extraction.warnings,
    },
  };
  return {
    candidate,
    report: {
      ...reportBody,
      checksum: computeSelfChecksum(reportBody as unknown as Record<string, unknown>),
    },
  };
}
