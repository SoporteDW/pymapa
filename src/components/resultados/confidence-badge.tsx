import { Badge } from "@/components/ui/badge";
import { etiquetaConfianza } from "@/lib/resultados/niveles";
import type { NivelConfianza } from "@/lib/resultados/tipos";
import { ShieldCheck, ShieldQuestion, ShieldAlert } from "lucide-react";

const iconos = {
  alta: ShieldCheck,
  media: ShieldQuestion,
  baja: ShieldAlert,
} as const;

const variantes = {
  alta: "bg-success/10 text-success border-success/20",
  media: "bg-warning/15 text-foreground border-warning/40",
  baja: "bg-destructive/10 text-destructive border-destructive/20",
} as const;

const explicacion = {
  alta: "La evidencia es consistente y suficiente para sostener esta lectura.",
  media: "La evidencia es aceptable, pero conviene confirmar algunos puntos.",
  baja: "La evidencia es limitada: esta lectura requiere validación antes de decidir.",
} as const;

interface ConfidenceBadgeProps {
  nivel: NivelConfianza;
  valor?: number;
}

/** ConfidenceBadge (POC-05, 9): indica confianza alta, media o baja. */
export function ConfidenceBadge({ nivel, valor }: ConfidenceBadgeProps) {
  const Icono = iconos[nivel];
  return (
    <Badge variant="outline" className={variantes[nivel]} title={explicacion[nivel]}>
      <Icono className="mr-1 h-3 w-3" aria-hidden="true" />
      {etiquetaConfianza(nivel)}
      {valor !== undefined ? ` · ${valor.toFixed(2)}` : ""}
    </Badge>
  );
}
