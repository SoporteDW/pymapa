import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { useDiagnostico } from "@/hooks/use-diagnostico";
import { Loader2, TriangleAlert } from "lucide-react";

export const Route = createFileRoute("/diagnostico/procesando")({
  head: () => ({
    meta: [
      { title: "Calculando tu resultado — Pyme Digital" },
      {
        name: "description",
        content: "Estamos calculando tu puntaje preliminar global y por dimensión.",
      },
      { property: "og:title", content: "Calculando tu resultado — Pyme Digital" },
      {
        property: "og:description",
        content: "Estamos calculando tu puntaje preliminar global y por dimensión.",
      },
    ],
  }),
  component: ProcesandoPage,
});

function ProcesandoPage() {
  const navigate = useNavigate();
  const { isHydrated, completo, resultado, errorCalculo, finalizar } = useDiagnostico();
  const [enCurso, setEnCurso] = useState(true);
  const ejecutado = useRef(false);

  useEffect(() => {
    if (!isHydrated || ejecutado.current) return;
    ejecutado.current = true;

    if (!completo) {
      navigate({ to: "/diagnostico/revision" });
      return;
    }

    // Si ya existe un resultado, no se recalcula salvo solicitud explícita.
    if (resultado) {
      navigate({ to: "/diagnostico/resumen" });
      return;
    }

    const calculado = finalizar();
    setEnCurso(false);
    if (calculado) {
      const salto = setTimeout(() => navigate({ to: "/diagnostico/resumen" }), 900);
      return () => clearTimeout(salto);
    }
    return;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated]);

  if (!isHydrated) {
    return <LoadingState fullPage />;
  }

  const reintentar = () => {
    const calculado = finalizar();
    if (calculado) navigate({ to: "/diagnostico/resumen" });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Calculando tu resultado"
        subtitulo="Tomará solo unos segundos."
        migas={[
          { label: "Inicio", to: "/inicio" },
          { label: "Diagnóstico", to: "/diagnostico" },
          { label: "Procesando" },
        ]}
      />

      {errorCalculo ? (
        <div
          role="alert"
          className="flex flex-col items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-10 text-center"
        >
          <TriangleAlert className="h-8 w-8 text-destructive" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">
            No pudimos completar el cálculo (código {errorCalculo}).
          </p>
          <p className="max-w-md text-sm text-muted-foreground">
            Tus respuestas siguen guardadas. Puedes intentar el cálculo otra vez.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={reintentar}>Recalcular</Button>
            <Button variant="outline" onClick={() => navigate({ to: "/diagnostico/revision" })}>
              Volver a la revisión
            </Button>
          </div>
        </div>
      ) : (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-10 text-center"
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">
            {enCurso ? "Estamos calculando tu resultado…" : "Cálculo listo. Abriendo tu resumen…"}
          </p>
          <p className="max-w-md text-sm text-muted-foreground">
            Calculamos el puntaje de cada dimensión y el puntaje global ponderado a partir de tus
            respuestas.
          </p>
          <Button variant="outline" disabled={enCurso} onClick={() => navigate({ to: "/diagnostico/resumen" })}>
            Ver resumen
          </Button>
        </div>
      )}
    </div>
  );
}
