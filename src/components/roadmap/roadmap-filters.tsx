import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { etiquetaFase, fasesRoadmap } from "@/lib/roadmap/fases";
import { estadosAccion, etiquetaEstado } from "@/lib/roadmap/estados";
import {
  filtrosRoadmapIniciales,
  responsablesDe,
  type FiltrosRoadmap,
} from "@/lib/roadmap/filtros";
import type { Roadmap } from "@/lib/roadmap/tipos";
import { FilterX, Search } from "lucide-react";

/** Filtros y búsqueda del Roadmap (POC-06, 10). */
export function RoadmapFilters({
  roadmap,
  filtros,
  onCambio,
}: {
  roadmap: Roadmap;
  filtros: FiltrosRoadmap;
  onCambio: (filtros: FiltrosRoadmap) => void;
}) {
  const responsables = responsablesDe(roadmap);
  const set = <K extends keyof FiltrosRoadmap>(clave: K, valor: FiltrosRoadmap[K]) =>
    onCambio({ ...filtros, [clave]: valor });

  return (
    <Card>
      <CardContent className="grid gap-4 pt-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="roadmap-busqueda">Buscar</Label>
          <div className="relative">
            <Search
              className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="roadmap-busqueda"
              value={filtros.busqueda}
              placeholder="Acción, responsable o dimensión"
              className="pl-8"
              onChange={(evento) => set("busqueda", evento.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="roadmap-fase">Fase</Label>
          <Select value={filtros.fase} onValueChange={(valor) => set("fase", valor as never)}>
            <SelectTrigger id="roadmap-fase">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las fases</SelectItem>
              {fasesRoadmap.map((fase) => (
                <SelectItem key={fase.id} value={fase.id}>
                  {etiquetaFase[fase.id]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="roadmap-estado">Estado</Label>
          <Select value={filtros.estado} onValueChange={(valor) => set("estado", valor as never)}>
            <SelectTrigger id="roadmap-estado">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              {estadosAccion.map((estado) => (
                <SelectItem key={estado} value={estado}>
                  {etiquetaEstado[estado]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="roadmap-responsable">Responsable</Label>
          <Select
            value={filtros.responsable}
            onValueChange={(valor) => set("responsable", valor)}
          >
            <SelectTrigger id="roadmap-responsable">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="sin_responsable">Sin responsable</SelectItem>
              {responsables.map((nombre) => (
                <SelectItem key={nombre} value={nombre}>
                  {nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="roadmap-prioridad">Prioridad</Label>
          <Select
            value={filtros.prioridad}
            onValueChange={(valor) => set("prioridad", valor as never)}
          >
            <SelectTrigger id="roadmap-prioridad">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="critica">Crítica</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="media">Media</SelectItem>
              <SelectItem value="baja">Baja</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="roadmap-orden">Ordenar por</Label>
          <Select value={filtros.orden} onValueChange={(valor) => set("orden", valor as never)}>
            <SelectTrigger id="roadmap-orden">
              <SelectValue placeholder="Prioridad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="prioridad">Prioridad</SelectItem>
              <SelectItem value="fecha_inicio">Fecha de inicio</SelectItem>
              <SelectItem value="fecha_fin">Fecha objetivo</SelectItem>
              <SelectItem value="avance">Avance</SelectItem>
              <SelectItem value="manual">Secuencia del plan</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col justify-end gap-3">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="roadmap-vencidas" className="text-sm font-normal">
              Solo vencidas
            </Label>
            <Switch
              id="roadmap-vencidas"
              checked={filtros.soloVencidas}
              onCheckedChange={(valor) => set("soloVencidas", valor)}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="roadmap-bloqueadas" className="text-sm font-normal">
              Solo bloqueadas
            </Label>
            <Switch
              id="roadmap-bloqueadas"
              checked={filtros.soloBloqueadas}
              onCheckedChange={(valor) => set("soloBloqueadas", valor)}
            />
          </div>
        </div>

        <div className="flex flex-col justify-end gap-3">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="roadmap-descartadas" className="text-sm font-normal">
              Incluir descartadas
            </Label>
            <Switch
              id="roadmap-descartadas"
              checked={filtros.incluirDescartadas}
              onCheckedChange={(valor) => set("incluirDescartadas", valor)}
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => onCambio(filtrosRoadmapIniciales)}>
            <FilterX className="mr-1 h-4 w-4" aria-hidden="true" />
            Limpiar filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
