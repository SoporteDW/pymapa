/**
 * Extractor estructural determinista de candidatos (M2-BATCH-01 / 01R).
 *
 *   texto raw registrado → segmentación por headings con identificador →
 *   CANDIDATO clasificado solo por evidencia literal
 *
 * Es una herramienta genérica (DETERMINISTIC_TOOL): no conoce ninguna
 * capacidad, no interpreta semántica y no decide qué objeto es canónico sin
 * evidencia literal de la fuente.
 *
 * Modos:
 * - `supersession: "NONE"` (0.1.0, M2-BATCH-01): todo identificador con dos o
 *   más definiciones queda HISTORICAL_DRAFT y el validador lo reporta como
 *   SUPERSESSION_AMBIGUOUS. Se conserva byte a byte para reproducir la línea
 *   base de medición.
 * - `supersession: "GOVERNED"` (0.2.0, M2-BATCH-01R): aplica el resolver
 *   genérico de supersesión (supersession-resolver.ts), que solo resuelve
 *   cuando la fuente registra la transición de forma explícita, y las
 *   decisiones humanas de gobierno (governance-decisions.ts) verificadas
 *   literalmente contra la fuente. La cronología sola nunca decide.
 *
 * Reglas comunes (literales y documentadas):
 * - un heading "ID · título" (o "ID") abre un ítem; su cuerpo son las líneas
 *   no vacías hasta el siguiente heading; todo campo es literal del rango;
 * - el objectType es `SOURCE_ID_<prefijo>`: el tipo semántico lo decide la
 *   revisión canónica, no la herramienta;
 * - marcador de borrador en el propio heading → HISTORICAL_DRAFT;
 * - ítem bajo una sección cuyo heading contiene "Backlog" → GOVERNED_BACKLOG;
 * - identificador con una única definición y cierre histórico literal →
 *   FINAL_APPROVED citando el marcador de cierre (provenance, no publicación);
 * - identificadores de otras capacidades y secciones de frontera → no son
 *   ítems: se registran como referencias cruzadas en el reporte.
 */
import { computeSelfChecksum } from "./checksum.ts";
import type { CandidateItem, ExtractionCandidate } from "./candidate.ts";
import type { GovernanceDecisions } from "./governance-decisions.ts";
import type { RawSourceRegistration } from "./raw-source.ts";
import {
  SUPERSESSION_RESOLVER,
  resolveSupersessions,
  type GoverningFreeze,
  type ResolvedId,
  type ResolverMarker,
  type ResolverOccurrence,
  type SupersessionRule,
  type UnresolvedId,
} from "./supersession-resolver.ts";

export const STRUCTURAL_EXTRACTOR = {
  id: "pymapa-structural-segmenter",
  version: "0.2.0",
} as const;
/** Versión del modo sin resolución de supersesión (línea base M2-BATCH-01). */
export const STRUCTURAL_EXTRACTOR_BASELINE_VERSION = "0.1.0";

export type SupersessionMode = "NONE" | "GOVERNED";

/** Vocabulario de cierre histórico del Knowledge Master (no es publicación técnica). */
export const HISTORICAL_CLOSURE_SUFFIX = " · K4-VALIDATED · CLOSED";

const DRAFT_TOKENS =
  /\b(?:CANDIDATE|CANDIDATA|CANDIDATO|CANDIDATOS|CANDIDATAS|DRAFT|BORRADOR|PROVISIONAL|PRELIMINAR)\b|-v0\.\d/i;
const FREEZE_TOKEN = /(?<!NOT-)\b(?:CANDIDATE-)?FROZEN\b/g;
const ID_RE = /^([A-Z][A-Z0-9]*(?:-[A-Za-z0-9.]+)*)(?:\s*·\s*(.*))?$/;

export interface StructuralOccurrence {
  line: number;
  heading: string;
}

export interface SupersessionResolutionReport {
  resolver: string;
  mode: "GOVERNED";
  statement: string;
  baseline: {
    extractor: string;
    ambiguousIds: number;
    ambiguousIdList: string[];
    finalApproved: number;
    historicalDrafts: number;
  };
  after: {
    ambiguousIds: number;
    finalApproved: number;
    superseded: number;
    historicalDrafts: number;
    governedBacklog: number;
    itemsWithSupersessionEvidence: number;
  };
  resolvedFromBaselineAmbiguous: number;
  resolvedFromBaselineAmbiguousList: string[];
  byRule: Record<SupersessionRule, number>;
  resolvedIds: ResolvedId[];
  unresolvedIds: UnresolvedId[];
  singlesReclassified: { sourceId: string; kind: string; line: number }[];
  governingFreezes: GoverningFreeze[];
}

