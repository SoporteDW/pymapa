import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PedirAMiEmpresa } from "@/components/colaboracion/pedir-a-mi-empresa";
import { PedirApoyoExperto } from "@/components/apoyo-humano/pedir-apoyo-experto";
import type { EvidenciaEmpresa } from "@/lib/evidencias/tipos";
import type { MecanismoResolucion, NecesidadInformacion } from "@/lib/suficiencia/tipos";
import { dominioPorId } from "@/lib/dominios/registro";
import { CheckCircle2, FileUp, HelpCircle, Lock, MessageSquare, Paperclip } from "lucide-react";

interface Props {
  necesidad: NecesidadInformacion;
  evidencia: EvidenciaEmpresa | undefined;
  onSolicitar: (necesidad: NecesidadInformacion) => void;
  onCargar: (evidenciaId: string, archivo: File) => void;
  onResponder: (necesidad: NecesidadInformacion, respuesta: string) => void;
  /** Tras el cierre formal del diagnóstico la necesidad es solo consulta. */
  soloLectura?: boolean;
}

const comoSeResolvio: Record<MecanismoResolucion, string> = {
  aclaracion: "Resuelto con tu aclaración.",
  evidencia: "Resuelto con el documento que adjuntaste.",
  delegacion: "Resuelto con la información que aportó tu equipo.",
  apoyo: "Resuelto en la sesión con el especialista.",
};

/**
 * Una necesidad de información concreta.
 *
 * Profundización modular: la tarjeta describe QUÉ falta y ofrece los cuatro
 * mecanismos válidos para resolverlo (aclarar, adjuntar, pedir a mi equipo,
 * pedir apoyo). La necesidad se cierra con el primero que aporte la
 * información; el catálogo solo sugiere un medio, no lo impone.
 */
export function TarjetaNecesidad({
  necesidad,
  evidencia,
  onSolicitar,
  onCargar,
  onResponder,
  soloLectura = false,
}: Props) {
  const inputArchivo = useRef<HTMLInputElement>(null);
  const [respuesta, setRespuesta] = useState("");
  const [mostrarAclaracion, setMostrarAclaracion] = useState(
    necesidad.tipo === "aclaracion"
  );

  const dominio = dominioPorId(necesidad.dominioId);
  const esAclaracion = necesidad.tipo === "aclaracion";

  const origen = {
    tipo: esAclaracion ? ("aclaracion" as const) : ("evidencia" as const),
    referenciaId: necesidad.reglaId,
    referenciaTitulo: necesidad.titulo,
    dominioId: necesidad.dominioId,
    dominioNombre: dominio?.nombre ?? necesidad.dominioId,
    rutaRetorno: "/diagnostico/cierre",
  };

  const origenApoyo = {
    tipo: "evidencia" as const,
    referenciaId: necesidad.reglaId,
    referenciaTitulo: necesidad.titulo,
    dominioId: necesidad.dominioId,
    dominioNombre: dominio?.nombre ?? necesidad.dominioId,
    rutaRetorno: "/diagnostico/cierre",
  };

  return (
    <Card className={esAclaracion ? "border-warning/30" : "border-info/30"}>
      <CardHeader className="space-y-1.5">
        <Badge
          variant="outline"
          className={
            esAclaracion
              ? "w-fit gap-1.5 border-warning/40 text-warning"
              : "w-fit gap-1.5 border-info/40 text-info"
          }
        >
          {esAclaracion ? (
            <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {esAclaracion ? "Necesito entender mejor esto" : "Necesito comprobar esto"}
        </Badge>
        <CardTitle className="text-base leading-snug">{necesidad.titulo}</CardTitle>
        <CardDescription>{necesidad.porQue}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {necesidad.resuelta ? (
          <p className="flex items-center gap-2 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {necesidad.resueltaPor
              ? comoSeResolvio[necesidad.resueltaPor]
              : "Aspecto resuelto."}
          </p>
        ) : soloLectura ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" aria-hidden="true" />
            Quedó pendiente al momento de cerrar el diagnóstico.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Puedes resolverlo como te resulte más fácil: explicarlo con tus palabras, adjuntar un
              documento, pedírselo a alguien de tu equipo o pedir apoyo de un especialista.
            </p>

            {evidencia?.analisis ? (
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
            ) : null}

            {mostrarAclaracion ? (
              <div className="space-y-2">
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
                  Guardar mi explicación
                </Button>
              </div>
            ) : null}

            {evidencia && !evidencia.analisis ? (
              <p className="text-sm text-muted-foreground">{evidencia.instrucciones}</p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {!mostrarAclaracion && (
                <Button size="sm" variant="outline" onClick={() => setMostrarAclaracion(true)}>
                  <MessageSquare className="h-4 w-4" aria-hidden="true" />
                  Explicarlo yo
                </Button>
              )}

              <input
                ref={inputArchivo}
                type="file"
                className="sr-only"
                aria-label={`Adjuntar documento para ${necesidad.titulo}`}
                onChange={(evento) => {
                  const archivo = evento.target.files?.[0];
                  if (archivo && evidencia) onCargar(evidencia.id, archivo);
                  evento.target.value = "";
                }}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (!evidencia) {
                    onSolicitar(necesidad);
                    return;
                  }
                  inputArchivo.current?.click();
                }}
              >
                <FileUp className="h-4 w-4" aria-hidden="true" />
                {evidencia ? "Adjuntar documento" : "Ver qué documento sirve"}
              </Button>

              <PedirAMiEmpresa
                origen={origen}
                tareaSugerida={necesidad.titulo}
                label="Pedirlo a mi equipo"
              />
              <PedirApoyoExperto origen={origenApoyo} label="Pedir apoyo experto" />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
