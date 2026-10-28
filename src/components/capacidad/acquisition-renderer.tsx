/**
 * PKG-02 · Renderer genérico de adquisiciones. Solo muestra texto literal
 * llegado del servidor (pack publicado). Nunca convierte un requerimiento de
 * información en una pregunta sintética.
 */
import { Badge } from "@/components/ui/badge";
import type { ActionableAcquisition } from "@/lib/production/actionable";

const ETIQUETA_MODO: Record<ActionableAcquisition["mode"], string> = {
  QUESTION: "Pregunta literal del conocimiento publicado",
  CAPABILITY_PROGRESSIVE: "Pregunta literal del conocimiento publicado",
  INFORMATION_NEED: "Solicitud de información · sin pregunta oficial",
  GOVERNED_STRUCTURAL_CORRESPONDENCE: "Guía de información · correspondencia estructural",
};

export function AcquisitionRenderer({ acquisition }: { acquisition: ActionableAcquisition }) {
  const a = acquisition;
  const variables = a.variables.filter((v) => v.name);
  return (
    <div className="space-y-3" data-acquisition-id={a.acquisitionId} data-mode={a.mode}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="rounded-full">{ETIQUETA_MODO[a.mode]}</Badge>
        {a.level && <Badge variant="secondary" className="rounded-full">{a.level}</Badge>}
        <span className="text-xs text-muted-foreground">{a.acquisitionId}</span>
      </div>

      {a.operativeQuestion && (
        <div className="space-y-1">
          <Badge className="rounded-full">Pregunta operativa · {a.operativeQuestion.wordingVersion}</Badge>
          <p className="text-base font-medium text-foreground">{a.operativeQuestion.text}</p>
          <p className="text-sm text-muted-foreground">{a.operativeQuestion.depthPrompt}</p>
          <p className="text-xs text-muted-foreground">Derivada de {a.operativeQuestion.sourceRef}: «{a.operativeQuestion.sourceText}»</p>
        </div>
      )}

      {!a.operativeQuestion && (a.mode === "QUESTION" || a.mode === "CAPABILITY_PROGRESSIVE") && a.question ? (
        <p className="text-base font-medium text-foreground">{a.question}</p>
      ) : a.mode === "INFORMATION_NEED" && a.informationNeedStatement ? (
        <p className="text-base font-medium text-foreground">{a.informationNeedStatement}</p>
      ) : null}

      {!a.operativeQuestion && a.mode === "GOVERNED_STRUCTURAL_CORRESPONDENCE" && variables.length > 0 && (
        <p className="text-base font-medium text-foreground">{variables.map((v) => v.name).join(" · ")}</p>
      )}

      {a.purpose && <p className="text-sm text-muted-foreground">{a.purpose}</p>}
      {a.progressiveNuclear && (
        <p className="text-sm text-muted-foreground">Núcleo: {a.progressiveNuclear}</p>
      )}
      {a.correspondenceStatement && (
        <p className="text-xs text-muted-foreground">Correspondencia declarada: {a.correspondenceStatement}</p>
      )}
      {a.triggerStatement && (
        <p className="text-xs text-muted-foreground">Habilitada por: {a.triggerStatement}</p>
      )}
      {/* Progresivas con varias VA: sin correspondencia individual gobernada, no se exponen VA. */}
      {a.mode !== "GOVERNED_STRUCTURAL_CORRESPONDENCE" &&
        !(a.mode === "CAPABILITY_PROGRESSIVE" && a.variables.length > 1) &&
        variables.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Variable vinculada: {variables.map((v) => `${v.variableRef} · ${v.name}`).join("; ")}
        </p>
      )}
    </div>
  );
}
