/**
 * PKG-02 · Entrada genérica de respuesta: KNOWN / UNKNOWN / NOT_APPLICABLE /
 * CONTRADICTORY. Sin escalas numéricas ni puntajes.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { ActionableAcquisition } from "@/lib/production/actionable";

export type KnowledgeStateInput = "KNOWN" | "UNKNOWN" | "NOT_APPLICABLE" | "CONTRADICTORY";

export interface AcquisitionAnswer {
  acquisitionId: string;
  knowledgeState: KnowledgeStateInput;
  semanticValue: string | null;
  notApplicableReason: string | null;
  rawInput?: Record<string, unknown>;
  conflictingObservationIds?: string[];
}

export interface ObservacionPrevia {
  id: string;
  acquisitionRef: string;
  knowledgeState: string;
}

const ETIQUETAS: Record<KnowledgeStateInput, string> = {
  KNOWN: "Lo sé y puedo describirlo",
  UNKNOWN: "No lo sé por ahora",
  NOT_APPLICABLE: "No aplica a mi empresa",
  CONTRADICTORY: "Hay versiones que se contradicen",
};

export function AcquisitionInput({
  acquisition,
  pending,
  onSubmit,
  observaciones = [],
}: {
  observaciones?: ObservacionPrevia[];
  acquisition: ActionableAcquisition;
  pending?: boolean;
  onSubmit: (answer: AcquisitionAnswer) => void;
}) {
  const estados = (acquisition.allowedKnowledgeStates as KnowledgeStateInput[]).filter((e) => e in ETIQUETAS);
  const [estado, setEstado] = useState<KnowledgeStateInput | "">("");
  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [fuentes, setFuentes] = useState<string[]>([]);
  const opciones = acquisition.allowedSemanticValues;

  const valido =
    estado === "UNKNOWN" ||
    (estado === "KNOWN" && valor.trim().length > 0) ||
    (estado === "NOT_APPLICABLE" && motivo.trim().length > 0) ||
    (estado === "CONTRADICTORY" && valor.trim().length > 0 && fuentes.length >= 2);

  const enviar = () => {
    if (!estado || !valido) return;
    onSubmit({
      acquisitionId: acquisition.acquisitionId,
      knowledgeState: estado,
      semanticValue: estado === "KNOWN" || estado === "CONTRADICTORY" ? valor.trim() : null,
      notApplicableReason: estado === "NOT_APPLICABLE" ? motivo.trim() : null,
      ...(estado === "CONTRADICTORY" ? { conflictingObservationIds: fuentes } : {}),
      ...(opciones ? {} : valor.trim() ? { rawInput: { statement: valor.trim() } } : {}),
    });
    setEstado("");
    setValor("");
    setMotivo("");
    setFuentes([]);
  };

  const idBase = `resp-${acquisition.acquisitionId}`;
  return (
    <div className="space-y-4">
      <RadioGroup value={estado} onValueChange={(v) => setEstado(v as KnowledgeStateInput)} className="grid gap-2 sm:grid-cols-2">
        {estados.map((e) => (
          <div key={e} className="flex items-center gap-2 rounded-xl border border-border p-3">
            <RadioGroupItem id={`${idBase}-${e}`} value={e} />
            <Label htmlFor={`${idBase}-${e}`} className="cursor-pointer text-sm font-normal">{ETIQUETAS[e]}</Label>
          </div>
        ))}
      </RadioGroup>

      {(estado === "KNOWN" || estado === "CONTRADICTORY") &&
        (opciones ? (
          <RadioGroup value={valor} onValueChange={setValor} className="space-y-2">
            {opciones.map((o) => (
              <div key={o} className="flex items-center gap-2 rounded-xl border border-border p-3">
                <RadioGroupItem id={`${idBase}-v-${o}`} value={o} />
                <Label htmlFor={`${idBase}-v-${o}`} className="cursor-pointer text-sm font-normal">{o}</Label>
              </div>
            ))}
          </RadioGroup>
        ) : (
          <div className="space-y-1">
            <Label htmlFor={`${idBase}-texto`}>Describe la situación actual</Label>
            <Textarea id={`${idBase}-texto`} value={valor} onChange={(e) => setValor(e.target.value)} rows={4} />
          </div>
        ))}

      {estado === "NOT_APPLICABLE" && (
        <div className="space-y-1">
          <Label htmlFor={`${idBase}-motivo`}>¿Por qué no aplica?</Label>
          <Textarea id={`${idBase}-motivo`} value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} />
        </div>
      )}

      {estado === "CONTRADICTORY" && (
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium text-foreground">
            Marca al menos dos respuestas anteriores que se contradicen
          </legend>
          {observaciones.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay respuestas anteriores con las que comparar.</p>
          ) : (
            observaciones.map((o) => (
              <label key={o.id} className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm">
                <input
                  type="checkbox"
                  checked={fuentes.includes(o.id)}
                  onChange={() =>
                    setFuentes((f) => (f.includes(o.id) ? f.filter((x) => x !== o.id) : [...f, o.id]))
                  }
                />
                <span>{o.acquisitionRef} · {o.knowledgeState}</span>
              </label>
            ))
          )}
        </fieldset>
      )}

      <Button onClick={enviar} disabled={!valido || pending}>
        {pending ? "Guardando…" : "Guardar respuesta"}
      </Button>
    </div>
  );
}
