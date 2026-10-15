import { createLovableGatewayClient, type LlmGatewayClient } from "./llm-gateway-client.server";
import {
  MAX_OUTPUT_TOKENS,
  MODELO_IA,
  PROMPT_VERSION,
  catalogoCanonico,
  construirPrompt,
  costoEstimadoUsd,
  validarEntrada,
  verificarSalida,
  ESQUEMA_SALIDA,
  type PaginaTexto,
  type ResultadoVerificacion,
} from "./interpretacion-documental";

export interface InterpretacionResultado {
  ok: boolean;
  error?: string;
  status?: number;
  traza: {
    provider: string;
    model: string;
    promptVersion: string;
    runId: string | null;
    packId: string;
    packVersion: string;
    packChecksum: string;
    inputTokens: number | null;
    outputTokens: number | null;
    costoEstimadoUsd: number | null;
    durationMs: number | null;
  };
  resultado?: ResultadoVerificacion;
  propuestasBrutas?: number;
}

export async function interpretarDocumento(
  paginas: PaginaTexto[],
  capabilityId = "DG-01",
  client?: LlmGatewayClient,
): Promise<InterpretacionResultado> {
  const cat = catalogoCanonico(capabilityId);
  const baseTraza = {
    provider: client?.provider ?? "lovable-ai-gateway",
    model: MODELO_IA,
    promptVersion: PROMPT_VERSION,
    runId: null,
    packId: cat.packId,
    packVersion: cat.packVersion,
    packChecksum: cat.packChecksum,
    inputTokens: null,
    outputTokens: null,
    costoEstimadoUsd: null,
    durationMs: null,
  };
  const err = validarEntrada(paginas);
  if (err) return { ok: false, error: err, status: 400, traza: baseTraza };
  let c = client;
  if (!c) {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { ok: false, error: "Servicio de IA no configurado.", status: 401, traza: baseTraza };
    c = createLovableGatewayClient(key);
  }
  const { system, user } = construirPrompt(cat, paginas);
  const r = await c.completeJson({
    model: MODELO_IA,
    system,
    user,
    schemaName: "propuestas_documentales",
    schema: ESQUEMA_SALIDA as unknown as Record<string, unknown>,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
  });
  if (!r.ok) {
    console.error("[ia-documental]", r.status, r.message, r.runId);
    return { ok: false, error: r.message, status: r.status, traza: { ...baseTraza, runId: r.runId } };
  }
  const resultado = verificarSalida(cat, paginas, r.json);
  const brutas = Array.isArray((r.json as any)?.propuestas) ? (r.json as any).propuestas.length : 0;
  return {
    ok: true,
    traza: {
      ...baseTraza,
      provider: r.provider,
      runId: r.runId,
      inputTokens: r.usage.inputTokens,
      outputTokens: r.usage.outputTokens,
      costoEstimadoUsd: costoEstimadoUsd(r.usage.inputTokens, r.usage.outputTokens),
      durationMs: r.durationMs,
    },
    resultado,
    propuestasBrutas: brutas,
  };
}
