import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  descripcionEstadoDelegacion,
  etiquetaEstadoDelegacion,
} from "@/lib/delegacion/servicio";
import type { Delegacion } from "@/lib/delegacion/tipos";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Copy, Mail } from "lucide-react";

interface TarjetaDelegacionProps {
  delegacion: Delegacion;
  onRecibir: (respuesta: string) => void;
  onIncorporar: () => void;
}

/** B8 · Estado de una delegación: pendiente tercero → recibido → incorporado. */
export function TarjetaDelegacion({
  delegacion,
  onRecibir,
  onIncorporar,
}: TarjetaDelegacionProps) {
  const [respuesta, setRespuesta] = useState("");

  const estilo =
    delegacion.estado === "incorporado"
      ? "border-success/40 text-success"
      : delegacion.estado === "recibido"
        ? "border-primary/40 text-primary"
        : "border-warning/40 text-warning";

  return (
    <Card>
      <CardHeader className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={estilo}>
            {etiquetaEstadoDelegacion[delegacion.estado]}
          </Badge>
          <Badge variant="secondary">{delegacion.area}</Badge>
          <Badge variant="outline">Correo simulado</Badge>
        </div>
        <CardTitle className="text-base">
          {delegacion.nombre} · {delegacion.correo}
        </CardTitle>
        <CardDescription>{descripcionEstadoDelegacion[delegacion.estado]}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1 text-sm">
          <p className="font-semibold text-foreground">{delegacion.origen.referenciaTitulo}</p>
          <p className="text-muted-foreground">{delegacion.tarea}</p>
          {delegacion.fechaEsperada && (
            <p className="text-xs text-muted-foreground">
              Fecha esperada:{" "}
              {format(new Date(delegacion.fechaEsperada), "d MMM yyyy", { locale: es })}
            </p>
          )}
        </div>

        <details className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
          <summary className="cursor-pointer font-medium text-foreground">
            Ver el mensaje preparado
          </summary>
          <pre className="mt-3 whitespace-pre-wrap font-sans text-xs text-muted-foreground">
            {delegacion.mensajePreparado}
          </pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard?.writeText(delegacion.mensajePreparado)}
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copiar mensaje
            </Button>
            <Button type="button" variant="outline" size="sm" asChild>
              <a
                href={`mailto:${delegacion.correo}?subject=${encodeURIComponent(
                  `pymapa · ${delegacion.origen.referenciaTitulo}`
                )}&body=${encodeURIComponent(delegacion.mensajePreparado)}`}
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                Abrir en el correo
              </a>
            </Button>
          </div>
        </details>

        {delegacion.estado === "pendiente_tercero" && (
          <form
            className="space-y-2"
            onSubmit={(evento) => {
              evento.preventDefault();
              if (!respuesta.trim()) return;
              onRecibir(respuesta);
              setRespuesta("");
            }}
          >
            <Textarea
              rows={3}
              value={respuesta}
              onChange={(e) => setRespuesta(e.target.value)}
              placeholder="Registra lo que respondió esta persona"
              aria-label="Respuesta del colaborador"
            />
            <Button type="submit" size="sm" disabled={!respuesta.trim()}>
              Registrar respuesta recibida
            </Button>
          </form>
        )}

        {delegacion.estado !== "pendiente_tercero" && delegacion.respuesta && (
          <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            {delegacion.respuesta}
          </div>
        )}

        {delegacion.estado === "recibido" && (
          <Button size="sm" onClick={onIncorporar}>
            Incorporar al conocimiento de la empresa
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
