/**
 * MVP-BETA-INT-01 · Documento → fragmento literal → propuesta → decisión humana.
 * Todo el estado llega del servidor. Una propuesta nunca cuenta como respuesta
 * hasta que OWNER/ADMIN la acepta; revocar conserva el historial.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CoberturaDocumentalPanel } from "@/components/capacidad/cobertura-documental-panel";
import {
  getCapabilityCollaboration,
  getCapabilityWorkspace,
  processSyntheticDocument,
  revokeCapabilityDocumentMapping,
} from "@/lib/production/capabilities.functions";
import { decidirCorrespondenciaIA } from "@/lib/ia/interpretacion.functions";

const ESTADO: Record<string, string> = {
  CANDIDATE: "Propuesta pendiente de revisión",
  VALIDATED: "Aceptada por la empresa",
  REJECTED: "Rechazada",
  SUPERSEDED: "Revocada (se conserva en el historial)",
};

export function DocumentosGobernadosPanel({ capabilityId }: { capabilityId: string }) {
  const qc = useQueryClient();
  const cargarWs = useServerFn(getCapabilityWorkspace);
  const cargarCol = useServerFn(getCapabilityCollaboration);
  const procesar = useServerFn(processSyntheticDocument);
  const decidir = useServerFn(decidirCorrespondenciaIA);
  const revocar = useServerFn(revokeCapabilityDocumentMapping);
  const ws = useQuery({ queryKey: ["capacidad", capabilityId, "workspace"], queryFn: () => cargarWs({ data: { capabilityId } }), retry: false });
  const col = useQuery({ queryKey: ["capacidad", capabilityId, "colaboracion"], queryFn: () => cargarCol({ data: { capabilityId } }), retry: false });

  const refrescar = async () => {
    await qc.invalidateQueries({ queryKey: ["capacidad", capabilityId] });
    await qc.invalidateQueries({ queryKey: ["op01"] });
    await qc.invalidateQueries({ queryKey: ["hub-diagnostico"] });
  };
  const proceso = useMutation({
    mutationFn: (evidenceId: string) => procesar({ data: { capabilityId, evidenceId } }),
    onSuccess: async (r) => {
      if (r.alreadyProcessed) toast.info("Este documento ya fue procesado", { description: "No se duplican fragmentos ni propuestas." });
      else toast.success(`Documento leído: ${r.proposals.length} ${r.proposals.length === 1 ? "propuesta" : "propuestas"} para revisar`);
      await refrescar();
    },
    onError: (e: Error) => toast.error("No se pudo procesar el documento", { description: e.message }),
  });
  const decision = useMutation({
    mutationFn: async (v: { mappingId: string; decision: "VALIDATED" | "REJECTED" }) => {
      const r = await decidir({ data: v });
      if (!r.ok) throw new Error(r.error);
      return r;
    },
    onSuccess: async (_r, v) => {
      toast.success(v.decision === "VALIDATED" ? "Propuesta aceptada" : "Propuesta rechazada");
      await refrescar();
    },
    onError: (e: Error) => toast.error("No se pudo registrar la decisión", { description: e.message }),
  });
  const revocacion = useMutation({
    mutationFn: (mappingId: string) => revocar({ data: { capabilityId, mappingId, note: "Revocación desde la capacidad" } }),
    onSuccess: async () => {
      toast.success("Correspondencia revocada", { description: "El dato documental deja de contar; el historial se conserva." });
      await refrescar();
    },
    onError: (e: Error) => toast.error("No se pudo revocar", { description: e.message }),
  });

  if (!ws.data) return null;
  const gobierna = ws.data.userRole === "OWNER" || ws.data.userRole === "ADMIN";
  const documentos = (col.data?.evidence ?? []).filter((e) => e.relation !== "ORGANIZATION");
  const mappings = ws.data.documentaryMappings;

  return (
    <div className="space-y-6">
      <Card data-testid="documentos-gobernados">
        <CardHeader>
          <CardTitle className="text-base">Lectura de documentos</CardTitle>
          <CardDescription>
            Cada propuesta cita el texto literal del documento. Nada cuenta como respuesta hasta que un administrador de la empresa la acepta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {ws.data.syntheticQaIngestionAuthorized && gobierna ? (
            <section className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Modo de prueba con documentos sintéticos (SYNTHETIC_QA_ONLY). Las propuestas salen de reglas fijas que reconocen el título de una sección: es una coincidencia de texto, no una interpretación. No se usa inteligencia artificial.
              </p>
              {documentos.length === 0 ? (
                <p className="text-muted-foreground">Carga primero un documento de prueba en esta capacidad.</p>
              ) : (
                <ul className="space-y-2">
                  {documentos.map((d) => (
                    <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2">
                      <span className="min-w-0 flex-1 truncate">{d.title ?? d.evidenceType}</span>
                      <Button size="sm" variant="outline" disabled={proceso.isPending} onClick={() => proceso.mutate(d.id)}>
                        Leer documento de prueba
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : (
            <p className="text-xs text-muted-foreground">La lectura automática de documentos no está habilitada para tu empresa.</p>
          )}

          {mappings.length > 0 && (
            <ul className="space-y-3" data-testid="propuestas-documentales">
              {mappings.map((m) => (
                <li key={m.id} data-proposal-id={m.id} className="space-y-2 rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">
                      {m.targetType === "VARIABLE" ? `Dato ${m.targetRef}` : `Pregunta ${m.targetRef}`}
                      {m.factualCorrespondenceRef ? ` · responde a ${m.factualCorrespondenceRef}` : ""}
                    </span>
                    <Badge variant="outline">{ESTADO[m.status] ?? m.status}</Badge>
                  </div>
                  <blockquote className="border-l-2 border-border pl-3 text-muted-foreground">«{m.fragmentText}»</blockquote>
                  {gobierna && m.status === "CANDIDATE" && (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" disabled={decision.isPending} onClick={() => decision.mutate({ mappingId: m.id, decision: "VALIDATED" })}>Aceptar propuesta</Button>
                      <Button size="sm" variant="outline" disabled={decision.isPending} onClick={() => decision.mutate({ mappingId: m.id, decision: "REJECTED" })}>Rechazar</Button>
                    </div>
                  )}
                  {gobierna && m.status === "VALIDATED" && (
                    <Button size="sm" variant="outline" disabled={revocacion.isPending} onClick={() => revocacion.mutate(m.id)}>Revocar</Button>
                  )}
                  {!gobierna && m.status === "CANDIDATE" && <p className="text-xs text-muted-foreground">Solo un administrador de la empresa puede decidir.</p>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <CoberturaDocumentalPanel capabilityId={capabilityId} mappings={mappings} canGovern={gobierna} />
    </div>
  );
}
