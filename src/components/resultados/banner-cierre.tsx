import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEvidencias } from "@/hooks/use-evidencias";
import { evaluarCierre } from "@/lib/suficiencia/cierre";
import { CheckCircle2, FileClock } from "lucide-react";

/**
 * Gate de suficiencia en la lectura de resultados: distingue "resultado
 * preliminar" de "diagnóstico cerrado". La lógica vive en la capa de negocio.
 */
export function BannerCierre() {
  const { hidratado, suficiencia } = useEvidencias();
  if (!hidratado) return null;

  const cierre = evaluarCierre(suficiencia);

  if (!cierre.esPreliminar) {
    return (
      <Card className="border-success/40 bg-success/5">
        <CardHeader className="space-y-1.5">
          <Badge variant="outline" className="w-fit gap-1.5 border-success/40 text-success">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            {cierre.etiqueta}
          </Badge>
          <CardTitle className="text-base">Estos resultados están validados</CardTitle>
          <CardDescription>{cierre.mensaje}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-warning/40 bg-warning/5">
      <CardHeader className="space-y-1.5">
        <Badge variant="outline" className="w-fit gap-1.5 border-warning/40 text-warning">
          <FileClock className="h-3.5 w-3.5" aria-hidden="true" />
          {cierre.etiqueta}
        </Badge>
        <CardTitle className="text-base">Aún podemos precisar esta interpretación</CardTitle>
        <CardDescription>{cierre.mensaje}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {cierre.faltantes.length > 0 && (
          <ul className="space-y-1 text-sm text-muted-foreground">
            {cierre.faltantes.slice(0, 4).map((faltante) => (
              <li key={faltante} className="flex gap-2">
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning"
                  aria-hidden="true"
                />
                {faltante}
              </li>
            ))}
          </ul>
        )}
        <Button size="sm" variant="outline" asChild>
          <Link to="/diagnostico/cierre">Completar información para cerrar</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
