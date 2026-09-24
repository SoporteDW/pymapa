/**
 * M2-FACTORY-CONTRACT-03 · baseline aceptada → source.json → fixtures genéricos.
 * Genérico: el mismo código para cada capacidad; ningún mapeo por capacidad.
 *   bun run scripts/knowledge-contract03.ts [--write]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { projectBaselineToRunnableSource } from "../packages/knowledge-pipeline/src/runnable-projection.ts";

const ROOT = join(import.meta.dir, "..");
const CAPS = join(ROOT, "knowledge/master/v1.0/capabilities");
const write = process.argv.includes("--write");
const prev = JSON.parse(
  readFileSync(join(ROOT, "knowledge/factory/reports/runnable-projection.json"), "utf8"),
) as { c: string; name: string }[];
const TARGETS = prev.map((p) => p.c);
const json = (v: unknown) => `${JSON.stringify(v, null, 2)}\n`;

const report: unknown[] = [];
for (const c of TARGETS) {
  const dir = join(CAPS, c);
  const baseline = JSON.parse(readFileSync(join(dir, "canonical-baseline.json"), "utf8"));
  const raw = readFileSync(join(dir, baseline.rawSource.ref), "utf8");
  const name = prev.find((p) => p.c === c)!.name;
  const literal = `${c} · ${name}`;
  const line = raw.split("\n").findIndex((l) => l.replace(/^#{1,9}\s+/, "").trim() === literal) + 1;
  const decisionPath = join(ROOT, "knowledge/intake", c, "ni-va-mapping-decision.json");
  const governedOrdinalMapping = existsSync(decisionPath)
    ? JSON.parse(readFileSync(decisionPath, "utf8"))
    : undefined;
  const r = projectBaselineToRunnableSource(
    baseline,
    line ? { name, literalLine: line } : null,
    raw,
    governedOrdinalMapping ? { governedOrdinalMapping } : {},
  );
  report.push({
    c,
    name,
    ok: r.ok,
    stats: r.stats,
    ordinalMapping: r.ordinalMapping ?? null,
    definition: r.definition && {
      status: r.definition.status,
      sourceLines: r.definition.sourceLines,
      marker: r.definition.marker,
      candidates: r.definition.candidates.map((x) => ({
        lines: x.sourceLines,
        marker: x.marker,
        qualifier: x.qualifier,
        disposition: x.disposition,
      })),
    },
    gaps: ((r.source?.["gaps"] as { id: string; publicationBlocking: boolean }[]) ?? []).map(
      (g) => `${g.id}${g.publicationBlocking ? " [BLOCKING]" : ""}`,
    ),
    blockers: r.blockers.map((b) => `${b.class}:${b.code}`),
    checksum: r.checksum,
  });
  if (!write || !r.source) continue;
  writeFileSync(join(dir, "source.json"), json(r.source));
  const packId = c.toLowerCase();
  const fx = join(ROOT, "knowledge/fixtures", packId);
  mkdirSync(fx, { recursive: true });
  const base = {
    capabilityId: c,
    packId,
    packVersion: "1.0.0",
    kind: "ARCHITECTURE_RUNTIME",
    knowledgeVersionId: `fixture-kv-${packId}-1.0.0`,
  };
  writeFileSync(
    join(fx, `${packId}-no-observations.fixture.json`),
    json({
      fixtureId: `${c}-FX-NO-OBSERVATIONS`,
      ...base,
      description:
        "Sin observaciones: ninguna variable se cierra, no hay hallazgos; ausencia de brecha ≠ fortaleza.",
      observations: [],
      expected: {
        outcome: "PASS",
        contradictionVariableRefs: [],
        findingCandidateRefs: [],
        noConfirmedFindings: true,
      },
    }),
  );
  const acqs = (r.source["sections"] as { acquisitions: { id: string; variableRefs: string[] }[] })
    .acquisitions;
  if (acqs.length) {
    const obs = acqs.map((a, i) => ({
      id: `obs-unknown-${i + 1}`,
      variableRef: a.variableRefs[0]!,
      acquisitionRef: a.id,
      knowledgeState: "UNKNOWN",
      semanticValue: null,
      sourceResponseId: `resp-unknown-${i + 1}`,
      respondentId: "respondent-1",
      evidenceIds: [],
      recordedAt: "2026-01-01T00:00:00.000Z",
    }));
    const vars = [...new Set(obs.map((o) => o.variableRef))].sort();
    writeFileSync(
      join(fx, `${packId}-unknown-preserved.fixture.json`),
      json({
        fixtureId: `${c}-FX-UNKNOWN-PRESERVED`,
        ...base,
        description:
          "UNKNOWN explícito por cada canal de adquisición admitido: se preserva como UNKNOWN y nunca produce hallazgo.",
        observations: obs,
        expected: {
          outcome: "PASS",
          variableStates: vars.map((v) => ({
            variableRef: v,
            state: "UNKNOWN",
            semanticValue: null,
          })),
          contradictionVariableRefs: [],
          noConfirmedFindings: true,
        },
      }),
    );
  }
}
const out = join(ROOT, "knowledge/factory/reports/contract03-projection.json");
if (write) writeFileSync(out, json(report));
if (!write) writeFileSync("/tmp/contract03-dry.json", json(report));
console.log(JSON.stringify(report, null, 1).slice(0, 6000));
if (!existsSync(out) && write) process.exit(1);
