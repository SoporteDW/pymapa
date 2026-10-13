import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { getCompany, updateCompanyName } from "@/lib/production/company.functions";
import { RUTA_HUB, validarNombreEmpresa } from "@/lib/production/entrada";

export const Route = createFileRoute("/_authenticated/empresa")({
  validateSearch: (s: Record<string, unknown>): { editar?: boolean } =>
    s["editar"] === true || s["editar"] === "true" || s["editar"] === 1 ? { editar: true } : {},
  head: () => ({
    meta: [
      { title: "Tu empresa — pymapa" },
      { name: "description", content: "Identifica tu empresa para empezar el diagnóstico real en pymapa." },
      { property: "og:title", content: "Tu empresa — pymapa" },
      { property: "og:description", content: "Identifica tu empresa para empezar el diagnóstico en pymapa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EmpresaPage,
});

const ERRORES: Record<string, string> = {
  NOMBRE_REQUERIDO: "Escribe el nombre de tu empresa.",
  NOMBRE_DEMASIADO_LARGO: "El nombre no puede superar 120 caracteres.",
  NOMBRE_PROVISIONAL: "Escribe el nombre real de tu empresa.",
  FORBIDDEN: "Solo el responsable de la empresa puede cambiar su nombre.",
};

function EmpresaPage() {
  const { editar } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const cargar = useServerFn(getCompany);
  const guardar = useServerFn(updateCompanyName);
  const empresa = useQuery({ queryKey: ["empresa-productiva"], queryFn: () => cargar() });
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Empresa ya identificada y sin petición explícita de edición → continuar.
  useEffect(() => {
    if (empresa.data && !empresa.data.needsName && !editar && !guardado) {
      void navigate({ to: RUTA_HUB, replace: true });
    }
  }, [empresa.data, editar, guardado, navigate]);

  useEffect(() => {
    if (empresa.data && !empresa.data.needsName) setNombre(empresa.data.name);
  }, [empresa.data]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const v = validarNombreEmpresa(nombre);
    if (!v.ok) return setError(ERRORES[v.error] ?? "Revisa el nombre.");
    setEnviando(true);
    try {
      const r = await guardar({ data: { name: v.nombre } });
      setGuardado(r.name);
      await qc.invalidateQueries({ queryKey: ["empresa-productiva"] });
    } catch (err) {
      const m = err instanceof Error ? err.message : "";
      setError(ERRORES[m] ?? "No pudimos guardar el nombre. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  if (empresa.isLoading) return <LoadingState message="Preparando tu espacio de trabajo…" />;
  if (empresa.error)
    return <p className="text-sm text-destructive">No pudimos cargar tu empresa. Recarga la página.</p>;
  if (!empresa.data) return null;
  if (!empresa.data.needsName && !editar && !guardado) return <LoadingState message="Abriendo tu diagnóstico…" />;

  if (guardado) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="size-5" aria-hidden="true" />
            <span className="text-sm font-medium">Guardado</span>
          </div>
          <CardTitle>{guardado} ya está registrada</CardTitle>
          <CardDescription>
            Siguiente paso: el diagnóstico. Elige cualquier capacidad y responde lo que sepas; tu avance se guarda
            y puedes volver cuando quieras.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="lg" className="w-full">
            <Link to={RUTA_HUB}>
              Ir a mi diagnóstico
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        titulo={empresa.data.needsName ? "Identifica tu empresa" : "Tu empresa"}
        subtitulo="Tu diagnóstico, respuestas y evidencias quedan asociados a esta empresa."
      />
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>Nombre de la empresa</CardTitle>
          <CardDescription>Por ahora solo necesitamos el nombre. Podrás cambiarlo después.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={enviar}>
            <div className="space-y-2">
              <Label htmlFor="nombre-empresa">Nombre de la empresa</Label>
              <Input
                id="nombre-empresa"
                required
                maxLength={120}
                value={nombre}
                disabled={!empresa.data.canEdit}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
            {!empresa.data.canEdit && (
              <p className="text-sm text-muted-foreground">Solo el responsable de la empresa puede cambiar el nombre.</p>
            )}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={enviando || !empresa.data.canEdit}>
                Guardar y continuar
              </Button>
              {!empresa.data.needsName && (
                <Button asChild variant="outline">
                  <Link to={RUTA_HUB}>Volver al diagnóstico</Link>
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
