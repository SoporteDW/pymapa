/**
 * LlmGatewayClient · contrato desacoplado del proveedor de IA (solo servidor).
 *
 * La lógica diagnóstica depende solo de `LlmGatewayClient`; sustituir el
 * proveedor implica otra implementación de esta interfaz, nada más.
 * Sin reintentos automáticos: un fallo se devuelve tal cual al llamador.
 */

export interface LlmJsonRequest {
  model: string;
  system: string;
  user: string;
  schemaName: string;
  schema: Record<string, unknown>;
  maxOutputTokens: number;
}

export interface LlmUsage {
  inputTokens: number | null;
  outputTokens: number | null;
}

export interface LlmJsonResult {
  ok: true;
  json: unknown;
  rawText: string;
  provider: string;
  model: string;
  runId: string | null;
  usage: LlmUsage;
  durationMs: number;
}

export interface LlmError {
  ok: false;
  status: number;
  message: string;
  provider: string;
  model: string;
  runId: string | null;
}

export interface LlmGatewayClient {
  readonly provider: string;
  completeJson(req: LlmJsonRequest): Promise<LlmJsonResult | LlmError>;
}

const RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

/** Implementación sobre Lovable AI Gateway · OpenAI Responses (streaming SSE). */
export function createLovableGatewayClient(apiKey: string, baseURL = "https://ai.gateway.lovable.dev"): LlmGatewayClient {
  const provider = "lovable-ai-gateway";
  return {
    provider,
    async completeJson(req) {
      const t0 = Date.now();
      const res = await fetch(`${baseURL.replace(/\/+$/, "").replace(/\/v1$/, "")}/v1/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
        body: JSON.stringify({
          model: req.model,
          input: [
            { role: "system", content: req.system },
            { role: "user", content: req.user },
          ],
          stream: true,
          store: false,
          reasoning: { effort: "low", summary: "auto" },
          include: ["reasoning.encrypted_content"],
          max_output_tokens: req.maxOutputTokens,
          text: { format: { type: "json_schema", name: req.schemaName, strict: true, schema: req.schema } },
        }),
      });
      const runId = res.headers.get(RUN_ID_HEADER);
      if (!res.ok || !res.body) {
        let message = `HTTP ${res.status}`;
        try {
          const j = (await res.json()) as { error?: { message?: string }; message?: string };
          message = j.error?.message ?? j.message ?? message;
        } catch {
          /* cuerpo no JSON */
        }
        return { ok: false, status: res.status, message, provider, model: req.model, runId };
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let text = "";
      let usage: LlmUsage = { inputTokens: null, outputTokens: null };
      let streamError: string | null = null;
      let refusal: string | null = null;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i: number;
        while ((i = buf.indexOf("\n\n")) >= 0) {
          const frame = buf.slice(0, i);
          buf = buf.slice(i + 2);
          const data = frame
            .split("\n")
            .filter((l) => l.startsWith("data:"))
            .map((l) => l.slice(5).trim())
            .join("");
          if (!data || data === "[DONE]") continue;
          let ev: Record<string, any>;
          try {
            ev = JSON.parse(data);
          } catch {
            continue;
          }
          if (ev.type === "response.output_text.delta") text += ev.delta ?? "";
          else if (ev.type === "response.refusal.delta") refusal = (refusal ?? "") + (ev.delta ?? "");
          else if (ev.type === "response.completed" || ev.type === "response.incomplete") {
            const u = ev.response?.usage;
            usage = { inputTokens: u?.input_tokens ?? null, outputTokens: u?.output_tokens ?? null };
            if (ev.type === "response.incomplete") streamError = `incompleto: ${ev.response?.incomplete_details?.reason ?? "desconocido"}`;
          } else if (ev.type === "error" || ev.type === "response.failed") {
            streamError = ev.error?.message ?? ev.response?.error?.message ?? "error del modelo";
          }
        }
      }
      if (refusal) return { ok: false, status: 422, message: `El modelo rechazó la solicitud: ${refusal}`, provider, model: req.model, runId };
      if (streamError) return { ok: false, status: 502, message: streamError, provider, model: req.model, runId };
      if (!text.trim()) return { ok: false, status: 502, message: "El modelo no devolvió contenido", provider, model: req.model, runId };
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        return { ok: false, status: 502, message: "La salida del modelo no es JSON válido", provider, model: req.model, runId };
      }
      return { ok: true, json, rawText: text, provider, model: req.model, runId, usage, durationMs: Date.now() - t0 };
    },
  };
}
