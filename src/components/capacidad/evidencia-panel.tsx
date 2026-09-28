/**
 * PKG-02 · Evidencias: almacén privado + registro productivo existente.
 */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { registerCapabilityEvidence } from "@/lib/production/capabilities.functions";

interface Props {
  capabilityId: string;
  organizationId: string;
  assessmentId: string;
  evidence: { id: string; title: string | null; evidenceType: string; candidateRef: string | null; source: string }[];
  evidenceCandidates: { id: string; name: string }[];
  observations: { id: string; acquisitionRef: string }[];
}

export function EvidenciaPanel(p: Props) {
  const qc = useQueryClient();
  const registrar = useServerFn(registerCapabilityEvidence);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [referencia, setReferencia] = useState("");
  const [candidato, setCandidato] = useState("");
  const [observacion, setObservacion] = useState("");

  const adjuntar = useMutation({
    mutationFn: async () => {
      let storagePath: string | null = null;
      if (archivo) {
        const ruta = `${p.organizationId}/${p.assessmentId}/${crypto.randomUUID()}-${archivo.name}`;
        const { error } = await supabase.storage.from("evidence").upload(ruta, archivo, { upsert: false });
        if (error) throw new Error(error.message);
        storagePath = ruta;
      }
      return registrar({
        data: {
          capabilityId: p.capabilityId,
          candidateRef: candidato || null,
          evidenceType: candidato || "DOCUMENT",
          source: "DOCUMENT",
          storageBucket: storagePath ? "evidence" : null,
          storagePath,
          externalReference: referencia.trim() || null,
          title: referencia.trim() || archivo?.name || null,
          note: null,
          observationIds: observacion ? [observacion] : [],
        },
      });
    },
    onSuccess: async () => {
      toast.success("Evidencia registrada");
      setArchivo(null);
      setReferencia("");
      await qc.invalidateQueries({ queryKey: ["capacidad", p.capabilityId] });
    },
    onError: (e: Error) => toast.error("No pudimos registrar la evidencia", { description: e.message }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Evidencias</CardTitle>
        <CardDescription>Los archivos se guardan de forma privada para tu organización.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {p.evidence.length > 0 ? (
          <ul className="space-y-1 text-sm">
            {p.evidence.map((e) => (
              <li key={e.id} className="rounded-lg border border-border px-3 py-2">
                {e.title ?? e.evidenceType} · <span className="text-muted-foreground">{e.candidateRef ?? e.source}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Aún no hay evidencias registradas.</p>
        )}
        <div className="grid gap-3">
          {p.evidenceCandidates.length > 0 && (
            <div className="space-y-1">
              <Label htmlFor="ev-tipo">Tipo de evidencia</Label>
              <select id="ev-tipo" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={candidato} onChange={(e) => setCandidato(e.target.value)}>
                <option value="">Documento</option>
                {p.evidenceCandidates.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          {p.observations.length > 0 && (
            <div className="space-y-1">
              <Label htmlFor="ev-obs">Respuesta que respalda</Label>
              <select id="ev-obs" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={observacion} onChange={(e) => setObservacion(e.target.value)}>
                <option value="">Ninguna en particular</option>
                {p.observations.map((o) => <option key={o.id} value={o.id}>{o.acquisitionRef}</option>)}
              </select>
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="ev-ref">Referencia o título</Label>
            <Input id="ev-ref" value={referencia} onChange={(e) => setReferencia(e.target.value)} />
          </div>
          <Input type="file" aria-label="Archivo de evidencia" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
          <Button variant="outline" onClick={() => adjuntar.mutate()} disabled={adjuntar.isPending || (!archivo && !referencia.trim())}>
            {adjuntar.isPending ? "Registrando…" : "Registrar evidencia"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
