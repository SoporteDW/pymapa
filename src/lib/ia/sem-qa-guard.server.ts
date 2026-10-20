/**
 * SEM-QA-01 · Guarda fail-closed previa a cualquier transmisión al Gateway
 * documental (DEC-047). Exige simultáneamente:
 *  1. Organización con autorización sintética activa (registro existente) Y
 *     autorización SEM-QA-01 activa con el checksum del corpus aprobado.
 *  2. Usuario autenticado OWNER/ADMIN en esa organización (lectura con RLS).
 *  3. executionId === "SEM-QA-01".
 *  4. Procedencia: el corpus del build coincide con su checksum fijado y con el
 *     checksum autorizado en base de datos.
 *  5. Marca SYNTHETIC_QA_ONLY en el texto extraído por el servidor.
 *  6. documentId de la lista cerrada y SHA-256 del archivo original idéntico.
 *  7. Archivo (storage) → versión de evidencia → texto extraído → checksum
 *     enlazados por el servidor; el texto del cliente nunca se usa.
 * Toda decisión (aceptada o rechazada) se audita en semantic_qa_attempts SIN
 * contenido documental. Solo una autorización emitida aquí habilita
 * interpretarDocumento().
 */
import {
  SEM_QA_01_CORPUS,
  SEM_QA_01_CORPUS_CHECKSUM,
  SEM_QA_CAPABILITY,
  SEM_QA_CORPUS_VERSION,
  SEM_QA_EXECUTION_ID,
  SEM_QA_MARKER,
  checksumCorpus,
  sha256Texto,
  textoCanonico,
} from "./sem-qa-corpus";
import type { PaginaTexto } from "./interpretacion-documental";

export type MotivoRechazoSemQa =
  | "EXECUTION_NOT_AUTHORIZED"
  | "DOCUMENT_NOT_IN_CORPUS"
  | "CORPUS_PROVENANCE_MISMATCH"
  | "ROLE_NOT_ALLOWED"
  | "ORGANIZATION_NOT_SYNTHETIC_AUTHORIZED"
  | "ORGANIZATION_NOT_SEMQA_AUTHORIZED"
  | "EVIDENCE_NOT_IN_ORGANIZATION"
  | "EVIDENCE_WITHOUT_FILE"
  | "EVIDENCE_FILE_UNAVAILABLE"
  | "FILE_CHECKSUM_MISMATCH"
  | "EVIDENCE_VERSION_CHECKSUM_MISMATCH"
  | "TEXT_EXTRACTION_FAILED"
  | "SYNTHETIC_MARKER_MISSING"
  | "TEXT_CHECKSUM_MISMATCH";

export class SemQaRechazo extends Error {
  constructor(readonly motivo: MotivoRechazoSemQa) {
    super(`SEM_QA_REJECTED:${motivo}`);
  }
}

export interface AutorizacionSemQa {
  readonly executionId: string;
  readonly organizationId: string;
  readonly userId: string;
  readonly documentId: string;
  readonly evidenceId: string;
  readonly evidenceVersionId: string;
  readonly fileSha256: string;
  readonly textSha256: string;
  readonly corpusChecksum: string;
  readonly paginas: readonly PaginaTexto[];
}

// Solo los objetos emitidos por esta guarda son válidos (no falsificables por cast).
const emitidas = new WeakSet<object>();
export function esAutorizacionSemQaValida(a: unknown): a is AutorizacionSemQa {
  return typeof a === "object" && a !== null && emitidas.has(a);
}

export interface EntradaSemQa {
  executionId: string;
  documentId: string;
  evidenceId: string;
}

type Ctx = { userId: string; supabase: unknown };

export interface RegistroIntento {
  organization_id: string | null;
  user_id: string;
  execution_id: string;
  document_id: string;
  evidence_id: string | null;
  outcome: "REJECTED" | "TRANSMITTED_OK" | "TRANSMITTED_ERROR";
  rejection_reason: string | null;
  file_sha256: string | null;
  text_sha256: string | null;
  corpus_checksum: string;
  provider?: string | null;
  model?: string | null;
  run_id?: string | null;
  prompt_version?: string | null;
  verified_count?: number | null;
  discarded_count?: number | null;
  contradiction_count?: number | null;
  result_summary?: unknown;
}

export async function registrarIntento(r: RegistroIntento): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("semantic_qa_attempts" as never).insert(r as never);
  if (error) console.error("[sem-qa] auditoría", error.message);
}

/**
 * Ejecuta TODAS las comprobaciones. Lanza SemQaRechazo (auditado) ante
 * cualquier fallo, antes de que exista posibilidad de transmisión externa.
 */
