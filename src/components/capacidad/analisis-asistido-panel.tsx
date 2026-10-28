import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ejecutarAnalisisIA, listarAnalisisIA, revisarItemIA } from "@/lib/ia/analisis-asistido.functions";
import { CATEGORIAS, ETIQUETA_CATEGORIA, type Categoria, type ItemAnalisis } from "@/lib/ia/analisis-asistido";

export function AnalisisAsistidoPanel({ capabilityId, canGovern, syntheticAuthorized }: { capabilityId: string; canGovern: boolean; syntheticAuthorized: boolean }) {
  const qc = useQueryClient();
  const listar = useServerFn(listarAnalisisIA);
  const ejecutar = useServerFn(ejecutarAnalisisIA);
  const revisar = useServerFn(revisarItemIA);
  const key = ["analisis-ia", capabilityId];
  const q = useQuery({ queryKey: key, queryFn: () => listar({ data: { capabilityId } }) });
  const run = useMutation({
    mutationFn: () => ejecutar({ data: { capabilityId } }),
    onSuccess: (r) => {
      if (!r.ok) { toast.error("Análisis no ejecutado", { description: r.error }); return; }
      toast.success(`Análisis registrado · ${r.items.length} elementos`, { description: r.rejectedCount ? `${r.rejectedCount} descartados por no cumplir el contrato.` : undefined });
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e: Error) => toast.error("No pudimos analizar", { description: e.message }),
  });
  const [nota, setNota] = useState<Record<string, string>>({});
  const rev = useMutation({
    mutationFn: (v: { analysisId: string; itemId: string; decision: "ACCEPTED" | "DISMISSED" | "NEEDS_INFORMATION" }) =>
      revisar({ data: { ...v, note: nota[`${v.analysisId}:${v.itemId}`] ?? "", acceptedAction: null } }),
    onSuccess: (r) => { if (r && "error" in r) toast.error(r.error as string); else qc.invalidateQueries({ queryKey: key }); },
    onError: (e: Error) => toast.error("Revisión rechazada", { description: e.message }),
  });

  const ultimo = q.data?.analyses[0] as { id: string; items: ItemAnalisis[]; model: string; contract_version: string; created_at: string; rejected_items: unknown[] } | undefined;
  const reviews = (q.data?.reviews ?? []) as { analysis_id: string; item_id: string; decision: string }[];

  return (
    <Card data-testid="analisis-asistido">
      <CardHeader>
        <CardTitle className="text-base">Análisis asistido por IA (DEC-053)</CardTitle>
        <CardDescription>
          Lectura provisional de tus respuestas, separada en cinco categorías. No es un hallazgo del motor, ni evaluación profesional, ni puntaje. Todo requiere tu revisión.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!syntheticAuthorized && <p className="text-sm text-muted-foreground">Disponible solo para empresas sintéticas autorizadas: ningún dato real se envía a IA externa.</p>}
        {canGovern && syntheticAuthorized && (
          <Button onClick={() => run.mutate()} disabled={run.isPending}>{run.isPending ? "Analizando…" : ultimo ? "Volver a analizar" : "Analizar respuestas"}</Button>
        )}
        {ultimo && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{ultimo.contract_version} · {ultimo.model} · {new Date(ultimo.created_at).toLocaleString()} · {ultimo.rejected_items.length} descartados</p>
            {CATEGORIAS.map((cat: Categoria) => {
              const items = ultimo.items.filter((i) => i.category === cat);
              if (!items.length) return null;
              return (
                <div key={cat} className="space-y-2">
                  <h4 className="text-sm font-medium">{ETIQUETA_CATEGORIA[cat]} <Badge variant="outline">{items.length}</Badge></h4>
                  {items.map((i) => {
                    const r = reviews.find((x) => x.analysis_id === ultimo.id && x.item_id === i.id);
                    const k = `${ultimo.id}:${i.id}`;
                    return (
                      <div key={i.id} className="rounded-md border p-3 text-sm">
                        <p>{i.statement}</p>
                        {i.quote && <p className="mt-1 text-xs italic text-muted-foreground">“{i.quote}”</p>}
                        {r ? <Badge className="mt-2" variant="secondary">Revisado: {r.decision}</Badge> : canGovern && (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <input aria-label="Nota de revisión" className="min-w-40 flex-1 rounded border bg-background px-2 py-1 text-xs" placeholder="Nota obligatoria" value={nota[k] ?? ""} onChange={(e) => setNota((n) => ({ ...n, [k]: e.target.value }))} />
                            {(["ACCEPTED", "NEEDS_INFORMATION", "DISMISSED"] as const).map((d) => (
                              <Button key={d} size="sm" variant={d === "ACCEPTED" ? "default" : "outline"} disabled={(nota[k] ?? "").trim().length < 3 || rev.isPending} onClick={() => rev.mutate({ analysisId: ultimo.id, itemId: i.id, decision: d })}>
                                {d === "ACCEPTED" ? "Aceptar" : d === "DISMISSED" ? "Descartar" : "Pedir datos"}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
