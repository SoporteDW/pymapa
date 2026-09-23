/**
 * Resolver genérico y gobernado de supersesión (M2-BATCH-01R).
 *
 * Resuelve identificadores repetidos SOLO cuando la propia fuente registra la
 * transición de forma explícita. No conoce ninguna capacidad, ningún
 * identificador concreto ni ninguna familia concreta: opera sobre los
 * headings con identificador, sus secciones y los marcadores de cronología
 * `<CAP>-<ÁREA>-v<versión> · <estado>` que la fuente declara.
 *
 * Reglas (todas literales; cada decisión cita su evidencia textual):
 *
 * R1 EXPLICIT_ELIMINATION — la sección propia de la ocurrencia (excluidas las
 *    subsecciones de otros identificadores) contiene una declaración literal de
 *    eliminación ("se elimina como", "SE ELIMINA", "ELIMINADA", "ELIMINATED")
 *    en una línea que no nombra otro identificador de la misma familia.
 * R2 EXPLICIT_REFORMULATION — (a) dentro de la sección de la ocurrencia hay
 *    exactamente un heading anidado de la misma familia cuyo cuerpo declara
 *    "SE MANTIENE" / "REFORMULADA": la ocurrencia queda SUPERSEDED por ese
 *    sucesor; (b) un heading "Reformulación de <ID>" introduce el sucesor de la
 *    última ocurrencia previa de <ID>.
 * R3 GOVERNED_FREEZE — una familia de identificadores (prefijo) queda
 *    gobernada por un marcador de cronología declarado de congelación
 *    (…FROZEN, sin "NOT-") cuya área nombra literalmente la familia (el área es
 *    una concatenación de prefijos presentes, p. ej. CE+VA, o el estado declara
 *    "<n>-<prefijo>"). La declaración es la línea que consiste exactamente en el
 *    marcador (preferentemente heading; una mención con puntuación final es una
 *    promesa condicional, no una declaración). Se toma la versión más alta
 *    declarada antes del cierre; si una versión posterior del área reabre la
 *    familia, R3 no se aplica. Ámbito congelado A = [declaración, siguiente
 *    marcador); ámbito ratificado B = [marcador de promoción del área
 *    (READY-TO-FREEZE / FOUNDATION-SUPPORTED), declaración). La definición
 *    canónica es la única ocurrencia en A (o, si no hay, la única en B); las
 *    demás previas quedan SUPERSEDED_BY_GOVERNED_STAGE; las posteriores solo son
 *    confirmación si su título coincide o es subcadena del canónico y su
 *    sección no declara eliminación ni reformulación. Un identificador de la familia ausente de A∪B y solo
 *    previo queda NOT_IN_FROZEN_ARCHITECTURE.
 * R4 FROZEN_HEADING — un identificador cuya única ocurrencia con token de
 *    congelación en su propio heading es la canónica; previas superadas,
 *    posteriores solo confirmación compatible.
 * R5 VERBATIM_DUPLICATE — todas las ocurrencias con heading y sección completa
 *    (subsecciones incluidas) idénticos byte a byte: no hay elección semántica;
 *    la primera es la definición y el resto repetición literal.
 *
 * La cronología sola NUNCA decide; la última ocurrencia sola NUNCA decide. Si
 * alguna ocurrencia de un identificador queda sin explicación, el identificador
 * entero queda sin resolver (REVIEW_REQUIRED) y se conservan solo las
 * evidencias locales R1/R2.
 */

export const SUPERSESSION_RESOLVER = {
  id: "pymapa-governed-supersession-resolver",
  version: "0.1.0",
} as const;

export const SUPERSESSION_RULES = [
  "EXPLICIT_ELIMINATION",
  "EXPLICIT_REFORMULATION",
  "GOVERNED_FREEZE",
  "FROZEN_HEADING",
  "VERBATIM_DUPLICATE",
] as const;
export type SupersessionRule = (typeof SUPERSESSION_RULES)[number];

