import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { AlertTriangle, ClipboardList, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

interface ResultStateProps {
  estado: "cargando" | "vacio" | "error" | "listo";
  errorCodigo?: string | null;
  onReintentar?: () => void;
  onIrAlDiagnostico?: () => void;
  children: ReactNode;
}

/** ResultState (POC-05, 9 y 11): gestiona carga, vacío y error de forma visible. */
export function ResultState({
  estado,
  errorCodigo,
  onReintentar,
  onIrAlDiagnostico,
  children,
}: ResultStateProps) {
  if (estado === "cargando") {
    return <LoadingState fullPage message="Estamos organizando tus resultados…" />;
  }

  if (estado === "error") {
    return (
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
            No pudimos organizar tus resultados
          </CardTitle>
          <CardDescription>
            Tus respuestas siguen guardadas. Puedes volver a intentarlo sin perder información
            {errorCodigo ? ` (código ${errorCodigo})` : ""}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row">
          {onReintentar && (
            <Button onClick={onReintentar}>
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Reintentar
            </Button>
          )}
          {onIrAlDiagnostico && (
            <Button variant="outline" onClick={onIrAlDiagnostico}>
              Ver respuestas del diagnóstico
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (estado === "vacio") {
    return (
      <EmptyState
        title="Todavía no hay resultados"
        description="Los resultados se construyen a partir de tus respuestas del diagnóstico. Complétalo o carga un escenario simulado para conocer el recorrido."
        icon={ClipboardList}
        {...(onIrAlDiagnostico
          ? { actionLabel: "Ir al diagnóstico", onAction: onIrAlDiagnostico }
          : {})}
      />
    );
  }

  return <>{children}</>;
}
