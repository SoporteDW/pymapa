/**
 * Reporte de revisión humana por capacidad.
 *
 * Permite aprobar o rechazar una capacidad SIN revisar manualmente el código
 * del engine: todo lo relevante (contenido, procedencia, transformaciones,
 * gaps, juicios gobernados, construcciones no soportadas, fixtures, pruebas y
 * diferencias respecto de la fuente) queda en el reporte.
 */
import type { CapabilityPipelineResult } from "./pipeline.ts";

function lista(items: string[]): string {
  return items.length === 0 ? "- (ninguno)\n" : items.map((i) => `- ${i}\n`).join("");
}

export function buildGovernanceReviewReport(result: CapabilityPipelineResult): string {
  const c = result.candidate;
  const lineas: string[] = [];
  lineas.push(`# Revisión de gobierno · ${result.capabilityId}\n`);
  lineas.push(
    `**Resultado del pipeline:** ${result.outcome} · **Estado:** ${result.state}\n`,
  );

  if (!c) {
    lineas.push("\n## Fuente rechazada\n");
    lineas.push(lista(result.sourceIssues.map((i) => `${i.path}: ${i.message}`)));
    lineas.push(lista(result.errors));
    return lineas.join("");
  }

  lineas.push("\n## Identidad y procedencia\n");
  lineas.push(
    lista([
      `Pack: ${c.packId}@${c.packVersion}`,
      `Master: ${c.provenance.masterIdentity} v${c.provenance.masterVersion} (${c.provenance.baselineStatus})`,
      `Fuente: ${c.provenance.sourceReference}`,
      `Checksum fuente: ${c.provenance.sourceChecksum}`,
      `Checksum candidato: ${c.checksum}`,
      `Generador: ${c.provenance.generator}`,
      `Derivación: ${c.provenance.derivation}`,
    ]),
  );

  lineas.push("\n## Contenido extraído\n");
  lineas.push(lista(c.provenance.generatedFromSections));

  lineas.push("\n## Transformaciones realizadas\n");
  lineas.push(lista(c.transformations.map((t) => `${t.kind} · ${t.path} — ${t.note}`)));

  lineas.push("\n## Diferencias respecto de la fuente\n");
  const diff = result.diff;
  lineas.push(
    lista([
      `contenido omitido: ${diff?.missingSourceContent.length ?? 0}`,
      `contenido añadido: ${diff?.addedContent.length ?? 0}`,
      `cambios semánticos: ${diff?.semanticChanges.length ?? 0}`,
      `pérdida de procedencia: ${diff?.provenanceLoss.length ?? 0}`,
      `mappings sin resolver preservados: ${diff?.unresolvedMappings.length ?? 0}`,
    ]),
  );

  lineas.push("\n## Gaps declarados\n");
  lineas.push(
    lista(
      c.gaps.map(
        (g) => `${g.id} · ${g.kind} · ${g.publicationBlocking ? "BLOQUEA PUBLICACIÓN" : "no bloqueante"} — ${g.statement}`,
      ),
    ),
  );

  const reglas = (c.pack["rules"] ?? []) as { id: string; classification: string }[];
  lineas.push("\n## Juicios gobernados\n");
  lineas.push(
    lista(
      reglas
        .filter((r) => r.classification !== "DETERMINISTIC")
        .map((r) => `${r.id} · ${r.classification}`),
    ),
  );

  lineas.push("\n## Construcciones no soportadas por el runtime\n");
  lineas.push(
    lista(
      (result.validation?.issues ?? [])
        .filter((i) => i.code === "GENERIC_RUNTIME_EXTENSION_REQUIRED")
        .map((i) => `${i.path}: ${i.message}`),
    ),
  );

  lineas.push("\n## Fixtures y pruebas\n");
  lineas.push(
    lista([
      ...(result.knowledgeTests?.checks ?? []).map(
        (ch) => `knowledge test ${ch.check}: ${ch.ok ? "PASS" : "FAIL"} — ${ch.detail}`,
      ),
      ...result.runtimeResults.map((r) => `runtime ${r.fixtureId} (${r.kind}): ${r.outcome}`),
    ]),
  );

  lineas.push("\n## Puerta de publicación\n");
  lineas.push(
    lista([
      `estado: ${result.publication?.state ?? "n/d"}`,
      ...(result.publication?.blockers ?? []).map((b) => `bloqueo ${b.code}: ${b.message}`),
    ]),
  );

  if (result.goldenRegression?.compared) {
    lineas.push("\n## Regresión Golden Pack\n");
    lineas.push(
      lista([
        `equivalente al pack publicado: ${result.goldenRegression.equivalent ? "sí" : "no"}`,
        `inmutabilidad del pack publicado: ${result.goldenRegression.immutability.ok ? "intacta" : "VIOLADA"}`,
        ...result.goldenRegression.differences.map((d) => `diferencia en ${d.path}`),
      ]),
    );
  }

  if (result.errors.length > 0) {
    lineas.push("\n## Errores\n");
    lineas.push(lista(result.errors));
  }

  lineas.push(
    "\n> Aprobar o rechazar es una decisión de gobierno editorial. El pipeline nunca publica por sí solo.\n",
  );
  return lineas.join("");
}

export function buildBatchSummaryMarkdown(
  resumen: { capabilityId: string; outcome: string; state: string }[],
): string {
  const filas = resumen
    .map((r) => `| ${r.capabilityId} | ${r.outcome} | ${r.state} |`)
    .join("\n");
  return `| Capability | Resultado | Estado |\n| --- | --- | --- |\n${filas}\n`;
}
