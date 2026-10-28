/**
 * CTX-Q-B01 · G2 · Referente empresarial visible y editable dentro de la tarjeta.
 * - CONFIRMADO: lo escribió/aceptó la persona (se guarda en este navegador y
 *   queda estampado en cada respuesta como `referentUsed`).
 * - PROPUESTO: título literal de una sección documental ya confirmada; nunca se
 *   usa hasta que la persona lo acepta.
 * - PENDIENTE: sin referente; la tarjeta lo pide sin bloquear preguntas exploratorias.
 */
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ContextualQuestionContract } from "@/lib/production/contextual-questions";
import { sanearReferente } from "@/lib/production/contextual-questions";

const clave = (org: string, cap: string) => `pymapa:ctxq:referente:${org}:${cap}`;

export function useReferenteEmpresarial(organizationId: string | undefined, capabilityId: string) {
  const [referente, setReferente] = useState<string | null>(null);
  useEffect(() => {
    if (!organizationId) return;
    setReferente(sanearReferente(window.localStorage.getItem(clave(organizationId, capabilityId))));
  }, [organizationId, capabilityId]);
  function guardar(v: string | null) {
    const limpio = sanearReferente(v);
    setReferente(limpio);
    if (!organizationId) return;
    if (limpio) window.localStorage.setItem(clave(organizationId, capabilityId), limpio);
    else window.localStorage.removeItem(clave(organizationId, capabilityId));
  }
  return { referente, guardar };
}

export function ReferenteSelector({
  contract,
  referente,
  propuestos = [],
  onGuardar,
}: {
  contract: ContextualQuestionContract;
  referente: string | null;
  propuestos?: string[];
  onGuardar: (v: string | null) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(referente ?? "");
  useEffect(() => setTexto(referente ?? ""), [referente]);
  const tipo = contract.referentType;
  if (contract.kind === "EXPLORATORY" || !tipo) {
    return (
      <p data-testid="ctxq-exploratoria" className="text-xs text-muted-foreground">
        Pregunta exploratoria: responde con lo que conozcas; sirve para descubrir de qué hablaremos después.
        {referente && <> Referente actual de esta capacidad: «{referente}».</>}
      </p>
    );
  }
  if (referente && !editando) {
    return (
      <div data-testid="ctxq-referente-confirmado" className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/40 p-2 text-sm">
        <Badge variant="secondary" className="rounded-full">Referente confirmado</Badge>
        <span>
          Esta pregunta se refiere a tu {tipo.label}: <strong>«{referente}»</strong>
        </span>
        <Button size="sm" variant="link" className="h-auto p-0" onClick={() => setEditando(true)}>Cambiar</Button>
      </div>
    );
  }
  return (
    <div data-testid="ctxq-referente-pendiente" className="space-y-2 rounded-md border border-dashed border-border p-3 text-sm">
      <p className="font-medium">{tipo.ask}</p>
      <p className="text-xs text-muted-foreground">Esta pregunta depende de que sepamos a qué {tipo.label} te refieres. Escríbelo con tus palabras.</p>
      {propuestos.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Propuesto desde tus documentos confirmados (pendiente de tu aceptación):</span>
          {propuestos.map((p) => (
            <Button key={p} size="sm" variant="outline" onClick={() => { onGuardar(p); setEditando(false); }}>Usar «{p}»</Button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input aria-label={`Nombre del ${tipo.label}`} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={`Nombre del ${tipo.label}`} maxLength={160} />
        <Button size="sm" disabled={!sanearReferente(texto)} onClick={() => { onGuardar(texto); setEditando(false); }}>Confirmar</Button>
        {editando && <Button size="sm" variant="ghost" onClick={() => setEditando(false)}>Cancelar</Button>}
      </div>
    </div>
  );
}

export function AntecedentesPanel({ antecedentes }: { antecedentes: { observationId: string; acquisitionId: string; semanticValue: string | null; sourceText: string }[] }) {
  if (antecedentes.length === 0) return null;
  return (
    <div data-testid="ctxq-antecedentes" className="space-y-2 rounded-md border border-border bg-muted/30 p-3 text-sm">
      <p className="font-medium">Ya nos contaste algo relacionado</p>
      <p className="text-xs text-muted-foreground">Se muestra como antecedente. No cuenta como respuesta a esta pregunta: completa solo lo que falte o confirma que aplica.</p>
      <ul className="space-y-2">
        {antecedentes.map((a) => (
          <li key={a.observationId} className="rounded border border-border bg-background p-2">
            <p className="text-xs text-muted-foreground">Respondiste a: «{a.sourceText}»</p>
            <p className="whitespace-pre-wrap">{a.semanticValue}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
