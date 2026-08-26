import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@tanstack/react-router";
import { AlertCircle, ClipboardList, Map } from "lucide-react";

/**
 * Estados vacíos y de error del dashboard (POC-07, 10). Nunca se muestran
 * indicadores en cero cuando el origen no existe.
 */
export function DashboardEmptyState({
  variante,
  onCargarDemo,
}: {
  variante: "sin_diagnostico" | "sin_roadmap";
  onCargarDemo?: () => void;
}) {
  if (variante === "sin_diagnostico") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-5 w-5 text-primary" aria-hidden="true" />
            Aún no hay indicadores para mostrar
          </CardTitle>
          <CardDescription>
            El tablero se construye con tu diagnóstico y tu Roadmap. Completa el diagnóstico para
            obtener tu índice de madurez y las primeras prioridades.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/diagnostico">Comenzar el diagnóstico</Link>
          </Button>
          {onCargarDemo && (
            <Button variant="outline" onClick={onCargarDemo}>
              Cargar datos de demostración
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Map className="h-5 w-5 text-primary" aria-hidden="true" />
          Falta generar tu Roadmap
        </CardTitle>
        <CardDescription>
          Tu diagnóstico está listo, pero los indicadores de ejecución se calculan con las
          Actividades de tu Plan de Acción.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/plan-de-accion">Ir a mi Plan de Acción</Link>
        </Button>
        <Button variant="link" className="h-auto px-0" asChild>
          <Link to="/resultados">Ver resultados</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function DashboardErrorState({
  codigo,
  onReintentar,
}: {
  codigo: string | null;
  onReintentar?: () => void;
}) {
  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
          No pudimos calcular tus indicadores
        </CardTitle>
        <CardDescription>
          Tus datos siguen guardados. Puedes reintentar el cálculo o consultar el Roadmap. Código de referencia: {codigo ?? "DB-500"}.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {onReintentar && <Button onClick={onReintentar}>Reintentar</Button>}
        <Button variant="link" className="h-auto px-0" asChild>
          <Link to="/roadmap">Ver el Roadmap (consulta)</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

/** Aviso de módulo parcial: el resto del tablero sigue disponible. */
export function DashboardPartialWarning({ modulos }: { modulos: string[] }) {
  if (modulos.length === 0) return null;
  return (
    <Card className="border-amber-500/40">
      <CardContent className="flex items-start gap-2 pt-6 text-sm">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
        <p className="text-muted-foreground">
          Algunos bloques no se pudieron calcular ({modulos.join(", ")}). El resto de los
          indicadores se muestra con normalidad.
        </p>
      </CardContent>
    </Card>
  );
}
