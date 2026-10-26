#!/usr/bin/env bun
/**
 * KNOW-EXEC-03 · Genera candidatos de staging (no ejecutables) por capacidad.
 *   bun run scripts/knowledge-staging.ts            → reporta
 *   bun run scripts/knowledge-staging.ts --write    → escribe knowledge/staging/<cap>/
 *   bun run scripts/knowledge-staging.ts --check    → falla si staging está desactualizado
 * Nunca escribe en knowledge/packs, manifest ni registro runtime.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { translateCapability, type SemanticInput } from "@pymapa/knowledge-pipeline";

const LOTE = ["OP-03", "OP-04", "OP-05"];
const args = new Set(process.argv.slice(2));
const semantic = JSON.parse(
  readFileSync("knowledge/staging/_inputs/KNOW-EXEC-03-S.lote1.json", "utf8"),
) as SemanticInput;
let fallos = 0;
for (const cap of LOTE) {
  const baselinePath = `knowledge/master/v1.0/capabilities/${cap}/canonical-baseline.json`;
  const publishedPackPath = `knowledge/packs/${cap.toLowerCase()}/1.0.0/pack.json`;
  try {
    const c = translateCapability({
      capabilityId: cap,
      baselinePath,
      baseline: JSON.parse(readFileSync(baselinePath, "utf8")),
      publishedPackPath,
      publishedPack: JSON.parse(readFileSync(publishedPackPath, "utf8")),
      semantic,
    });
    const k = c.counts;
    console.log(`${cap}: ${k.rules} reglas · ${k.diagnostic} diagnósticas · ${k.guardrails} guardrails · ${k.withHfReference} con ref HF · ${k.composite} compuestas · ${k.exceptions} excepciones · ejecutables ${k.executable}`);
    const dir = join("knowledge/staging", cap);
    const out = `${JSON.stringify(c, null, 2)}\n`;
    const ruta = join(dir, "candidate.json");
    if (args.has("--write")) {
      mkdirSync(dir, { recursive: true });
      writeFileSync(ruta, out);
    } else if (args.has("--check") && (!existsSync(ruta) || readFileSync(ruta, "utf8") !== out)) {
      fallos++;
      console.error(`✗ ${ruta} desactualizado`);
    }
  } catch (e) {
    fallos++;
    console.error(`✗ ${cap}: ${(e as Error).message}`);
  }
}
process.exit(fallos ? 1 : 0);