export async function autorizarSemQa(context: Ctx, entrada: EntradaSemQa): Promise<AutorizacionSemQa> {
  const base: RegistroIntento = {
    organization_id: null,
    user_id: context.userId,
    execution_id: String(entrada.executionId).slice(0, 40),
    document_id: String(entrada.documentId).slice(0, 40),
    evidence_id: entrada.evidenceId,
    outcome: "REJECTED",
    rejection_reason: null,
    file_sha256: null,
    text_sha256: null,
    corpus_checksum: SEM_QA_01_CORPUS_CHECKSUM,
  };
  const rechazar = async (motivo: MotivoRechazoSemQa): Promise<never> => {
    await registrarIntento({ ...base, rejection_reason: motivo });
    throw new SemQaRechazo(motivo);
  };

  // 3 · 6 · 4 — comprobaciones sin acceso a datos.
  if (entrada.executionId !== SEM_QA_EXECUTION_ID) await rechazar("EXECUTION_NOT_AUTHORIZED");
  const doc = SEM_QA_01_CORPUS.find((d) => d.documentId === entrada.documentId);
  if (!doc) return rechazar("DOCUMENT_NOT_IN_CORPUS");
  if ((await checksumCorpus()) !== SEM_QA_01_CORPUS_CHECKSUM) await rechazar("CORPUS_PROVENANCE_MISMATCH");

  // 2 · 1 — identidad del propio usuario (RLS), nunca del cliente.
  const runtime = await import("@/lib/production/runtime.server");
  type Cliente = Parameters<typeof runtime.asegurarContextoProductivo>[0];
  const client = context.supabase as Cliente;
  const assessment = await runtime.asegurarContextoProductivo(client, context.userId, SEM_QA_CAPABILITY);
  const org = assessment.organizationId;
  base.organization_id = org;
  const { data: membership } = await client.from("memberships").select("role")
    .eq("organization_id", org).eq("user_id", context.userId).maybeSingle();
  const rol = (membership as { role?: string } | null)?.role ?? null;
  if (rol !== "OWNER" && rol !== "ADMIN") await rechazar("ROLE_NOT_ALLOWED");
  const { data: sintetica } = await client.from("synthetic_qa_ingestion_authorizations")
    .select("organization_id").eq("organization_id", org).eq("active", true).maybeSingle();
  if (!sintetica) await rechazar("ORGANIZATION_NOT_SYNTHETIC_AUTHORIZED");
  const { data: semqa } = await client.from("semantic_qa_authorizations" as never)
    .select("corpus_checksum, corpus_version")
    .eq("organization_id" as never, org as never).eq("execution_id" as never, SEM_QA_EXECUTION_ID as never)
    .eq("active" as never, true as never).maybeSingle();
  const autor = semqa as { corpus_checksum?: string; corpus_version?: string } | null;
  if (!autor) await rechazar("ORGANIZATION_NOT_SEMQA_AUTHORIZED");
  if (autor!.corpus_checksum !== SEM_QA_01_CORPUS_CHECKSUM || autor!.corpus_version !== SEM_QA_CORPUS_VERSION) {
    await rechazar("CORPUS_PROVENANCE_MISMATCH");
  }

  // 7 — evidencia de la propia organización (RLS) con archivo real.
  const { data: evidencia } = await client.from("evidence")
    .select("id, organization_id, storage_bucket, storage_path")
    .eq("id", entrada.evidenceId).eq("organization_id", org).maybeSingle();
  if (!evidencia) await rechazar("EVIDENCE_NOT_IN_ORGANIZATION");
  if (!evidencia!.storage_bucket || !evidencia!.storage_path) await rechazar("EVIDENCE_WITHOUT_FILE");
  const descarga = await client.storage.from(evidencia!.storage_bucket!).download(evidencia!.storage_path!);
  if (descarga.error || !descarga.data) return rechazar("EVIDENCE_FILE_UNAVAILABLE");
  const bytes = new Uint8Array(await descarga.data.arrayBuffer());
  const { sha256Hex, extraerPdf } = await import("@/lib/document-first/pdf-texto");
  const fileSha = await sha256Hex(bytes);
  base.file_sha256 = fileSha;
  if (fileSha !== doc.fileSha256) await rechazar("FILE_CHECKSUM_MISMATCH");

  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const previa = await db.from("evidence_versions").select("id, content_sha256")
    .eq("organization_id", org).eq("evidence_id", evidencia!.id).eq("version_number", 1).maybeSingle();
  let versionId: string;
  if (previa.data) {
    if (previa.data.content_sha256 !== doc.fileSha256) await rechazar("EVIDENCE_VERSION_CHECKSUM_MISMATCH");
    versionId = previa.data.id;
  } else {
    const ver = await db.from("evidence_versions").insert({
      organization_id: org, evidence_id: evidencia!.id, version_number: 1, content_sha256: fileSha,
      storage_bucket: evidencia!.storage_bucket, storage_path: evidencia!.storage_path,
      mime_type: "application/pdf", byte_size: bytes.length, created_by: context.userId,
    }).select("id").single();
    if (ver.error || !ver.data) return rechazar("EVIDENCE_VERSION_CHECKSUM_MISMATCH");
    versionId = ver.data.id;
  }

  let extraido: Awaited<ReturnType<typeof extraerPdf>>;
  try {
    extraido = await extraerPdf(bytes);
  } catch {
    return rechazar("TEXT_EXTRACTION_FAILED");
  }
  const texto = textoCanonico(extraido.textoPorPagina);
  if (!texto.includes(SEM_QA_MARKER)) await rechazar("SYNTHETIC_MARKER_MISSING");
  const textSha = await sha256Texto(texto);
  base.text_sha256 = textSha;
  if (textSha !== doc.textSha256 || extraido.paginas !== doc.pages) await rechazar("TEXT_CHECKSUM_MISMATCH");

  const paginas = Object.entries(extraido.textoPorPagina).map(([p, t]) => ({ pagina: Number(p), texto: t }));
  const autorizacion: AutorizacionSemQa = Object.freeze({
    executionId: SEM_QA_EXECUTION_ID,
    organizationId: org,
    userId: context.userId,
    documentId: doc.documentId,
    evidenceId: evidencia!.id,
    evidenceVersionId: versionId,
    fileSha256: fileSha,
    textSha256: textSha,
    corpusChecksum: SEM_QA_01_CORPUS_CHECKSUM,
    paginas: Object.freeze(paginas),
  });
  emitidas.add(autorizacion);
  return autorizacion;
}
