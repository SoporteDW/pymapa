/**
 * PKG-02 · Colaboración: responder personalmente (por defecto), delegar la
 * capacidad completa o un requerimiento de información, y copiar el enlace de
 * invitación (token de un solo uso, mostrado una sola vez). Sin email.
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
import { inviteCapabilityRespondent } from "@/lib/production/capabilities.functions";

const ESTADO: Record<string, string> = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En curso",
  COMPLETED: "Completada",
  DELEGATED: "Delegada",
  REVOKED: "Revocada",
};

interface Props {
  capabilityId: string;
  respondents: { id: string; displayName: string | null; email: string | null; isSelf: boolean }[];
  assignments: { id: string; respondentId: string; scopeType: string; scopeRef: string; status: string }[];
  informationNeeds: { ref: string; label: string }[];
}

export function ColaboracionPanel(p: Props) {
  const qc = useQueryClient();
  const invitar = useServerFn(inviteCapabilityRespondent);
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [alcance, setAlcance] = useState<string>("CAPABILITY");
  const [enlace, setEnlace] = useState<string | null>(null);

  const crear = useMutation({
    mutationFn: () =>
      invitar({
        data: {
          capabilityId: p.capabilityId,
          email: email.trim(),
          displayName: nombre.trim() || null,
          scopeType: alcance === "CAPABILITY" ? "CAPABILITY" : "INFORMATION_NEED",
          scopeRef: alcance === "CAPABILITY" ? p.capabilityId : alcance,
        },
      }),
    onSuccess: async (r) => {
      setEnlace(`${window.location.origin}${r.invitationPath}`);
      setEmail("");
      setNombre("");
      await qc.invalidateQueries({ queryKey: ["capacidad", p.capabilityId] });
    },
    onError: (e: Error) => toast.error("No pudimos crear la invitación", { description: e.message }),
  });

  const nombrePersona = (id: string) => {
    const r = p.respondents.find((x) => x.id === id);
    if (!r) return id;
    return r.isSelf ? "Tú" : r.displayName ?? r.email ?? id;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Colaboración</CardTitle>
        <CardDescription>Puedes responder todo tú o pedir ayuda a otra persona de tu empresa.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {p.assignments.length > 0 ? (
          <ul className="space-y-1 text-sm">
            {p.assignments.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                <span>{nombrePersona(a.respondentId)} · <span className="text-muted-foreground">{a.scopeRef}</span></span>
                <Badge variant="outline" className="rounded-full">{ESTADO[a.status] ?? a.status}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Por ahora respondes tú.</p>
        )}

        <div className="grid gap-3">
          <div className="space-y-1">
            <Label htmlFor="col-email">Correo de la persona</Label>
            <Input id="col-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="col-nombre">Nombre (opcional)</Label>
            <Input id="col-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="col-alcance">¿Qué le pides?</Label>
            <select id="col-alcance" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={alcance} onChange={(e) => setAlcance(e.target.value)}>
              <option value="CAPABILITY">Toda esta capacidad</option>
              {p.informationNeeds.map((n) => <option key={n.ref} value={n.ref}>{n.label}</option>)}
            </select>
          </div>
          <Button variant="outline" onClick={() => crear.mutate()} disabled={crear.isPending || !email.includes("@")}>
            {crear.isPending ? "Creando…" : "Crear invitación"}
          </Button>
        </div>

        {enlace && (
          <div className="space-y-2 rounded-xl border border-primary/40 bg-primary/5 p-3">
            <p className="text-sm">Copia este enlace ahora: por seguridad no volverá a mostrarse.</p>
            <Input readOnly value={enlace} aria-label="Enlace de invitación" />
            <Button
              size="sm"
              onClick={async () => {
                await navigator.clipboard.writeText(enlace);
                toast.success("Enlace copiado");
              }}
            >
              Copiar enlace de invitación
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
