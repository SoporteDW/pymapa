import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { EvidenciaEmpresa } from "@/lib/evidencias/tipos";
import type { NecesidadInformacion } from "@/lib/suficiencia/tipos";
import { CheckCircle2, FileUp, MessageCircleQuestion, Paperclip } from "lucide-react";

interface Props {
  necesidad: NecesidadInformacion;
  evidencia: EvidenciaEmpresa | undefined;
  onSolicitar: (necesidad: NecesidadInformacion) => void;
  onCargar: (evidenciaId: string, archivo: File) => void;
  onResponder: (necesidad: NecesidadInformacion, respuesta: string) => void;
}

/**
 * Una necesidad de información concreta: documento por adjuntar o aclaración
 * por responder. Los textos provienen del catálogo de conocimiento.
 */
export function TarjetaNecesidad({
  necesidad,
  evidencia,
  onSolicitar,
  onCargar,
  onResponder,
}: Props) {
  const inputArchivo = useRef<HTMLInputElement>(null);
  const [respuesta, setRespuesta] = useState("");

  if (necesidad.tipo === "aclaracion") {
    return (
      <Card className="border-warning/30">
        <CardHeader className="space-y-1.5">
          <Badge variant="outline" className="w-fit gap-1.5 border-warning/40 text-warning">
            <MessageCircleQuestion className="h-3.5 w-3.5" aria-hidden="true" />
            Necesito una aclaración
          </Badge>
          <CardTitle className="text-base leading-snug">{necesidad.titulo}</CardTitle>
          <CardDescription>{necesidad.porQue}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {necesidad.resuelta ? (
            <p className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Aclaración registrada. Ya podemos interpretar este dominio.
            </p>
          ) : (
            <>
              <Textarea
                value={respuesta}
                onChange={(evento) => setRespuesta(evento.target.value)}
                placeholder="Escribe tu respuesta con tus propias palabras."
                aria-label={necesidad.titulo}
                rows={3}
              />
              <Button
                size="sm"
                disabled={respuesta.trim().length === 0}
                onClick={() => onResponder(necesidad, respuesta)}
              >
                Guardar aclaración
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-info/30">
      <CardHeader className="space-y-1.5">
        <Badge variant="outline" className="w-fit gap-1.5 border-info/40 text-info">
          <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
          Necesito una evidencia
        </Badge>
        <CardTitle className="text-base leading-snug">{necesidad.titulo}</CardTitle>
        <CardDescription>{necesidad.porQue}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {evidencia ? (
          <>
            <p className="text-sm text-muted-foreground">{evidencia.instrucciones}</p>
            {evidencia.analisis ? (
              <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-3">
                <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                  {evidencia.archivo?.nombre}
                </p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {evidencia.analisis.observaciones.map((observacion) => (
                    <li key={observacion}>{observacion}</li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">
                  Análisis simulado · versión {evidencia.analisis.version}
                </p>
              </div>
            ) : (
              <>
                <input
                  ref={inputArchivo}
                  type="file"
                  className="sr-only"
                  aria-label={`Adjuntar ${evidencia.titulo}`}
                  onChange={(evento) => {
                    const archivo = evento.target.files?.[0];
                    if (archivo) onCargar(evidencia.id, archivo);
                    evento.target.value = "";
                  }}
                />
                <Button size="sm" onClick={() => inputArchivo.current?.click()}>
                  <FileUp className="h-4 w-4" aria-hidden="true" />
                  Adjuntar documento
                </Button>
              </>
            )}
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={() => onSolicitar(necesidad)}>
            Ver qué documento necesito
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
