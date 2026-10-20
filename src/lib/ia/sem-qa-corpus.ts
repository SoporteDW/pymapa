/**
 * SEM-QA-01 · Corpus sintético aprobado (DEC-047). Lista cerrada, fijada en
 * build: identidad documental + checksum del archivo original + checksum del
 * texto extraído por el servidor. Ningún dato del cliente puede ampliarla.
 * Documentos generados por docs/evidence/sem-qa-01/make_corpus.py (ficticios).
 */
export const SEM_QA_EXECUTION_ID = "SEM-QA-01";
export const SEM_QA_MARKER = "SYNTHETIC_QA_ONLY";
export const SEM_QA_CORPUS_VERSION = "SEM-QA-01-CORPUS-1.0.0";
export const SEM_QA_CAPABILITY = "DG-01";

export interface DocumentoCorpus {
  documentId: string;
  fileSha256: string;
  textSha256: string;
  pages: number;
}

export const SEM_QA_01_CORPUS: readonly DocumentoCorpus[] = Object.freeze([
  { documentId: "SEMQA01-S1", fileSha256: "67aff2ad3acc0fced5b9602ddaf0715343e7ef90a15786f865df9f1ea4bddca4", textSha256: "8f371c228d0b5d87b68351b5e551ccdacd95cadfa00e4541650c51228a56cb2d", pages: 1 },
  { documentId: "SEMQA01-S2", fileSha256: "f1295caa175426168c4e15e1990dc5ceb85bac594e647d926c986fe66c54724f", textSha256: "fadcf5caf5d1eaa4a990d644f40eb2042d56194ee07c995f946b45c7e38069cf", pages: 1 },
  { documentId: "SEMQA01-S3", fileSha256: "1b9f5cd4ded79c1bd336757f5ac8990ac7136f47409b1d01379059cbbebb049d", textSha256: "83d12bead8e7a9e4da286a2647b37fcd8d55816c47824c26001ca0b649ce833a", pages: 1 },
  { documentId: "SEMQA01-S4", fileSha256: "4db40f5d18595e91f83d4e107dda8d489e0a07dac53c70d15d93a086ef2ed2bd", textSha256: "a7173c66a222bcf1830a96d039b75bd7ce7f2f3a109b88af202811ddda27f3be", pages: 2 },
  { documentId: "SEMQA01-S5", fileSha256: "ed6343390b8cc074a02bef87512ebf86e96378ba66894c7e9d44227c2d85c3db", textSha256: "a5413d6ca1eade604c805c0e2cb527b55e894fe221ac764584074704f8cd1b28", pages: 1 },
]);

/** Checksum compuesto del corpus; debe coincidir con la autorización en base de datos. */
export const SEM_QA_01_CORPUS_CHECKSUM = "6670bfdfb498210f202bd319d70bcb7bd40713d99cd40b383156914a6faa8f59";

export function lineaCorpus(d: DocumentoCorpus): string {
  return `${d.documentId}|${d.fileSha256}|${d.textSha256}|${d.pages}`;
}

export async function sha256Texto(t: string): Promise<string> {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export async function checksumCorpus(c: readonly DocumentoCorpus[] = SEM_QA_01_CORPUS): Promise<string> {
  return sha256Texto(c.map(lineaCorpus).join("\n"));
}

/** Serialización canónica del texto extraído (misma que la ingesta sintética). */
export function textoCanonico(textoPorPagina: Record<string | number, string>): string {
  return Object.entries(textoPorPagina).map(([p, t]) => `${p}\n${t}`).join("\n\f\n");
}
