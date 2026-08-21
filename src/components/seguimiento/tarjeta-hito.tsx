import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EntradaMedicion } from "@/lib/seguimiento/servicio";
import type { HitoSeguimiento, IndicadorSeguimiento } from "@/lib/seguimiento/tipos";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarClock, CheckCircle2 } from "lucide-react";

interface TarjetaHitoProps {
  hito: HitoSeguimiento;
  indicador: IndicadorSeguimiento;
  onRegistrar: (entrada: EntradaMedicion) => void;
}

/** B7 · Un hito de seguimiento parametrizable (dato, indicador, respuesta, documento). */
export function TarjetaHito({ hito, indicador, onRegistrar }: TarjetaHitoProps) {
  const [valor, setValor] = useState("");
  const [respuesta, setRespuesta] = useState("");
  const [observacion, setObservacion] = useState("");

  const registrada = hito.medicion !== null;

  return (
    <Card>
      <CardHeader className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1.5">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
            {hito.etiqueta}
          </Badge>
          {registrada && (
            <Badge variant="outline" className="gap-1.5 border-success/40 text-success">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Medición registrada
            </Badge>
          )}
        </div>
        <CardTitle className="text-base">
          {indicador.nombre} ({indicador.unidad})
        </CardTitle>
        <CardDescription>
          Fecha prevista: {format(new Date(hito.fechaPrevista), "d MMM yyyy", { locale: es })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2 text-sm text-muted-foreground">
          {hito.solicitudes.map((solicitud) => (
            <li key={solicitud.texto} className="flex gap-2">
              <span
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                aria-hidden="true"
              />
              <span>
                <span className="font-medium text-foreground">{solicitud.tipo}: </span>
                {solicitud.texto}
              </span>
            </li>
          ))}
        </ul>

        {registrada ? (
          <div className="space-y-1 rounded-xl border border-border bg-muted/40 p-4 text-sm">
            <p className="font-semibold text-foreground">
              Valor informado:{" "}
              {hito.medicion?.valor === null ? "sin dato" : `${hito.medicion?.valor}${indicador.unidad}`}
            </p>
            {hito.medicion?.respuesta && (
              <p className="text-muted-foreground">{hito.medicion.respuesta}</p>
            )}
            {hito.medicion?.observacion && (
              <p className="text-muted-foreground">{hito.medicion.observacion}</p>
            )}
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(evento) => {
              evento.preventDefault();
              const numero = valor.trim() === "" ? null : Number(valor);
              onRegistrar({
                valor: numero !== null && Number.isFinite(numero) ? numero : null,
                respuesta: respuesta.trim(),
                observacion: observacion.trim(),
              });
              setValor("");
              setRespuesta("");
              setObservacion("");
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor={`valor-${hito.id}`}>
                Valor actual del indicador ({indicador.unidad})
              </Label>
              <Input
                id={`valor-${hito.id}`}
                inputMode="decimal"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="Deja vacío si aún no tienes el dato"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`respuesta-${hito.id}`}>Respuesta a lo solicitado</Label>
              <Textarea
                id={`respuesta-${hito.id}`}
                value={respuesta}
                onChange={(e) => setRespuesta(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`observacion-${hito.id}`}>Qué cambió en la operación</Label>
              <Textarea
                id={`observacion-${hito.id}`}
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                rows={2}
              />
            </div>
            <Button type="submit">Registrar medición</Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