export const SUPERSESSION_KINDS = [
  "CANONICAL_SELECTED",
  "ELIMINATED",
  "SUPERSEDED_BY_SUCCESSOR",
  "SUPERSEDED_BY_GOVERNED_STAGE",
  "SUPERSEDED_BY_FROZEN_STATEMENT",
  "RESTATEMENT_OF_CANONICAL",
  "NOT_IN_FROZEN_ARCHITECTURE",
] as const;
export type SupersessionKind = (typeof SUPERSESSION_KINDS)[number];

export interface SupersessionEvidence {
  text: string;
  sourceLines: [number, number];
}

export interface ResolverOccurrence {
  key: string;
  sourceId: string;
  prefix: string;
  line: number;
  /** Última línea no vacía del cuerpo propio (hasta el siguiente heading). */
  end: number;
  /** Última línea de la sección (hasta el siguiente heading de nivel ≤). */
  sectionEnd: number;
  level: number;
  heading: string;
  title: string | null;
  body: string[];
  backlog: boolean;
  /** El heading contiene un marcador de borrador distinto del token de congelación. */
  draftHeading: boolean;
}

export interface ResolverMarker {
  line: number;
  text: string;
  isHeading: boolean;
  area: string;
  version: number[];
  status: string;
}

export interface OccurrenceResolution {
  key: string;
  kind: SupersessionKind;
  rule: SupersessionRule;
  evidence: SupersessionEvidence[];
  successorKey?: string;
  canonicalKey?: string;
}

export interface ResolvedId {
  sourceId: string;
  outcome: "CANONICAL_SELECTED" | "NO_CANONICAL_DEFINITION";
  rules: SupersessionRule[];
  canonicalKey: string | null;
  occurrences: number;
}

export interface UnresolvedId {
  sourceId: string;
  reason: string;
  occurrences: number[];
}

export interface GoverningFreeze {
  prefix: string;
  area: string;
  marker: string;
  line: number;
  ratifiedFrom: number;
  frozenUntil: number;
}

export interface ResolverResult {
  resolutions: Map<string, OccurrenceResolution>;
  resolvedIds: ResolvedId[];
  unresolvedIds: UnresolvedId[];
  governingFreezes: GoverningFreeze[];
}

const ELIM_RE = /\b[Ss]e eliminan? como\b|\bSE ELIMINAN?\b|\bELIMINAD[OA]S?\b|\bELIMINATED\b/;
const RETAIN_RE = /\bse mantiene\b|\breformulad[oa]\b/i;
const CHANGE_RE =
  /\bse eliminan? como\b|\bSE ELIMINAN?\b|\bELIMINAD[OA]S?\b|\bELIMINATED\b|\breformul/i;
const FREEZE_RE = /(?<!NOT-)\b(?:CANDIDATE-)?FROZEN\b/;
const PROMOTION_RE = /\bREADY-TO-FREEZE\b|\bFOUNDATION-SUPPORTED\b/;
const REFORMULATION_HEADING_RE = /\breformulaci[oó]n de\s+([A-Z][A-Z0-9]*(?:-[A-Za-z0-9.]+)*)/i;

const TOKEN_RE = /\b[A-Z][A-Z0-9]*(?:-[A-Za-z0-9]+)*\d\b/g;

