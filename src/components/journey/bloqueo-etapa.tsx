import { Link } from "@tanstack/react-router";
import { ArrowRight, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BloqueoEtapa as Bloqueo } from "@/lib/journey/etapas";

/**
 * Macroentrega 5 · Regla de navegación C.
 * El módulo se muestra siempre, pero cuando la etapa todavía no está habilitada
 * se explica qué falta y el único CTA lleva al punto real del journey.
 */
export function BloqueoEtapa({
  bloqueo,
  titulo,
  children,
}: {
  bloqueo: Bloqueo;
  titulo: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className="border-warning/30 bg-warning/5">
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2 text-warning-foreground">
          <Lock className="size-4" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-wide">Aún no disponible</span>
        </div>
        <CardTitle className="text-lg leading-snug">{titulo}</CardTitle>
        <CardDescription>{bloqueo.motivo}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button asChild size="lg">
          <Link to={bloqueo.ruta}>
            {bloqueo.label}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
        {children}
      </CardContent>
    </Card>
  );
}
