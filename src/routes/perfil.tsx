import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSesion } from "@/hooks/use-sesion";
import { LoadingState } from "@/components/ui/loading-state";
import { toast } from "sonner";
import { Save, RotateCcw, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import type { Sector, Tamaño } from "@/types";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil de empresa — Pyme Digital" },
      { name: "description", content: "Edita los datos básicos de tu empresa." },
      { property: "og:title", content: "Perfil de empresa — Pyme Digital" },
      { property: "og:description", content: "Edita los datos básicos de tu empresa." },
    ],
  }),
  component: PerfilPage,
});

function PerfilPage() {
  const { sesion, isHydrated, updateEmpresa, resetDemo } = useSesion();
  const [form, setForm] = useState(sesion.empresa);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isHydrated) {
      setForm(sesion.empresa);
    }
  }, [isHydrated, sesion.empresa]);

  if (!isHydrated) {
    return <LoadingState fullPage />;
  }

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateEmpresa(form);
    setHasChanges(false);
    toast.success("La información fue guardada.", {
      description: "Los datos de tu empresa se han actualizado en este dispositivo.",
    });
  };

  const handleReset = () => {
    if (confirm("¿Deseas restablecer los datos de demostración? Se perderán los cambios actuales.")) {
      resetDemo();
      setForm(sesion.empresa);
      setHasChanges(false);
      toast.info("Datos de demostración restablecidos.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Perfil de empresa</h1>
        <p className="text-sm text-muted-foreground">Edita los datos básicos de tu pyme.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Información general</CardTitle>
            <CardDescription>Estos datos se usarán para personalizar el recorrido en futuras etapas.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="nombre">Nombre de la empresa</Label>
              <Input
                id="nombre"
                value={form.nombre}
                onChange={(e) => handleChange("nombre", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="responsable">Responsable</Label>
              <Input
                id="responsable"
                value={form.responsable}
                onChange={(e) => handleChange("responsable", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="correo">Correo de contacto</Label>
              <Input
                id="correo"
                type="email"
                value={form.correo}
                onChange={(e) => handleChange("correo", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sector">Sector</Label>
              <Select value={form.sector} onValueChange={(v) => handleChange("sector", v as Sector)}>
                <SelectTrigger id="sector">
                  <SelectValue placeholder="Selecciona un sector" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comercio">Comercio</SelectItem>
                  <SelectItem value="servicios">Servicios</SelectItem>
                  <SelectItem value="manufactura">Manufactura</SelectItem>
                  <SelectItem value="tecnologia">Tecnología</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tamaño">Tamaño de la empresa</Label>
              <Select value={form.tamaño} onValueChange={(v) => handleChange("tamaño", v as Tamaño)}>
                <SelectTrigger id="tamaño">
                  <SelectValue placeholder="Selecciona el tamaño" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="micro">Microempresa</SelectItem>
                  <SelectItem value="pequeña">Pequeña empresa</SelectItem>
                  <SelectItem value="mediana">Mediana empresa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/5 p-3 text-sm text-warning-foreground">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>La información se guarda solo en este dispositivo.</span>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleReset}>
              <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
              Restablecer datos
            </Button>
            <Button type="submit" disabled={!hasChanges}>
              <Save className="mr-2 h-4 w-4" aria-hidden="true" />
              Guardar cambios
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
