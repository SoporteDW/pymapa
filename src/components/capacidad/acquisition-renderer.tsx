/**
 * PKG-02 · Renderer genérico de adquisiciones. Solo muestra texto literal
 * llegado del servidor (pack publicado). Nunca convierte un requerimiento de
 * información en una pregunta sintética.
 */
import { Badge } from "@/components/ui/badge";
import type { ActionableAcquisition } from "@/lib/production/actionable";
import { ReferenteProceso } from "./referente-proceso";
import { AntecedentesPanel, ReferenteSelector } from "./referente-selector";

const ETIQUETA_MODO: Record<ActionableAcquisition["mode"], string> = {
  QUESTION: "Pregunta literal del conocimiento publicado",
  CAPABILITY_PROGRESSIVE: "Pregunta literal del conocimiento publicado",
  INFORMATION_NEED: "Solicitud de información · sin pregunta oficial",
  GOVERNED_STRUCTURAL_CORRESPONDENCE: "Guía de información · correspondencia estructural",
};

export function AcquisitionRenderer({
  acquisition,
  referentes = [],
  referente = null,
  onReferente,
  antecedentes = [],
}: {
  acquisition: ActionableAcquisition;
  referentes?: string[];
  referente?: string | null;
  onReferente?: (v: string | null) => void;
  antecedentes?: { observationId: string; acquisitionId: string; semanticValue: string | null; sourceText: string }[];
}) {
  const a = acquisition;
  const ctx = a.contextualContract;
  const variables = a.variables.filter((v) => v.name);
  return (
    <div className="space-y-3" data-acquisition-id={a.acquisitionId} data-mode={a.mode}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="rounded-full">{ETIQUETA_MODO[a.mode]}</Badge>
        {a.level && <Badge variant="secondary" className="rounded-full">{a.level}</Badge>}
        <span className="text-xs text-muted-foreground">{a.acquisitionId}</span>
      </div>

      {ctx && ctx.sourceText && (
        <div className="space-y-1" data-testid="ctxq-pregunta" data-ctxq-id={ctx.contextualQuestionId}>
          <Badge className="rounded-full">Pregunta contextual · {ctx.version} · {ctx.stageRef}</Badge>
          <p className="text-base font-medium text-foreground">{ctx.sourceText}</p>
          <p className="text-xs text-muted-foreground">
            Texto literal del paquete aprobado ({ctx.sourceLocation}).
            {ctx.targetAcquisitionRefs.length > 1 && ` Tu respuesta se guarda en ${ctx.primaryAcquisitionRef} y se mostrará como antecedente en ${ctx.targetAcquisitionRefs.length - 1} pregunta(s) relacionada(s), sin darlas por respondidas.`}
          </p>
        </div>
      )}
      {ctx && onReferente && (
        <ReferenteSelector contract={ctx} referente={referente} propuestos={referentes} onGuardar={onReferente} />
      )}
      {ctx && <AntecedentesPanel antecedentes={antecedentes} />}

      {a.operativeQuestion && !(ctx && ctx.sourceText) && (
        <div className="space-y-1">
          <Badge className="rounded-full">Pregunta operativa · {a.operativeQuestion.wordingVersion}</Badge>
          <p className="text-base font-medium text-foreground">{a.operativeQuestion.text}</p>
          <p className="text-sm text-muted-foreground">{a.operativeQuestion.depthPrompt}</p>
          <p className="text-xs text-muted-foreground">Derivada de {a.operativeQuestion.sourceRef}: «{a.operativeQuestion.sourceText}»</p>
        </div>
      )}

      {ctx && ctx.sourceText && a.operativeQuestion && (
        <p className="text-xs text-muted-foreground">Necesidad de información vinculada ({a.operativeQuestion.sourceRef}): «{a.operativeQuestion.sourceText}»</p>
      )}

      {!ctx && !a.operativeQuestion && (a.mode === "QUESTION" || a.mode === "CAPABILITY_PROGRESSIVE") && a.question ? (
        <p className="text-base font-medium text-foreground">{a.question}</p>
      ) : !a.operativeQuestion && a.mode === "INFORMATION_NEED" && a.informationNeedStatement ? (
        <p className="text-base font-medium text-foreground">{a.informationNeedStatement}</p>
      ) : null}

      {!ctx && <ReferenteProceso texto={`${a.question ?? ""} ${a.operativeQuestion?.text ?? ""}`} referentes={referentes} />}

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
