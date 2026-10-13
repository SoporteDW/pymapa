/**
 * UX-PROD-FIX-02 · Evidencias con procedencia real.
 * A) vinculadas a esta capacidad · B) documentos de la organización
 * reutilizables · C) cargados aquí pero aún sin vincular.
 * Archivo cargado ≠ evidencia validada; vinculada ≠ necesidad satisfecha.
 */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { linkCapabilityEvidence, registerCapabilityEvidence } from "@/lib/production/capabilities.functions";

export interface EvidenciaVista {
  id: string;
  title: string | null;
  evidenceType: string;
  candidateRef: string | null;
  source: string;
  createdAt: string;
  uploadedBy: string | null;
  uploadContextCapabilityId: string | null;
  links: { observationId: string; capabilityId: string; acquisitionRef: string; thisCapability: boolean }[];
  relation: "CAPABILITY" | "NEEDS_LINK" | "ORGANIZATION";
}

interface Props {
  capabilityId: string;
  organizationId: string;
  assessmentId: string;
  evidence: EvidenciaVista[];
  evidenceCandidates: { id: string; name: string }[];
  observations: { id: string; acquisitionRef: string }[];
}

const fecha = (iso: string) => new Date(iso).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });

function Procedencia({ e }: { e: EvidenciaVista }) {
  const otras = e.links.filter((l) => !l.thisCapability);
  const aqui = e.links.filter((l) => l.thisCapability);
  return (
    <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
      <p>
        Cargado el {fecha(e.createdAt)}
        {e.uploadedBy ? ` por ${e.uploadedBy}` : ""} ·{" "}
        {e.uploadContextCapabilityId ? `desde ${e.uploadContextCapabilityId}` : "lugar de carga no registrado"}
      </p>
      {aqui.length > 0 && <p>Respalda aquí: {aqui.map((l) => l.acquisitionRef).join(", ")}</p>}
      {otras.length > 0 && <p>Vinculado en: {otras.map((l) => `${l.capabilityId} (${l.acquisitionRef})`).join(", ")}</p>}
      {e.links.length === 0 && <p>Sin vínculo a ninguna respuesta todavía.</p>}
    </div>
  );
}

export function EvidenciaPanel(p: Props) {
  const qc = useQueryClient();
  const registrar = useServerFn(registerCapabilityEvidence);
  const vincularFn = useServerFn(linkCapabilityEvidence);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [referencia, setReferencia] = useState("");
  const [candidato, setCandidato] = useState("");
  const [observacion, setObservacion] = useState("");
  const [destino, setDestino] = useState<Record<string, string>>({});
  const vinculadas = p.evidence.filter((e) => e.relation === "CAPABILITY");
  const porVincular = p.evidence.filter((e) => e.relation === "NEEDS_LINK");
  const organizacion = p.evidence.filter((e) => e.relation === "ORGANIZATION");

  const refrescar = async () => {
    await qc.invalidateQueries({ queryKey: ["capacidad", p.capabilityId] });
    await qc.invalidateQueries({ queryKey: ["hub-diagnostico"] });
  };

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
      toast.success("Documento registrado");
      setArchivo(null);
      setReferencia("");
      setObservacion("");
      await refrescar();
    },
    onError: (e: Error) => toast.error("No pudimos registrar el documento", { description: e.message }),
  });

  const vincular = useMutation({
    mutationFn: (v: { evidenceId: string; observationId: string }) =>
      vincularFn({ data: { capabilityId: p.capabilityId, ...v } }),
    onSuccess: async (r) => {
      toast.success(r.alreadyLinked ? "Ya estaba vinculado" : "Documento vinculado a la respuesta");
      await refrescar();
    },
    onError: (e: Error) => toast.error("No pudimos vincular", { description: e.message }),
  });

  const selectorVinculo = (e: EvidenciaVista) =>
    p.observations.length === 0 ? (
      <p className="mt-2 text-xs text-muted-foreground">Responde primero algo en esta capacidad para poder vincularlo.</p>
    ) : (
      <div className="mt-2 flex gap-2">
        <select
          aria-label={`Respuesta a vincular con ${e.title ?? e.evidenceType}`}
          className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs"
          value={destino[e.id] ?? ""}
          onChange={(ev) => setDestino((d) => ({ ...d, [e.id]: ev.target.value }))}
        >
          <option value="">Elegir respuesta…</option>
          {p.observations.map((o) => <option key={o.id} value={o.id}>{o.acquisitionRef}</option>)}
        </select>
        <Button
          size="sm"
          variant="outline"
          disabled={!destino[e.id] || vincular.isPending}
          onClick={() => vincular.mutate({ evidenceId: e.id, observationId: destino[e.id]! })}
        >
          Vincular
        </Button>
      </div>
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Evidencias</CardTitle>
        <CardDescription>
          Los archivos son privados de tu organización. Cargar o vincular un documento no lo valida ni da por cubierta la información.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <section className="space-y-2">
          <h3 className="text-sm font-medium">Vinculadas a esta capacidad ({vinculadas.length})</h3>
          {vinculadas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ningún documento está vinculado todavía a respuestas de esta capacidad.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {vinculadas.map((e) => (
                <li key={e.id} className="rounded-lg border border-border px-3 py-2">
                  <span className="font-medium">{e.title ?? e.evidenceType}</span>
                  <Procedencia e={e} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {porVincular.length > 0 && (
          <section className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              Cargados aquí, pendientes de vincular
              <Badge variant="outline" className="rounded-full text-[11px]">{porVincular.length}</Badge>
            </h3>
            <ul className="space-y-2 text-sm">
              {porVincular.map((e) => (
                <li key={e.id} className="rounded-lg border border-dashed border-primary/40 px-3 py-2">
                  <span className="font-medium">{e.title ?? e.evidenceType}</span>
                  <Procedencia e={e} />
                  {selectorVinculo(e)}
                </li>
              ))}
            </ul>
          </section>
        )}

        {organizacion.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground">
              Documentos de tu empresa disponibles para reutilizar ({organizacion.length})
            </summary>
            <p className="mt-2 text-xs text-muted-foreground">
              No se usan en esta capacidad hasta que los vincules a una respuesta.
            </p>
            <ul className="mt-2 space-y-2">
              {organizacion.map((e) => (
                <li key={e.id} className="rounded-lg border border-dashed border-border px-3 py-2">
                  <span className="font-medium">{e.title ?? e.evidenceType}</span>
                  <Procedencia e={e} />
                  {selectorVinculo(e)}
                </li>
              ))}
            </ul>
          </details>
        )}

        <div className="grid gap-3 border-t border-border pt-4">
          <p className="text-sm font-medium">Cargar un documento nuevo</p>
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
                <option value="">Ninguna por ahora</option>
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
            {adjuntar.isPending ? "Registrando…" : "Registrar documento"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
