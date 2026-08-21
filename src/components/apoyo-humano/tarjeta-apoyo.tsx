import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { etiquetaEstadoApoyo, fuenteRegla, type EntradaReserva } from "@/lib/apoyo-humano/servicio";
import { etiquetaEspecialidad } from "@/lib/apoyo-humano/reglas";
import { especialistasDe, fechasDemo } from "@/lib/apoyo-humano/especialistas";
import type { RecomendacionApoyo } from "@/lib/apoyo-humano/tipos";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { LifeBuoy } from "lucide-react";

interface TarjetaApoyoProps {
  recomendacion: RecomendacionApoyo;
  onReservar: (entrada: EntradaReserva) => void;
  onCerrar: (conclusion: string, recomendacionRetorno: string) => void;
  onDescartar: () => void;
}

/** B9 · Salida de la autopista: apoyo humano especializado (reserva demostrativa). */
export function TarjetaApoyo({
  recomendacion,
  onReservar,
  onCerrar,
  onDescartar,
}: TarjetaApoyoProps) {
  const especialistas = especialistasDe(recomendacion.especialidad);
  const fechas = fechasDemo();
  const [especialistaId, setEspecialistaId] = useState(especialistas[0]?.id ?? "");
  const [fecha, setFecha] = useState(fechas[0] ?? "");
  const [hora, setHora] = useState(especialistas[0]?.franjas[0] ?? "");
  const [conclusion, setConclusion] = useState("");
  const [retorno, setRetorno] = useState("");

  const especialista = especialistas.find((e) => e.id === especialistaId) ?? especialistas[0];

  return (
    <Card>
      <CardHeader className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1.5 border-primary/40 text-primary">
            <LifeBuoy className="h-3.5 w-3.5" aria-hidden="true" />
            {etiquetaEspecialidad[recomendacion.especialidad]}
          </Badge>
          <Badge variant="secondary">{etiquetaEstadoApoyo[recomendacion.estado]}</Badge>
          <Badge variant="outline">Sesión demostrativa</Badge>
        </div>
        <CardTitle className="text-base">{recomendacion.origen.referenciaTitulo}</CardTitle>
        <CardDescription>{recomendacion.porQue}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Qué debería resolver la sesión</p>
          <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
            {recomendacion.objetivos.map((objetivo) => (
              <li key={objetivo} className="flex gap-2">
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                  aria-hidden="true"
                />
                {objetivo}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">
          Regla aplicada: {recomendacion.reglaId} · {fuenteRegla(recomendacion)}
        </p>

        {recomendacion.estado === "sugerida" && (
          <form
            className="space-y-3 rounded-xl border border-border bg-muted/30 p-4"
            onSubmit={(evento) => {
              evento.preventDefault();
              if (!especialista || !fecha || !hora) return;
              onReservar({
                especialistaId: especialista.id,
                especialistaNombre: especialista.nombre,
                fecha,
                hora,
              });
            }}
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Especialista</Label>
                <Select
                  value={especialistaId}
                  onValueChange={(valor) => {
                    setEspecialistaId(valor);
                    const siguiente = especialistas.find((e) => e.id === valor);
                    setHora(siguiente?.franjas[0] ?? "");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Elegir" />
                  </SelectTrigger>
                  <SelectContent>
                    {especialistas.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Fecha</Label>
                <Select value={fecha} onValueChange={setFecha}>
                  <SelectTrigger>
                    <SelectValue placeholder="Elegir" />
                  </SelectTrigger>
                  <SelectContent>
                    {fechas.map((f) => (
                      <SelectItem key={f} value={f}>
                        {format(new Date(f), "EEEE d MMM", { locale: es })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Hora</Label>
                <Select value={hora} onValueChange={setHora}>
                  <SelectTrigger>
                    <SelectValue placeholder="Elegir" />
                  </SelectTrigger>
                  <SelectContent>
                    {(especialista?.franjas ?? []).map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit">Reservar sesión (demo)</Button>
              <Button type="button" variant="ghost" onClick={onDescartar}>
                No necesito apoyo
              </Button>
            </div>
          </form>
        )}

        {recomendacion.estado === "reservada" && recomendacion.reserva && (
          <form
            className="space-y-3 rounded-xl border border-border bg-muted/30 p-4"
            onSubmit={(evento) => {
              evento.preventDefault();
              if (!conclusion.trim() || !retorno.trim()) return;
              onCerrar(conclusion, retorno);
            }}
          >
            <p className="text-sm text-foreground">
              Sesión con {recomendacion.reserva.especialistaNombre} ·{" "}
              {format(new Date(recomendacion.reserva.fecha), "d MMM yyyy", { locale: es })} a las{" "}
              {recomendacion.reserva.hora}.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor={`conclusion-${recomendacion.id}`}>Conclusión de la sesión</Label>
              <Textarea
                id={`conclusion-${recomendacion.id}`}
                rows={2}
                value={conclusion}
                onChange={(e) => setConclusion(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`retorno-${recomendacion.id}`}>
                Qué debe hacer la empresa al volver al recorrido
              </Label>
              <Textarea
                id={`retorno-${recomendacion.id}`}
                rows={2}
                value={retorno}
                onChange={(e) => setRetorno(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={!conclusion.trim() || !retorno.trim()}>
              Registrar conclusión y volver al recorrido
            </Button>
          </form>
        )}

        {recomendacion.estado === "realizada" && recomendacion.resultado && (
          <div className="space-y-1 rounded-xl border border-success/30 bg-success/5 p-4 text-sm">
            <p className="font-semibold text-foreground">{recomendacion.resultado.conclusion}</p>
            <p className="text-muted-foreground">
              Al volver: {recomendacion.resultado.recomendacionRetorno}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