function cmpVersion(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** ¿El área del marcador es una concatenación de prefijos presentes que incluye `p`? */
function areaNamesFamily(area: string, p: string, prefixes: Set<string>): boolean {
  if (p.length < 2) return false;
  const seg = (rest: string, used: boolean): boolean => {
    if (rest.length === 0) return used;
    for (const q of prefixes) {
      if (q.length >= 2 && rest.startsWith(q) && seg(rest.slice(q.length), used || q === p))
        return true;
    }
    return false;
  };
  return seg(area, false);
}

function linked(m: ResolverMarker, p: string, prefixes: Set<string>): boolean {
  return (
    areaNamesFamily(m.area, p, prefixes) ||
    new RegExp(`(?:^|[\\s·])\\d+-${p}(?:$|[\\s·])`).test(m.status)
  );
}

function ev(line: number, text: string): SupersessionEvidence {
  return { text, sourceLines: [line, line] };
}

export function resolveSupersessions(input: {
  lines: string[];
  occurrences: ResolverOccurrence[];
  markers: ResolverMarker[];
  headings: { line: number; text: string; level: number }[];
  closureLine: number | null;
}): ResolverResult {
  const { lines, occurrences, markers, headings } = input;
  const closure = input.closureLine ?? lines.length;
  const bySid = new Map<string, ResolverOccurrence[]>();
  occurrences.forEach((o) => bySid.set(o.sourceId, [...(bySid.get(o.sourceId) ?? []), o]));
  const prefixes = new Set(occurrences.map((o) => o.prefix));
  const local = new Map<string, OccurrenceResolution>();
  const text = (n: number) => (lines[n - 1] ?? "").replace(/^#{1,9}\s+/, "").trim();
  const nested = (o: ResolverOccurrence) =>
    occurrences.filter((x) => x.line > o.line && x.line <= o.sectionEnd);
  const inScope = (o: ResolverOccurrence) => !o.backlog && o.line <= closure;
  /** Contenido completo de la sección (subsecciones incluidas), sin líneas vacías. */
  const sectionText = (o: ResolverOccurrence) =>
    lines
      .slice(o.line, o.sectionEnd)
      .filter((l) => l.trim().length > 0)
      .join("\n");
  const sameDefinition = (a: ResolverOccurrence, b: ResolverOccurrence) =>
    a.heading === b.heading && sectionText(a) === sectionText(b);

  /* ---------------- R1 · eliminación explícita ---------------- */
  for (const o of occurrences) {
    if (!inScope(o)) continue;
    const excl = nested(o).map((x) => [x.line, x.sectionEnd] as const);
    for (let n = o.line; n <= o.sectionEnd; n += 1) {
      if (excl.some(([a, z]) => n >= a && n <= z)) continue;
      const t = text(n);
      if (!ELIM_RE.test(t)) continue;
      const others = (t.match(TOKEN_RE) ?? []).filter(
        (tok) => tok !== o.sourceId && tok.startsWith(o.prefix) && bySid.has(tok),
      );
      if (others.length > 0) continue;
      local.set(o.key, {
        key: o.key,
        kind: "ELIMINATED",
        rule: "EXPLICIT_ELIMINATION",
        evidence: [ev(n, t)],
      });
      break;
    }
  }

  /* ---------------- R2 · reformulación explícita ---------------- */
  for (const o of occurrences) {
    if (!inScope(o) || local.has(o.key)) continue;
    const succ = nested(o).filter((x) => {
      if (x.prefix !== o.prefix) return false;
      for (let n = x.line + 1; n <= x.sectionEnd; n += 1) if (RETAIN_RE.test(text(n))) return true;
      return false;
    });
    if (succ.length !== 1) continue;
    const s = succ[0] as ResolverOccurrence;
    let retain = s.line + 1;
    while (retain <= s.sectionEnd && !RETAIN_RE.test(text(retain))) retain += 1;
    local.set(o.key, {
      key: o.key,
      kind: "SUPERSEDED_BY_SUCCESSOR",
      rule: "EXPLICIT_REFORMULATION",
      successorKey: s.key,
      evidence: [ev(s.line, s.heading), ev(retain, text(retain))],
    });
  }
  for (const h of headings) {
    if (h.line > closure) continue;
    const m = REFORMULATION_HEADING_RE.exec(h.text);
    if (!m) continue;
    const sid = m[1] as string;
    const occ = bySid.get(sid);
    if (!occ) continue;
    const sectionEnd =
      headings.find((x) => x.line > h.line && x.level <= h.level)?.line ?? lines.length + 1;
    const next = occ.find((x) => x.line > h.line && x.line < sectionEnd);
    const prev = [...occ].reverse().find((x) => x.line < h.line && !local.has(x.key));
    if (!next || !prev || !inScope(prev)) continue;
    local.set(prev.key, {
      key: prev.key,
      kind: "SUPERSEDED_BY_SUCCESSOR",
      rule: "EXPLICIT_REFORMULATION",
      successorKey: next.key,
      evidence: [ev(h.line, h.text.trim())],
    });
  }

  /* ---------------- R3 · congelación gobernada por familia ---------------- */
  const governing = new Map<string, GoverningFreeze & { evidence: SupersessionEvidence[] }>();
  for (const p of prefixes) {
    let best: (GoverningFreeze & { evidence: SupersessionEvidence[] }) | null = null;
    const areas = new Set(markers.filter((m) => linked(m, p, prefixes)).map((m) => m.area));
    for (const area of areas) {
      const own = markers.filter((m) => m.area === area);
      const decl = own.filter(
        (m) => FREEZE_RE.test(m.status) && !/[.,;:]$/.test(m.text) && m.line <= closure,
      );
      if (decl.length === 0) continue;
      const top = decl.reduce((a, b) => (cmpVersion(b.version, a.version) > 0 ? b : a)).version;
      const cands = decl.filter((m) => cmpVersion(m.version, top) === 0);
      const F = cands.find((m) => m.isHeading) ?? (cands[0] as ResolverMarker);
      if (own.some((m) => cmpVersion(m.version, F.version) > 0)) continue; // reabierta
      const nextMarker = markers.find((m) => m.line > F.line)?.line ?? closure + 1;
      const promo = own
        .filter(
          (m) =>
            m.line < F.line && PROMOTION_RE.test(m.status) && cmpVersion(m.version, F.version) <= 0,
        )
        .pop();
      const prevAny = markers.filter((m) => m.line < F.line).pop();
      const from = promo?.line ?? prevAny?.line ?? 1;
      const evidence = [ev(F.line, F.text)];
      if (promo) evidence.push(ev(promo.line, promo.text));
      const g = {
        prefix: p,
        area,
        marker: F.text,
        line: F.line,
        ratifiedFrom: from,
        frozenUntil: Math.min(nextMarker, closure + 1) - 1,
        evidence,
      };
      if (!best || g.line > best.line) best = g;
    }
    if (best) governing.set(p, best);
  }

  const resolutions = new Map<string, OccurrenceResolution>();
  const resolvedIds: ResolvedId[] = [];
  const unresolvedIds: UnresolvedId[] = [];
  const decided = new Set<string>();
  const accept = (sid: string, r: OccurrenceResolution[], canonicalKey: string | null) => {
    const occ = bySid.get(sid) as ResolverOccurrence[];
    r.forEach((x) => resolutions.set(x.key, x));
    resolvedIds.push({
      sourceId: sid,
      outcome: canonicalKey ? "CANONICAL_SELECTED" : "NO_CANONICAL_DEFINITION",
      rules: [...new Set(r.map((x) => x.rule))].sort(),
      canonicalKey,
      occurrences: occ.length,
    });
    decided.add(sid);
  };
  const compatible = (o: ResolverOccurrence, c: ResolverOccurrence) =>
    (o.title === null || (c.title ?? "").includes(o.title)) && !CHANGE_RE.test(sectionText(o));

  /** Selección canónica común (R3/R4): previas superadas, posteriores confirmación. */
  const settle = (
    sid: string,
    c: ResolverOccurrence,
    rule: SupersessionRule,
    canonicalEvidence: SupersessionEvidence[],
    stageEvidence: SupersessionEvidence[],
    frozenStatementEvidence: SupersessionEvidence[] | null,
    frozenFrom: number | null,
  ): string | null => {
    const occ = bySid.get(sid) as ResolverOccurrence[];
    const out: OccurrenceResolution[] = [];
    for (const o of occ) {
      if (o.key === c.key) continue;
      const l = local.get(o.key);
      if (l) {
        out.push(l);
        continue;
      }
      if (o.backlog) continue;
      if (o.line < c.line) {
        const kind: SupersessionKind =
          frozenStatementEvidence && frozenFrom !== null && c.line >= frozenFrom
            ? o.line >= (governing.get(o.prefix)?.ratifiedFrom ?? Infinity)
              ? "SUPERSEDED_BY_FROZEN_STATEMENT"
              : "SUPERSEDED_BY_GOVERNED_STAGE"
            : "SUPERSEDED_BY_GOVERNED_STAGE";
        out.push({
          key: o.key,
          kind,
          rule,
          canonicalKey: c.key,
          evidence:
            kind === "SUPERSEDED_BY_FROZEN_STATEMENT"
              ? (frozenStatementEvidence as SupersessionEvidence[])
              : stageEvidence,
        });
      } else if (compatible(o, c)) {
        out.push({
          key: o.key,
          kind: "RESTATEMENT_OF_CANONICAL",
          rule,
          canonicalKey: c.key,
          evidence: canonicalEvidence,
        });
      } else {
        return `ocurrencia L${o.line} posterior a la definición canónica L${c.line} con título o cuerpo no compatible`;
      }
    }
    out.push({ key: c.key, kind: "CANONICAL_SELECTED", rule, evidence: canonicalEvidence });
    accept(sid, out, c.key);
    return null;
  };

  for (const [sid, occ] of bySid) {
    const p = (occ[0] as ResolverOccurrence).prefix;
    const g = governing.get(p);
    if (!g) continue;
    const famInScope = occurrences.some(
      (o) =>
        o.prefix === p &&
        inScope(o) &&
        !local.has(o.key) &&
        o.line >= g.ratifiedFrom &&
        o.line <= g.frozenUntil,
    );
    if (!famInScope) continue;
    const rem = occ.filter((o) => inScope(o) && !local.has(o.key));
    if (rem.length === 0) {
      if (occ.some((o) => local.has(o.key)))
        accept(
          sid,
          occ.filter((o) => local.has(o.key)).map((o) => local.get(o.key) as OccurrenceResolution),
          null,
        );
      continue;
    }
    const inA = rem.filter((o) => o.line >= g.line && o.line <= g.frozenUntil);
    const inB = rem.filter((o) => o.line >= g.ratifiedFrom && o.line < g.line);
    const tier = inA.length ? inA : inB;
    if (tier.length === 0) {
      if (rem.some((o) => o.line > g.frozenUntil)) {
        if (occ.length > 1)
          unresolvedIds.push({
            sourceId: sid,
            reason: `familia ${p} congelada en L${g.line} pero ${sid} solo aparece fuera del ámbito congelado, también después de él`,
            occurrences: occ.map((o) => o.line),
          });
        decided.add(sid);
        continue;
      }
      const out = occ
        .filter((o) => !o.backlog)
        .map(
          (o) =>
            local.get(o.key) ?? {
              key: o.key,
              kind: "NOT_IN_FROZEN_ARCHITECTURE" as const,
              rule: "GOVERNED_FREEZE" as const,
              evidence: g.evidence,
            },
        );
      accept(sid, out, null);
      continue;
    }
    if (occ.length === 1) {
      decided.add(sid); // única definición dentro del ámbito: sin cambio de clasificación
      continue;
    }
    if (tier.length > 1 && !tier.every((o) => sameDefinition(o, tier[0] as ResolverOccurrence))) {
      unresolvedIds.push({
        sourceId: sid,
        reason: `varias definiciones distintas dentro del ámbito gobernado por ${g.marker} (L${g.line})`,
        occurrences: occ.map((o) => o.line),
      });
      decided.add(sid);
      continue;
    }
    const c = tier[0] as ResolverOccurrence;
    if (c.draftHeading) {
      unresolvedIds.push({
        sourceId: sid,
        reason: `la definición dentro del ámbito gobernado (L${c.line}) está marcada como borrador en su heading`,
        occurrences: occ.map((o) => o.line),
      });
      decided.add(sid);
      continue;
    }
    const inFrozen = inA.length > 0;
    const canonicalEvidence = inFrozen ? [g.evidence[0] as SupersessionEvidence] : g.evidence;
    const why = settle(
      sid,
      c,
      "GOVERNED_FREEZE",
      canonicalEvidence,
      g.evidence.length > 1 ? [g.evidence[1] as SupersessionEvidence] : g.evidence,
      inFrozen ? [g.evidence[0] as SupersessionEvidence] : null,
      inFrozen ? g.line : null,
    );
    if (why)
      unresolvedIds.push({ sourceId: sid, reason: why, occurrences: occ.map((o) => o.line) });
    decided.add(sid);
  }

  /* ---------------- R4 · heading con token de congelación ---------------- */
  for (const [sid, occ] of bySid) {
    if (decided.has(sid)) continue;
    const frozen = occ.filter((o) => inScope(o) && FREEZE_RE.test(o.heading));
    if (frozen.length === 0) continue;
    if (frozen.length > 1) {
      unresolvedIds.push({
        sourceId: sid,
        reason: `${frozen.length} headings con token de congelación (${frozen.map((o) => `L${o.line}`).join(", ")}): la fuente no identifica cuál rige`,
        occurrences: occ.map((o) => o.line),
      });
      decided.add(sid);
      continue;
    }
    const c = frozen[0] as ResolverOccurrence;
    const e = [ev(c.line, c.heading)];
    const why = settle(sid, c, "FROZEN_HEADING", e, e, null, null);
    if (why)
      unresolvedIds.push({ sourceId: sid, reason: why, occurrences: occ.map((o) => o.line) });
    decided.add(sid);
  }

  /* ---------------- R5 · duplicado literal ---------------- */
  for (const [sid, occ] of bySid) {
    if (decided.has(sid) || occ.length < 2) continue;
    const rem = occ.filter((o) => inScope(o) && !local.has(o.key));
    const f = rem[0];
    if (
      f &&
      !f.draftHeading &&
      rem.length >= 2 &&
      rem.every((o) => sameDefinition(o, f)) &&
      occ.every((o) => inScope(o))
    ) {
      const out = occ.map(
        (o): OccurrenceResolution =>
          local.get(o.key) ??
          (o.key === f.key
            ? {
                key: o.key,
                kind: "CANONICAL_SELECTED",
                rule: "VERBATIM_DUPLICATE",
                evidence: [ev(f.line, f.heading)],
              }
            : {
                key: o.key,
                kind: "RESTATEMENT_OF_CANONICAL",
                rule: "VERBATIM_DUPLICATE",
                canonicalKey: f.key,
                evidence: [ev(o.line, o.heading)],
              }),
      );
      accept(sid, out, f.key);
    }
  }

  /* ---------------- sin resolver: solo evidencias locales ---------------- */
  for (const [sid, occ] of bySid) {
    if (resolvedIds.some((r) => r.sourceId === sid)) continue;
    const loc = occ.filter((o) => local.has(o.key));
    const all = occ.filter((o) => inScope(o));
    if (occ.filter((o) => !o.backlog).length < 2 && loc.length === 0) continue;
    if (loc.length > 0 && loc.length === all.length) {
      accept(
        sid,
        loc.map((o) => local.get(o.key) as OccurrenceResolution),
        null,
      );
      continue;
    }
    loc.forEach((o) => resolutions.set(o.key, local.get(o.key) as OccurrenceResolution));
    if (occ.length > 1 && !unresolvedIds.some((u) => u.sourceId === sid))
      unresolvedIds.push({
        sourceId: sid,
        reason: "sin evidencia explícita de supersesión en la fuente (la cronología no decide)",
        occurrences: occ.map((o) => o.line),
      });
  }

  return {
    resolutions,
    resolvedIds: resolvedIds.sort((a, b) => (a.sourceId < b.sourceId ? -1 : 1)),
    unresolvedIds: unresolvedIds.sort((a, b) => (a.sourceId < b.sourceId ? -1 : 1)),
    governingFreezes: [...governing.values()]
      .map(({ evidence: _e, ...g }) => g)
      .sort((a, b) => (a.prefix < b.prefix ? -1 : 1)),
  };
}
