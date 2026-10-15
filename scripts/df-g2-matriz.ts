/**
 * Document-First · Compuerta G2 · Genera PROD_CANONICAL_VERTICAL_SLICE.csv
 * leyendo SOLO los packs publicados (sin editarlos). IDs inexistentes quedan vacíos
 * con justificación. Uso: bun scripts/df-g2-matriz.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

interface Acq { id: string; acquisitionMode: string; informationNeedRef?: string; variableRefs?: string[]; question?: string }
interface Pack { packId: string; packVersion: string; acquisitions: Acq[]; informationNeeds?: { id: string; statement: string; variableRefs: string[]; mappingStatus?: string }[] }

const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const filas: string[][] = [];
for (const id of ["dg-01", "cm-05"]) {
  const pack = JSON.parse(readFileSync(`knowledge/packs/${id}/1.0.0/pack.json`, "utf8")) as Pack;
  const pub = JSON.parse(readFileSync(`knowledge/packs/${id}/1.0.0/published.json`, "utf8")) as { checksum: string };
  for (const a of pack.acquisitions) {
    const ni = pack.informationNeeds?.find((n) => n.id === a.informationNeedRef);
    const progresiva = a.acquisitionMode === "CAPABILITY_PROGRESSIVE";
    filas.push([
      pack.packId.toUpperCase(), `${pack.packVersion} (${pub.checksum.slice(0, 19)}…)`, a.id,
      "", // ceId
      progresiva ? "" : (a.variableRefs ?? []).join("|"),
      ni?.id ?? "",
      progresiva
        ? `CAPABILITY_PROGRESSIVE · ${a.variableRefs?.length ?? 0} VA sin correspondencia individual: target solo ACQUISITION (C5)`
        : `${ni?.mappingStatus ?? a.acquisitionMode} · NI→VA declarado en el pack`,
      "", // sourceFragment: ningún fragmento admitido todavía
      "HUMAN_VALIDATION (ADMIN/OWNER vía validate_fragment_mapping) o GOVERNED_RULE aprobada; semejanza semántica no admite",
      progresiva
        ? "Adquisición respondida ≠ VA/NI suficiente; VA siguen UNKNOWN hasta correspondencia factual gobernada"
        : "Suficiencia NOT_EXPLICIT_IN_KNOWLEDGE_MASTER: pendiente de gobierno; cobertura no declara NI_SUFFICIENT",
    ]);
  }
}
const cab = "capabilityId,packVersion,acquisitionId,ceId,vaId,niId,mappingBasis,sourceFragment,admissionRule,expectedGap";
mkdirSync("docs/document-first", { recursive: true });
writeFileSync("docs/document-first/PROD_CANONICAL_VERTICAL_SLICE.csv", [cab, ...filas.map((f) => f.map(esc).join(","))].join("\n") + "\n");
console.log(`filas=${filas.length}`);
