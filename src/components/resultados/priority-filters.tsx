import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { filtrosIniciales, type FiltrosAcciones } from "@/lib/resultados/generador";
import type { DimensionResultVista } from "@/lib/resultados/tipos";
import { RotateCcw } from "lucide-react";

interface PriorityFiltersProps {
  filtros: FiltrosAcciones;
  dimensiones: DimensionResultVista[];
  onCambio: (filtros: FiltrosAcciones) => void;
}

/** PriorityFilters (POC-05, 9 · CA-05-08): filtros y orden de las Fichas de Acción. */
export function PriorityFilters({ filtros, dimensiones, onCambio }: PriorityFiltersProps) {
  const actualizar = <K extends keyof FiltrosAcciones>(clave: K, valor: FiltrosAcciones[K]) =>
    onCambio({ ...filtros, [clave]: valor });

  return (
    <Card>
      <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1.5">
          <Label htmlFor="filtro-nivel">Prioridad</Label>
          <Select value={filtros.nivel} onValueChange={(v) => actualizar("nivel", v as FiltrosAcciones["nivel"])}>
            <SelectTrigger id="filtro-nivel">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              <SelectItem value="critica">Crítica</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="media">Media</SelectItem>
              <SelectItem value="baja">Baja</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="filtro-dimension">Área</Label>
          <Select
            value={filtros.dimensionId}
            onValueChange={(v) => actualizar("dimensionId", v)}
          >
            <SelectTrigger id="filtro-dimension">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {dimensiones.map((dimension) => (
                <SelectItem key={dimension.dimensionId} value={dimension.dimensionId}>
                  {dimension.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="filtro-esfuerzo">Esfuerzo</Label>
          <Select
            value={filtros.esfuerzo}
            onValueChange={(v) => actualizar("esfuerzo", v as FiltrosAcciones["esfuerzo"])}
          >
            <SelectTrigger id="filtro-esfuerzo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="bajo">Bajo</SelectItem>
              <SelectItem value="medio">Medio</SelectItem>
              <SelectItem value="alto">Alto</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="filtro-impacto">Impacto</Label>
          <Select
            value={filtros.impacto}
            onValueChange={(v) => actualizar("impacto", v as FiltrosAcciones["impacto"])}
          >
            <SelectTrigger id="filtro-impacto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="alto">Alto</SelectItem>
              <SelectItem value="medio">Medio</SelectItem>
              <SelectItem value="bajo">Bajo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="filtro-orden">Ordenar por</Label>
          <div className="flex gap-2">
            <Select
              value={filtros.orden}
              onValueChange={(v) => actualizar("orden", v as FiltrosAcciones["orden"])}
            >
              <SelectTrigger id="filtro-orden">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prioridad">Prioridad</SelectItem>
                <SelectItem value="esfuerzo">Menor esfuerzo</SelectItem>
                <SelectItem value="impacto">Mayor impacto</SelectItem>
                <SelectItem value="dimension">Área</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onCambio(filtrosIniciales)}
              aria-label="Restablecer filtros"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
