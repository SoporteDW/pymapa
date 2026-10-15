/**
 * Rebanada vertical IA real · DG-01. Llamadas reales al gateway (máx. 10, sin reintentos).
 * Uso: bun scripts/ia-vertical-slice.ts <pdf>...   → imprime JSON por documento.
 */
import { readFileSync } from "node:fs";
import { extraerPdf } from "../src/lib/document-first/pdf-texto";
import { interpretarDocumento } from "../src/lib/ia/interpretar-documento.server";

const MAX_LLAMADAS = 10;
const files = process.argv.slice(2);
if (files.length > MAX_LLAMADAS) throw new Error("Supera el máximo de llamadas autorizadas");
for (const f of files) {
  const doc = await extraerPdf(new Uint8Array(readFileSync(f)));
  const paginas = Object.entries(doc.textoPorPagina).map(([p, texto]) => ({ pagina: Number(p), texto }));
  const r = await interpretarDocumento(paginas, "DG-01");
  console.log(JSON.stringify({ archivo: f.split("/").pop(), sha256: doc.sha256, ...r }, null, 1));
}
