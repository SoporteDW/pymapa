/**
 * INT-01-COV-02 · Panel mínimo de cobertura documental gobernada.
 *
 * Dos decisiones SEPARADAS, nunca equivalentes:
 *  1. Validar la correspondencia factual (flujo Bloque 1 / R1, ya existente).
 *  2. Declarar cobertura completa de la adquisición canónica (este panel).
 *
 * Solo OWNER/ADMIN declaran FULL, siempre con justificación verificable.
 * PARTIAL es el estado conservador por defecto y nunca descuenta la tarea.
 */
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { declareCapabilityDocumentCoverage } from "@/lib/production/capabilities.functions";

export interface DocumentaryMappingItem {
  id: string;
  status: string;
  targetType: string;
  targetRef: string;
  factualCorrespondenceRef: string | null;
  fragmentText: string;
  interpretationStatement: string | null;
  coverageScope: "FULL" | "PARTIAL";
  coverageAcquisitionRef: string | null;
  coverageJustification: string | null;
  coverageDecidedAt: string | null;
}

export function CoberturaDocumentalPanel({
  capabilityId,
  mappings,
  canGovern,
}: {
  capabilityId: string;
  mappings: DocumentaryMappingItem[];
  canGovern: boolean;
}) {
  const qc = useQueryClient();
  const declarar = useServerFn(declareCapabilityDocumentCoverage);
  const [editando, setEditando] = useState<{ id: string; scope: "FULL" | "PARTIAL" } | null>(null);
  const [justificacion, setJustificacion] = useState("");

  const mutacion = useMutation({
    mutationFn: (input: { mappingId: string; scope: "FULL" | "PARTIAL"; justification: string }) =>
      declarar({ data: { capabilityId, ...input } }),
    onSuccess: (r) => {
      toast.success(
        r.coverageScope === "FULL" ? "Cobertura completa declarada" : "Cobertura revertida a parcial",
        {
          description:
            r.coverageScope === "FULL"
              ? `La adquisición ${r.acquisitionRef} queda cubierta por esta evidencia. La decisión quedó registrada y es reversible.`
              : "La adquisición vuelve a estar pendiente si no tiene otra cobertura vigente.",
        },
      );
      setEditando(null);
      setJustificacion("");
      qc.invalidateQueries({ queryKey: ["capacidad", capabilityId] });
      qc.invalidateQueries({ queryKey: ["hub-diagnostico"] });
    },
    onError: (e) => {
      toast.error("No se pudo registrar la decisión", { description: e instanceof Error ? e.message : undefined });
    },
  });

  // Solo correspondencias factuales validadas admiten decisión de cobertura.
  const factuales = mappings.filter((m) => m.status === "VALIDATED" && m.targetType === "VARIABLE" && m.factualCorrespondenceRef);
  if (factuales.length === 0) return null;

  return (
    <Card data-testid="cobertura-documental">
      <CardHeader>
        <CardTitle className="text-base">Cobertura documental</CardTitle>
        <CardDescription>
          Estas correspondencias documentales ya fueron validadas. Decidir que una evidencia cubre por completo un
          requerimiento es una decisión distinta de validar la correspondencia: exige justificación y queda registrada.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {factuales.map((m) => (
            <li key={m.id} className="space-y-2 rounded-xl border border-border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  Requerimiento {m.factualCorrespondenceRef} · variable {m.targetRef}
                </span>
                <Badge variant={m.coverageScope === "FULL" ? "default" : "outline"} className="rounded-full">
                  {m.coverageScope === "FULL" ? "Cobertura completa" : "Cobertura parcial"}
                </Badge>
              </div>
              <p className="text-muted-foreground">«{m.fragmentText}»</p>
              {m.interpretationStatement && <p>{m.interpretationStatement}</p>}
              {m.coverageScope === "FULL" && m.coverageJustification && (
                <p className="text-xs text-muted-foreground">
                  Justificación registrada: {m.coverageJustification}
                </p>
              )}
              {canGovern && editando?.id !== m.id && (
                <div className="flex flex-wrap gap-2">
                  {m.coverageScope !== "FULL" ? (
                    <Button size="sm" variant="outline" onClick={() => { setEditando({ id: m.id, scope: "FULL" }); setJustificacion(""); }}>
                      Declarar cobertura completa
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => { setEditando({ id: m.id, scope: "PARTIAL" }); setJustificacion(""); }}>
                      Revertir a parcial
                    </Button>
                  )}
                </div>
              )}
              {canGovern && editando?.id === m.id && (
                <div className="space-y-2">
                  <Textarea
                    value={justificacion}
                    onChange={(e) => setJustificacion(e.target.value)}
                    placeholder={
                      editando.scope === "FULL"
                        ? "Explica por qué esta evidencia cubre por completo el requerimiento (mínimo 10 caracteres)."
                        : "Explica por qué se revierte la cobertura completa (mínimo 10 caracteres)."
                    }
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={justificacion.trim().length < 10 || mutacion.isPending}
                      onClick={() => mutacion.mutate({ mappingId: m.id, scope: editando.scope, justification: justificacion.trim() })}
                    >
                      Confirmar decisión
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditando(null); setJustificacion(""); }}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
              {!canGovern && (
                <p className="text-xs text-muted-foreground">Solo un responsable de la organización puede decidir la cobertura.</p>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
