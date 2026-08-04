import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSesion } from "@/hooks/use-sesion";
import { LoadingState } from "@/components/ui/loading-state";
import { DemoNote } from "@/components/ui/demo-note";
import { PageHeader } from "@/components/layout/page-header";
import { toast } from "sonner";
import { Save, RotateCcw, AlertTriangle, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import type { Sector, Tamaño } from "@/types";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil de empresa — pymapa" },
      {
        name: "description",
        content: "Edita los datos de tu empresa para personalizar el recorrido digital.",
      },
      { property: "og:title", content: "Perfil de empresa — pymapa" },
      {
        property: "og:description",
        content: "Edita los datos de tu empresa para personalizar el recorrido digital.",
      },
    ],
  }),
  component: PerfilPage,
});

function PerfilPage() {
  const { sesion, isHydrated, updateEmpresa, reiniciarTodo, cargarDatosDemostrativos } = useSesion();
  const [form, setForm] = useState(sesion.empresa);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isHydrated) {
      setForm(sesion.empresa);
      setHasChanges(false);
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
    updateEmpresa({ ...form, fechaActualizacion: new Date().toISOString() });
    setHasChanges(false);
    toast.success("La información fue guardada.", {
      description: "Los datos de tu empresa se actualizaron en este dispositivo.",
    });
  };

  const handleReset = () => {
    if (
      confirm(
        "¿Deseas borrar todo el progreso guardado en este navegador? Esta acción no se puede deshacer."
      )
    ) {
      reiniciarTodo();
      setHasChanges(false);
      toast.info("Se reinició el progreso local.");
    }
  };

  const handleDemo = () => {
    cargarDatosDemostrativos();
    toast.info("Cargamos una sesión demostrativa completa.");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Perfil de empresa"
        subtitulo="Estos datos permiten adaptar el recorrido a tu realidad."
        migas={[{ label: "Inicio", to: "/inicio" }, { label: "Perfil" }]}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Información general</CardTitle>
            <CardDescription>Identificación básica de tu empresa.</CardDescription>
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
              <Select
                value={form.sector}
                onValueChange={(v) => handleChange("sector", v as Sector)}
              >
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
              <Label htmlFor="tamano">Tamaño de la empresa</Label>
              <Select
                value={form.tamaño}
                onValueChange={(v) => handleChange("tamaño", v as Tamaño)}
              >
                <SelectTrigger id="tamano">
                  <SelectValue placeholder="Selecciona el tamaño" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="micro">Microempresa</SelectItem>
                  <SelectItem value="pequeña">Pequeña empresa</SelectItem>
                  <SelectItem value="mediana">Mediana empresa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ciudad">Ciudad</Label>
              <Input
                id="ciudad"
                value={form.ciudad}
                onChange={(e) => handleChange("ciudad", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pais">País</Label>
              <Input
                id="pais"
                value={form.pais}
                onChange={(e) => handleChange("pais", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contexto digital</CardTitle>
            <CardDescription>
              Nos ayuda a interpretar tus respuestas y a ordenar tus prioridades.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sitioWeb">Sitio web o red principal</Label>
              <Input
                id="sitioWeb"
                value={form.sitioWeb ?? ""}
                onChange={(e) => handleChange("sitioWeb", e.target.value)}
                placeholder="https://"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="presenciaDigital">Presencia digital actual</Label>
              <Input
                id="presenciaDigital"
                value={form.presenciaDigital}
                onChange={(e) => handleChange("presenciaDigital", e.target.value)}
                placeholder="Redes sociales, catálogo, tienda en línea…"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="objetivoPrincipal">Objetivo principal para este año</Label>
              <Input
                id="objetivoPrincipal"
                value={form.objetivoPrincipal}
                onChange={(e) => handleChange("objetivoPrincipal", e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="descripcion">Descripción breve del negocio</Label>
              <Textarea
                id="descripcion"
                rows={3}
                value={form.descripcion ?? ""}
                onChange={(e) => handleChange("descripcion", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/5 p-3 text-sm text-warning-foreground">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>La información se guarda solo en este dispositivo.</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" onClick={handleDemo}>
              <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
              Cargar datos demostrativos
            </Button>
            <Button type="button" variant="outline" onClick={handleReset}>
              <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
              Reiniciar progreso
            </Button>
            <Button type="submit" disabled={!hasChanges}>
              <Save className="mr-2 h-4 w-4" aria-hidden="true" />
              Guardar cambios
            </Button>
          </div>
        </div>
      </form>

      <DemoNote>
        En el MVP Alfa el perfil no se sincroniza con ningún servicio externo. La autenticación y el
        almacenamiento en la nube se definirán en paquetes posteriores.
      </DemoNote>
    </div>
  );
}
