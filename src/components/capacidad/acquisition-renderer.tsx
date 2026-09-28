/**
 * PKG-02 · Renderer genérico de adquisiciones. Solo muestra texto literal
 * llegado del servidor (pack publicado). Nunca convierte un requerimiento de
 * información en una pregunta sintética.
 */
import { Badge } from "@/components/ui/badge";
import type { ActionableAcquisition } from "@/lib/production/actionable";

const ETIQUETA_MODO: Record<ActionableAcquisition["mode"], string> = {
  QUESTION: "Pregunta",
  CAPABILITY_PROGRESSIVE: "Pregunta",
  INFORMATION_NEED: "Requerimiento de información",
  GOVERNED_STRUCTURAL_CORRESPONDENCE: "Foco de análisis",
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

      {a.question ? (
        <p className="text-base font-medium text-foreground">{a.question}</p>
      ) : a.mode === "INFORMATION_NEED" && a.informationNeedStatement ? (
        <p className="text-base font-medium text-foreground">{a.informationNeedStatement}</p>
      ) : null}

      {a.mode === "GOVERNED_STRUCTURAL_CORRESPONDENCE" && variables.length > 0 && (
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
      {a.mode !== "GOVERNED_STRUCTURAL_CORRESPONDENCE" && variables.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Variable vinculada: {variables.map((v) => `${v.variableRef} · ${v.name}`).join("; ")}
        </p>
      )}
    </div>
  );
}
