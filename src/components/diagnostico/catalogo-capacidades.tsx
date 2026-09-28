/**
 * PKG-02 · Hub de 31 capacidades. Las capacidades llegan del catálogo
 * productivo; aquí solo se agrupan por dominio y se muestra su estado real.
 */
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Etiquetas de dominio de la taxonomía oficial (6 dominios). */
export const DOMINIOS: { id: string; nombre: string }[] = [
  { id: "DG", nombre: "Dirección y Gobierno" },
  { id: "PC", nombre: "Personas y Cultura" },
  { id: "OP", nombre: "Operaciones y Procesos" },
  { id: "DT", nombre: "Datos y Tecnología" },
  { id: "CM", nombre: "Clientes y Mercado" },
  { id: "EC", nombre: "Ecosistema y Conexiones" },
];

export const ETIQUETA_ESTADO: Record<string, string> = {
  NOT_STARTED: "No iniciada",
  IN_PROGRESS: "En curso",
  AWAITING_INFORMATION: "Pendiente de información",
  NEEDS_CLARIFICATION: "Requiere aclaración",
  ACQUISITION_EXHAUSTED: "Adquisiciones agotadas",
  UNAVAILABLE: "No disponible",
};

const TONO: Record<string, string> = {
  NOT_STARTED: "border-border bg-muted text-muted-foreground",
  IN_PROGRESS: "border-primary/40 bg-primary/10 text-primary",
  AWAITING_INFORMATION: "border-primary/40 bg-primary/5 text-primary",
  NEEDS_CLARIFICATION: "border-destructive/40 bg-destructive/10 text-destructive",
  ACQUISITION_EXHAUSTED: "border-success/40 bg-success/10 text-success",
  UNAVAILABLE: "border-destructive/40 bg-destructive/10 text-destructive",
};

export interface CapacidadHub {
  capabilityId: string;
  name: string;
  domainId: string;
  interactionState: string;
  counts: { answered: number; totalAcquisitions: number; pendingInformationTasks: number } | null;
  findingsCount: number;
}

export function CatalogoCapacidades({ capacidades }: { capacidades: CapacidadHub[] }) {
  return (
    <div className="space-y-6">
      {DOMINIOS.map((d) => {
        const del = capacidades.filter((c) => c.domainId === d.id);
        if (del.length === 0) return null;
        return (
          <section key={d.id} aria-labelledby={`dom-${d.id}`}>
            <h2 id={`dom-${d.id}`} className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {d.id} · {d.nombre}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {del.map((c) => (
                <li key={c.capabilityId} data-capability-id={c.capabilityId}>
                  <Link to="/capacidad/$id" params={{ id: c.capabilityId }} className="block h-full">
                    <Card className="h-full transition-colors hover:border-primary/40">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-muted-foreground">{c.capabilityId}</span>
                          <Badge variant="outline" className={cn("rounded-full text-[11px]", TONO[c.interactionState])}>
                            {ETIQUETA_ESTADO[c.interactionState] ?? c.interactionState}
                          </Badge>
                        </div>
                        <CardTitle className="text-sm leading-snug">{c.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1 text-xs text-muted-foreground">
                        {c.counts && <p>{c.counts.answered} respondidas · {c.counts.pendingInformationTasks} requerimientos pendientes</p>}
                        {c.findingsCount > 0 && <p>Con hallazgos ({c.findingsCount})</p>}
                        {c.capabilityId === "OP-01" && <p>Capacidad de referencia</p>}
                      </CardContent>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
