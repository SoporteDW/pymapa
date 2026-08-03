import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { useSesion } from "@/hooks/use-sesion";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/diagnostico/procesando")({
  head: () => ({
    meta: [
      { title: "Organizando tus respuestas — Pyme Digital" },
      {
        name: "description",
        content: "Transición breve mientras preparamos tus resultados demostrativos.",
      },
      { property: "og:title", content: "Organizando tus respuestas — Pyme Digital" },
      {
        property: "og:description",
        content: "Transición breve mientras preparamos tus resultados demostrativos.",
      },
    ],
  }),
  component: ProcesandoPage,
});

function ProcesandoPage() {
  const navigate = useNavigate();
  const { isHydrated, generarResultadosDemostrativos } = useSesion();
  const [demorado, setDemorado] = useState(false);
  const ejecutado = useRef(false);

  useEffect(() => {
    if (!isHydrated || ejecutado.current) return;
    ejecutado.current = true;
    generarResultadosDemostrativos();
    const salto = setTimeout(() => navigate({ to: "/resultados" }), 1400);
    const aviso = setTimeout(() => setDemorado(true), 4000);
    return () => {
      clearTimeout(salto);
      clearTimeout(aviso);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated]);

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Organizando tus respuestas"
        subtitulo="Tomará solo unos segundos."
        migas={[
          { label: "Inicio", to: "/inicio" },
          { label: "Diagnóstico", to: "/diagnostico" },
          { label: "Procesando" },
        ]}
      />

      <div
        role="status"
        aria-live="polite"
        className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-10 text-center"
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">Estamos organizando tus respuestas…</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Esta preparación es simulada en el MVP Alfa: sirve para mostrar cómo se presentará el
          análisis cuando la lógica esté disponible.
        </p>
        {demorado && (
          <div className="space-y-3">
            <p className="text-sm text-warning-foreground">
              Está tomando más de lo previsto. Puedes ir directamente a tus resultados.
            </p>
            <Button onClick={() => navigate({ to: "/resultados" })}>Ver resultados</Button>
          </div>
        )}
      </div>
    </div>
  );
}