export interface GovernanceApplicationReport {
  decisionSetId: string;
  ref: string;
  checksum: string;
  closureSelection: {
    selectedBy: "GOVERNANCE_DECISION" | "LAST_OCCURRENCE";
    selectedLine: number | null;
    confirmationOrNonFinalLines: number[];
    criteria: string[];
  } | null;
  approvedCounts: {
    label: string;
    declared: number;
    role?: string;
    sourceLines: [number, number] | null;
    controlCount: { declared: number; sourceLines: [number, number] } | null;
    finalApprovedMaterialized: number | null;
    consistent: boolean | null;
  }[];
  backlogAdded: { sourceId: string; sourceLines: [number, number] }[];
  collisionsApplied?: {
    sourceId: string;
    resolution: string;
    selectedLine: number | null;
    otherLines: number[];
    role?: string;
  }[];
  semanticTypesApplied?: { sourceId: string; line: number; role: string; aliasOf?: string }[];
  provenanceVocabularyApplied?: { scheme: string; code: string; line: number }[];
  errors: string[];
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
    /** Más de una aparición literal sin decisión de gobierno: exige confirmación humana. */
    requiresHumanConfirmation: boolean;
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
  supersessionResolution?: SupersessionResolutionReport;
  governance?: GovernanceApplicationReport | null;
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

export interface StructuralExtractionInput {
  registration: RawSourceRegistration;
  rawText: string;
  capabilityName: string | null;
  /** Todos los identificadores de capacidad del Master (31 slots). */
  capabilityIds: string[];
  domainIds: string[];
  agent?: string;
  /** Por defecto GOVERNED. */
  supersession?: SupersessionMode;
  governanceDecisions?: { value: GovernanceDecisions; ref: string } | null;
}

export function extractStructuralCandidate(input: StructuralExtractionInput): {
  candidate: ExtractionCandidate;
  report: StructuralExtractionReport;
} {
  const mode: SupersessionMode = input.supersession ?? "GOVERNED";
  const governed = mode === "GOVERNED";
  const version = governed ? STRUCTURAL_EXTRACTOR.version : STRUCTURAL_EXTRACTOR_BASELINE_VERSION;
  const decisions = governed ? (input.governanceDecisions ?? null) : null;
  const govErrors: string[] = [];
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

  /* -------- headings -------- */
  const headings: { line: number; text: string; level: number }[] = [];
  lines.forEach((l, i) => {
    const t = headingText(l);
    if (t !== null)
      headings.push({ line: i + 1, text: t, level: (/^#+/.exec(l)?.[0] ?? "").length });
  });
  const headingAt = new Map(headings.map((h) => [h.line, h]));
  const sectionEndOf = (line: number, level: number) =>
    (headings.find((x) => x.line > line && x.level <= level)?.line ?? lines.length + 1) - 1;
  /** Sección que contiene una línea: heading padre (nivel menor) o heading precedente. */
  const enclosing = (line: number) => {
    const own = headingAt.get(line);
    const prev = headings.filter((h) => h.line < line && (!own || h.level < own.level)).pop();
    return prev ?? null;
  };

  /* -------- cierre histórico y cronología -------- */
  const closureRe = new RegExp(
    `^${own}-K4-v\\d+(?:\\.\\d+)*${HISTORICAL_CLOSURE_SUFFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
  );
  const markerRe = new RegExp(`^${own}-[A-Z0-9]+-v\\d+(?:\\.\\d+)*\\s·\\s.+$`);
  const markerParse = new RegExp(`^${own}-([A-Z0-9]+)-v(\\d+(?:\\.\\d+)*)\\s·\\s(.+)$`);
  const closureLines: number[] = [];
  const chronology: { line: number; marker: string }[] = [];
  const markers: ResolverMarker[] = [];
  let closureText: string | null = null;
  lines.forEach((l, i) => {
    const t = l.replace(/^#{1,9}\s+/, "").trim();
    if (closureRe.test(t)) {
      closureLines.push(i + 1);
      closureText = t;
    }
    if (markerRe.test(t)) {
      chronology.push({ line: i + 1, marker: t });
      const m = markerParse.exec(t) as RegExpExecArray;
      markers.push({
        line: i + 1,
        text: t,
        isHeading: headingAt.has(i + 1),
        area: m[1] as string,
        version: (m[2] as string).split(".").map(Number),
        status: m[3] as string,
      });
    }
  });
  let closureLine = closureLines.length ? (closureLines[closureLines.length - 1] as number) : null;
  const marker = closureText as string | null;
  let closureSelection: GovernanceApplicationReport["closureSelection"] = null;
  const dc = decisions?.value.historicalClosure;
  if (decisions && dc) {
    const criteria: string[] = [`marcador literal "${dc.marker}"`];
    if (dc.sectionHeading) criteria.push(`sección "${dc.sectionHeading}"`);
    if (dc.precedingLiterals?.length)
      criteria.push(
        `precedido en ${dc.precedingWindowLines ?? 6} líneas por ${dc.precedingLiterals.map((x) => `"${x}"`).join(", ")}`,
      );
    if (marker !== dc.marker)
      govErrors.push(`el marcador de cierre decidido "${dc.marker}" no es el de la fuente`);
    const window = dc.precedingWindowLines ?? 6;
    const match = closureLines.filter((l) => {
      if (dc.sectionHeading && enclosing(l)?.text !== dc.sectionHeading) return false;
      const prev = lines.slice(Math.max(0, l - 1 - window), l - 1).join("\n");
      return (dc.precedingLiterals ?? []).every((x) => prev.includes(x));
    });
    if (match.length === 1 && marker === dc.marker) {
      closureLine = match[0] as number;
      closureSelection = {
        selectedBy: "GOVERNANCE_DECISION",
        selectedLine: closureLine,
        confirmationOrNonFinalLines: closureLines.filter((l) => l !== closureLine),
        criteria,
      };
    } else {
      govErrors.push(
        `la decisión de cierre selecciona ${match.length} apariciones (${match.join(", ") || "ninguna"}); se exige exactamente una`,
      );
      closureSelection = {
        selectedBy: "LAST_OCCURRENCE",
        selectedLine: closureLine,
        confirmationOrNonFinalLines: [],
        criteria,
      };
    }
  }
  const closureGoverned = closureSelection?.selectedBy === "GOVERNANCE_DECISION";

  /* -------- segmentación -------- */
  const cross: StructuralExtractionReport["crossCapabilityReferences"] = [];
  type Raw = {
    sourceId: string;
    line: number;
    end: number;
    sectionEnd: number;
    level: number;
    heading: string;
    title: string | null;
    body: string[];
    backlog: boolean;
  };
  const raws: Raw[] = [];
  const stack: { level: number; text: string }[] = [];
  headings.forEach((h, idx) => {
    while (stack.length && (stack[stack.length - 1] as { level: number }).level >= h.level)
      stack.pop();
    const ancestors = stack.map((s) => s.text);
    stack.push({ level: h.level, text: h.text });
    for (const o of others)
      if (h.text.includes(o))
        cross.push({ target: o, kind: "CAPABILITY", line: h.line, heading: h.text });
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
      sectionEnd: sectionEndOf(h.line, h.level),
      level: h.level,
      heading: t,
      title: m[2]?.trim() ? (m[2] as string).trim() : null,
      body,
      backlog: [...ancestors, h.text].some((a) => /backlog/i.test(a)),
    });
  });

  /* -------- clasificación -------- */
  const bySource = new Map<string, Raw[]>();
  raws.forEach((r) => bySource.set(r.sourceId, [...(bySource.get(r.sourceId) ?? []), r]));
  const keyOf = (o: Raw) =>
    (bySource.get(o.sourceId) as Raw[]).length === 1 ? o.sourceId : `${o.sourceId}@L${o.line}`;

  const resolver = governed
    ? resolveSupersessions({
        lines,
        headings,
        markers,
        closureLine,
        occurrences: raws.map((o): ResolverOccurrence => ({
          key: keyOf(o),
          sourceId: o.sourceId,
          prefix: prefixOf(o.sourceId),
          line: o.line,
          end: o.end,
          sectionEnd: o.sectionEnd,
          level: o.level,
          heading: o.heading,
          title: o.title,
          body: o.body,
          backlog: o.backlog,
          draftHeading: DRAFT_TOKENS.test(o.heading.replace(FREEZE_TOKEN, "")),
        })),
      })
    : null;

  const items: CandidateItem[] = [];
  const ambiguous: StructuralExtractionReport["ambiguousSupersessions"] = [];
  const unresolved = new Set(resolver?.unresolvedIds.map((u) => u.sourceId) ?? []);
  const resolvedSet = new Set(resolver?.resolvedIds.map((r) => r.sourceId) ?? []);
  let single = 0;
  let restated = 0;
  let conflicting = 0;
  let draftMarked = 0;
  const closureEvidence =
    marker && closureLine
      ? { text: marker, sourceLines: [closureLine, closureLine] as [number, number] }
      : null;
  for (const [sourceId, occ] of bySource) {
    const titles = new Set(occ.map((o) => o.title ?? ""));
    const bodies = new Set(occ.map((o) => o.body.join("\n")));
    const conflict = titles.size > 1 || bodies.size > 1;
    if (occ.length === 1) single += 1;
    else if (conflict) conflicting += 1;
    else restated += 1;
    const isAmbiguous = governed
      ? unresolved.has(sourceId) && !resolvedSet.has(sourceId)
      : occ.length > 1;
    if (isAmbiguous && occ.length > 1)
      ambiguous.push({
        sourceId,
        occurrences: occ.map((o) => ({ line: o.line, heading: o.heading })),
      });
    occ.forEach((o) => {
      const key = keyOf(o);
      const draft = DRAFT_TOKENS.test(o.heading);
      if (draft) draftMarked += 1;
      const res = resolver?.resolutions.get(key);
      let classification: CandidateItem["classification"];
      if (o.backlog) classification = "GOVERNED_BACKLOG";
      else if (res)
        classification =
          res.kind === "CANONICAL_SELECTED"
            ? "FINAL_APPROVED"
            : res.kind === "SUPERSEDED_BY_SUCCESSOR"
              ? "SUPERSEDED"
              : "HISTORICAL_DRAFT";
      else
        classification =
          draft || occ.length > 1 || !marker || !closureLine || o.line > closureLine
            ? "HISTORICAL_DRAFT"
            : "FINAL_APPROVED";
      const fields: Record<string, unknown> = { heading: o.heading };
      if (o.title) fields["title"] = o.title;
      if (o.body.length) fields["body"] = o.body;
      const approvalEvidence =
        classification !== "FINAL_APPROVED"
          ? null
          : res && res.rule !== "VERBATIM_DUPLICATE"
            ? (res.evidence[0] ?? null)
            : closureEvidence;
      items.push({
        key,
        classification,
        objectType: `SOURCE_ID_${prefixOf(sourceId)}`,
        sourceId,
        fields: fields as CandidateItem["fields"],
        sourceLines: [o.line, Math.max(o.line, o.end)],
        ...(approvalEvidence ? { approvalEvidence } : {}),
        ...(res?.successorKey && classification === "SUPERSEDED"
          ? { supersededBy: res.successorKey }
          : {}),
        ...(res && !o.backlog
          ? {
              supersession: {
                resolver: `${SUPERSESSION_RESOLVER.id}@${SUPERSESSION_RESOLVER.version}`,
                rule: res.rule,
                kind: res.kind,
                evidence: res.evidence,
                ...(res.canonicalKey ? { canonicalKey: res.canonicalKey } : {}),
              },
            }
          : {}),
      });
    });
  }

  /* -------- colisiones y tipado semántico gobernados (M2-BATCH-02) -------- */
  const fullLine = (lit: string) =>
    lines.flatMap((l, i) => (l.trim() === lit.trim() ? [i + 1] : []));
  const rangeOf = (w: { fromLiteral: string; toLiteral: string } | undefined, ctx: string) => {
    if (!w) return null;
    const a = fullLine(w.fromLiteral);
    const b = fullLine(w.toLiteral);
    if (a.length !== 1 || b.length !== 1 || (a[0] as number) >= (b[0] as number)) {
      govErrors.push(
        `${ctx}: rango "${w.fromLiteral}" (${a.length}) → "${w.toLiteral}" (${b.length}) no es único/ordenado`,
      );
      return null;
    }
    return { from: a[0] as number, to: b[0] as number, text: w.fromLiteral.trim() };
  };
  const textOf = (i: CandidateItem) =>
    [String(i.fields["heading"] ?? ""), ...((i.fields["body"] as string[] | undefined) ?? [])].join(
      "\n",
    );
  const collisionsApplied: NonNullable<GovernanceApplicationReport["collisionsApplied"]> = [];
  const governedIds = new Set<string>();
  const setId = decisions?.value.decisionSetId;
  for (const d of decisions?.value.collisionResolutions ?? []) {
    const rng = rangeOf(d.within, d.sourceIds.join(","));
    for (const sid of d.sourceIds) {
      const occ = items.filter((i) => i.sourceId === sid && i.classification !== "GOVERNED_BACKLOG");
      if (occ.length < 2) {
        govErrors.push(`colisión ${sid}: ${occ.length} aparición(es); se exigen varias`);
        continue;
      }
      if (d.resolution === "NOT_A_KNOWLEDGE_OBJECT") {
        if (!d.role) {
          govErrors.push(`colisión ${sid}: NOT_A_KNOWLEDGE_OBJECT exige role`);
          continue;
        }
        occ.forEach((i) => {
          i.classification = "HISTORICAL_DRAFT";
          i.role = d.role as string;
          i.governanceDecision = setId as string;
          delete i.approvalEvidence;
          delete i.supersededBy;
        });
        governedIds.add(sid);
        collisionsApplied.push({
          sourceId: sid,
          resolution: d.resolution,
          selectedLine: null,
          otherLines: occ.map((i) => i.sourceLines?.[0] ?? 0),
          role: d.role,
        });
        continue;
      }
      if (!rng) continue;
      const inRange = occ.filter(
        (i) => (i.sourceLines?.[0] ?? 0) > rng.from && (i.sourceLines?.[0] ?? 0) < rng.to,
      );
      if (inRange.length !== 1) {
        govErrors.push(`colisión ${sid}: ${inRange.length} apariciones en el rango (se exige una)`);
        continue;
      }
      const sel = inRange[0] as CandidateItem;
      if (d.canonicalLiteral && !textOf(sel).includes(d.canonicalLiteral)) {
        govErrors.push(`colisión ${sid}: literal canónico no figura en L${sel.sourceLines?.[0]}`);
        continue;
      }
      if (d.resolution === "GENUINE_COLLISION" && !d.otherOccurrencesRole) {
        govErrors.push(`colisión ${sid}: GENUINE_COLLISION exige otherOccurrencesRole`);
        continue;
      }
      sel.classification = "FINAL_APPROVED";
      sel.approvalEvidence = { text: rng.text, sourceLines: [rng.from, rng.from] };
      sel.governanceDecision = setId as string;
      delete sel.supersededBy;
      delete sel.supersession;
      if (d.role) sel.role = d.role;
      const others = occ.filter((i) => i !== sel);
      others.forEach((i) => {
        delete i.approvalEvidence;
        delete i.supersession;
        i.governanceDecision = setId as string;
        if (d.resolution === "SELECT_OCCURRENCE") {
          i.classification = "SUPERSEDED";
          i.supersededBy = sel.key;
        } else {
          i.classification = "HISTORICAL_DRAFT";
          i.role = d.otherOccurrencesRole as string;
          delete i.supersededBy;
        }
      });
      governedIds.add(sid);
      collisionsApplied.push({
        sourceId: sid,
        resolution: d.resolution,
        selectedLine: sel.sourceLines?.[0] ?? null,
        otherLines: others.map((i) => i.sourceLines?.[0] ?? 0),
        ...(d.otherOccurrencesRole ? { role: d.otherOccurrencesRole } : {}),
      });
    }
  }
  const semanticTypesApplied: NonNullable<GovernanceApplicationReport["semanticTypesApplied"]> =
    [];
  for (const s of decisions?.value.semanticTypes ?? []) {
    const rng = s.within ? rangeOf(s.within, `tipo ${s.role}`) : null;
    if (s.within && !rng) continue;
    for (const sid of s.sourceIds) {
      const occ = items.filter(
        (i) =>
          i.sourceId === sid &&
          (!rng || ((i.sourceLines?.[0] ?? 0) > rng.from && (i.sourceLines?.[0] ?? 0) < rng.to)),
      );
      if (occ.length !== 1) {
        govErrors.push(`tipo ${s.role} ${sid}: ${occ.length} apariciones (se exige una)`);
        continue;
      }
      const it = occ[0] as CandidateItem;
      const bl = s.bodyLiterals?.[sid];
      if (bl && !textOf(it).includes(bl)) {
        govErrors.push(`tipo ${s.role} ${sid}: literal "${bl}" ausente en L${it.sourceLines?.[0]}`);
        continue;
      }
      const alias = s.aliasOf?.[sid];
      if (alias) {
        const target = items.find(
          (i) => i.sourceId === alias && i.classification === "FINAL_APPROVED",
        );
        const digits = (x: string) => /(\d+)$/.exec(x)?.[1];
        if (!target || digits(alias) !== digits(sid)) {
          govErrors.push(`alias ${sid} → ${alias}: destino inexistente o numeración distinta`);
          continue;
        }
        it.classification = "HISTORICAL_DRAFT";
        delete it.approvalEvidence;
        it.statement = `SHORTHAND_REFERENCE · alias de ${alias} (decisión de gobierno ${setId}); no es objeto propio ni cuenta como tal`;
      }
      it.role = s.role;
      it.governanceDecision = setId as string;
      semanticTypesApplied.push({
        sourceId: sid,
        line: it.sourceLines?.[0] ?? 0,
        role: s.role,
        ...(alias ? { aliasOf: alias } : {}),
      });
    }
  }
  for (let n = ambiguous.length - 1; n >= 0; n -= 1)
    if (governedIds.has((ambiguous[n] as { sourceId: string }).sourceId)) ambiguous.splice(n, 1);

  /* -------- vocabulario de provenance nativo de la fuente -------- */
  const provenanceVocabulary: ExtractionCandidate["provenanceVocabulary"] = [];
  for (const v of decisions?.value.provenanceVocabulary ?? []) {
    const a = fullLine(v.anchorLiteral);
    if (a.length !== 1) {
      govErrors.push(`provenance ${v.scheme}: ancla "${v.anchorLiteral}" aparece ${a.length} veces`);
      continue;
    }
    const start = a[0] as number;
    for (const code of v.codes) {
      let at: number | null = null;
      for (let n = start + 1; n <= Math.min(lines.length, start + v.windowLines); n += 1)
        if ((lines[n - 1] ?? "").replace(/^#{1,9}\s+/, "").trim() === code) {
          at = n;
          break;
        }
      if (at === null) {
        govErrors.push(`provenance ${v.scheme}: código ${code} no hallado tras el ancla`);
        continue;
      }
      // Significado literal: línea siguiente a un código-heading. Si la fuente
      // no lo declara, meaning repite el código literal (sin inventar texto).
      let meaning = code;
      let endLine = at;
      if (headingAt.has(at)) {
        const nx = lines[at] ?? "";
        if (nx.trim() && !headingAt.has(at + 1)) {
          meaning = nx.trim();
          endLine = at + 1;
        }
      }
      provenanceVocabulary.push({
        code,
        label: code,
        meaning,
        sourceLines: [at, endLine],
        scheme: v.scheme,
      });
    }
  }

  /* -------- backlog gobernado por decisión humana (líneas planas) -------- */
  const backlogAdded: GovernanceApplicationReport["backlogAdded"] = [];
  for (const b of decisions?.value.governedBacklog ?? []) {
    const needle = `${b.sourceId} · ${b.title}`;
    const at = lines.flatMap((l, i) =>
      l.replace(/^#{1,9}\s+/, "").trim() === needle ? [i + 1] : [],
    );
    if (at.length !== 1) {
      govErrors.push(`backlog ${needle}: ${at.length} apariciones literales (se exige una)`);
      continue;
    }
    if (items.some((i) => i.sourceId === b.sourceId)) {
      govErrors.push(`backlog ${b.sourceId}: ya materializado por segmentación`);
      continue;
    }
    const line = at[0] as number;
    const body: string[] = [];
    let end = line;
    for (let n = line + 1; n <= lines.length && body.length < b.bodyLineCount; n += 1) {
      const txt = lines[n - 1] ?? "";
      if (headingAt.has(n)) break;
      if (txt.trim().length > 0) {
        body.push(txt);
        end = n;
      }
    }
    if (body.length !== b.bodyLineCount)
      govErrors.push(`backlog ${b.sourceId}: descripción literal incompleta`);
    const fields: Record<string, unknown> = { heading: needle, title: b.title };
    if (body.length) fields["body"] = body;
    items.push({
      key: b.sourceId,
      classification: "GOVERNED_BACKLOG",
      objectType: `SOURCE_ID_${prefixOf(b.sourceId)}`,
      sourceId: b.sourceId,
      fields: fields as CandidateItem["fields"],
      sourceLines: [line, end],
      publicationBlocking: false,
      governanceDecision: decisions?.value.decisionSetId,
    });
    backlogAdded.push({ sourceId: b.sourceId, sourceLines: [line, end] });
  }

  /* -------- conteos de control declarados por la fuente -------- */
  const prefixes = new Set(items.map((i) => prefixOf(i.sourceId ?? "")));
  const closureSection =
    governed && closureLine
      ? (() => {
          const h = headingAt.get(closureLine);
          const parent = enclosing(closureLine);
          const lvl = h ? (parent?.level ?? h.level) : (parent?.level ?? 0);
          return lvl === 0 ? lines.length : sectionEndOf(closureLine, lvl);
        })()
      : null;
  const limit = closureSection ?? closureLine ?? lines.length;
  const lastCount = new Map<string, { declared: number; line: number }>();
  lines.slice(0, limit).forEach((l, i) => {
    const a = /^(\d+) ([A-Z]{2,})(?:\s.*)?$/.exec(l.trim());
    const b = /^\| ([A-Z]{2,})(?: [^|]*)? \| (\d+) \|$/.exec(l.trim());
    const p = a ? a[2] : b ? b[1] : null;
    const n = a ? a[1] : b ? b[2] : null;
    if (p && n && prefixes.has(p)) lastCount.set(p, { declared: Number(n), line: i + 1 });
  });
  const roleOfLabel = new Map(
    (decisions?.value.approvedCounts ?? []).filter((a) => a.role).map((a) => [a.label, a.role]),
  );
  const controlCounts = [...lastCount.entries()]
    .sort(([x], [y]) => (x < y ? -1 : 1))
    .map(([p, v]) => ({
      label: p,
      declared: v.declared,
      objectType: `SOURCE_ID_${p}`,
      ...(roleOfLabel.get(p) ? { role: roleOfLabel.get(p) as string } : {}),
      sourceLines: [v.line, v.line] as [number, number],
    }));

  /* -------- conteos finales aprobados por gobierno -------- */
  const approvedCounts: GovernanceApplicationReport["approvedCounts"] = (
    decisions?.value.approvedCounts ?? []
  ).map((a) => {
    const at = lines
      .slice(0, limit)
      .flatMap((l, i) => (l.trim() === a.sourceLiteral ? [i + 1] : []));
    const ln = at.length ? (at[at.length - 1] as number) : null;
    if (ln === null) govErrors.push(`conteo ${a.label}: literal "${a.sourceLiteral}" no hallado`);
    if (!new RegExp(`(?:^|\\D)${a.declared}(?:\\D|$)`).test(a.sourceLiteral))
      govErrors.push(`conteo ${a.label}: ${a.declared} no figura en "${a.sourceLiteral}"`);
    const cc = controlCounts.find((c) => c.label === a.label) ?? null;
    const materialized = prefixes.has(a.label)
      ? items.filter(
          (i) =>
            i.classification === "FINAL_APPROVED" &&
            i.objectType === `SOURCE_ID_${a.label}` &&
            (a.role === undefined || i.role === a.role),
        ).length
      : null;
    return {
      label: a.label,
      declared: a.declared,
      ...(a.role ? { role: a.role } : {}),
      sourceLines: ln ? [ln, ln] : null,
      controlCount: cc ? { declared: cc.declared, sourceLines: cc.sourceLines } : null,
      finalApprovedMaterialized: materialized,
      consistent:
        materialized === null && !cc
          ? null
          : (cc ? cc.declared === a.declared : true) &&
            (materialized === null || materialized === a.declared),
    };
  });

  items.sort((x, y) => (x.sourceLines?.[0] ?? 0) - (y.sourceLines?.[0] ?? 0));
  const agent = input.agent ?? `${STRUCTURAL_EXTRACTOR.id}@${version}`;
  const body: Omit<ExtractionCandidate, "checksum"> = {
    candidateId: `CAND-${capId}-${version}-${(reg.text?.sha256 ?? "").slice(0, 12)}`,
    capabilityId: capId,
    status: "CANDIDATE",
    registration: { registrationId: reg.registrationId, textSha256: reg.text?.sha256 ?? "" },
    producedBy: {
      method: "DETERMINISTIC_TOOL",
      agent: governed
        ? `${agent} + ${SUPERSESSION_RESOLVER.id}@${SUPERSESSION_RESOLVER.version}`
        : agent,
      note: governed
        ? "Segmentación literal por headings con identificador; supersesión resuelta solo con evidencia explícita de la fuente (resolver genérico); decisiones humanas de gobierno aplicadas con verificación literal. No decide tipo semántico."
        : "Segmentación literal por headings con identificador; clasificación solo por evidencia literal. No decide supersesión ni tipo semántico.",
    },
    baselineId: marker ? (marker.split(" · ")[0] as string) : null,
    historicalStatus:
      marker && closureLine ? { marker, sourceLines: [closureLine, closureLine] } : null,
    provenanceVocabulary,
    controlCounts,
    verbatimKeys: ["heading", "title", "body"],
    items,
    ...(decisions
      ? {
          governanceDecisions: {
            decisionSetId: decisions.value.decisionSetId,
            ref: decisions.ref,
            checksum: decisions.value.checksum,
          },
        }
      : {}),
  };
  const candidate = {
    ...body,
    checksum: computeSelfChecksum(body as unknown as Record<string, unknown>),
  } as ExtractionCandidate;

  const count = (c: CandidateItem["classification"]) =>
    items.filter((i) => i.classification === c).length;

  let supersessionResolution: SupersessionResolutionReport | undefined;
  if (governed && resolver) {
    const base = extractStructuralCandidate({ ...input, supersession: "NONE" }).report;
    const baseAmb = base.ambiguousSupersessions.map((a) => a.sourceId);
    const nowAmb = new Set(ambiguous.map((a) => a.sourceId));
    const byRule = Object.fromEntries(
      [
        "EXPLICIT_ELIMINATION",
        "EXPLICIT_REFORMULATION",
        "GOVERNED_FREEZE",
        "FROZEN_HEADING",
        "VERBATIM_DUPLICATE",
      ].map((r) => [r, 0]),
    ) as Record<SupersessionRule, number>;
    [...resolver.resolutions.values()].forEach((r) => {
      byRule[r.rule] += 1;
    });
    supersessionResolution = {
      resolver: `${SUPERSESSION_RESOLVER.id}@${SUPERSESSION_RESOLVER.version}`,
      mode: "GOVERNED",
      statement:
        "Resolución de supersesión solo por evidencia explícita de la fuente. La cronología sola y la última aparición sola nunca deciden; toda versión previa se preserva como provenance histórica. No es aceptación canónica.",
      baseline: {
        extractor: base.extractor,
        ambiguousIds: baseAmb.length,
        ambiguousIdList: baseAmb,
        finalApproved: base.counts.finalApprovedCandidates,
        historicalDrafts: base.counts.historicalDrafts,
      },
      after: {
        ambiguousIds: ambiguous.length,
        finalApproved: count("FINAL_APPROVED"),
        superseded: count("SUPERSEDED"),
        historicalDrafts: count("HISTORICAL_DRAFT"),
        governedBacklog: count("GOVERNED_BACKLOG"),
        itemsWithSupersessionEvidence: items.filter((i) => i.supersession).length,
      },
      resolvedFromBaselineAmbiguous: baseAmb.filter((s) => !nowAmb.has(s)).length,
      resolvedFromBaselineAmbiguousList: baseAmb.filter((s) => !nowAmb.has(s)),
      byRule,
      resolvedIds: resolver.resolvedIds,
      unresolvedIds: resolver.unresolvedIds,
      singlesReclassified: items
        .filter(
          (i) =>
            i.supersession &&
            (bySource.get(i.sourceId ?? "")?.length ?? 0) === 1 &&
            i.supersession.kind !== "CANONICAL_SELECTED",
        )
        .map((i) => ({
          sourceId: i.sourceId as string,
          kind: i.supersession?.kind as string,
          line: i.sourceLines?.[0] ?? 0,
        })),
      governingFreezes: resolver.governingFreezes,
    };
  }

  const reportBody: Omit<StructuralExtractionReport, "checksum"> = {
    reportType: "STRUCTURAL_EXTRACTION_REPORT",
    statement:
      "Reporte técnico del extractor estructural. No es conocimiento canónico ni aprobación; las referencias cruzadas no son relaciones inferidas.",
    capabilityId: capId,
    registrationId: reg.registrationId,
    textSha256: reg.text?.sha256 ?? "",
    extractor: `${STRUCTURAL_EXTRACTOR.id}@${version}`,
    identity: {
      declaredName: input.capabilityName,
      literalLines: identityLines,
      verified: identityLines.length > 0,
    },
    historicalClosure: {
      marker,
      lines: closureLines,
      selectedLine: closureLine,
      requiresHumanConfirmation: closureLines.length > 1 && !closureGoverned,
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
    ...(supersessionResolution ? { supersessionResolution } : {}),
    ...(governed
      ? {
          governance: decisions
            ? {
                decisionSetId: decisions.value.decisionSetId,
                ref: decisions.ref,
                checksum: decisions.value.checksum,
                closureSelection,
                approvedCounts,
                backlogAdded,
                collisionsApplied,
                semanticTypesApplied,
                provenanceVocabularyApplied: provenanceVocabulary.map((v) => ({
                  scheme: v.scheme ?? "",
                  code: v.code,
                  line: v.sourceLines[0],
                })),
                errors: govErrors,
              }
            : null,
        }
      : {}),
  };
  return {
    candidate,
    report: {
      ...reportBody,
      checksum: computeSelfChecksum(reportBody as unknown as Record<string, unknown>),
    },
  };
}
