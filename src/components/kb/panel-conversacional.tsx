import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { registrarEvento } from "@/lib/analytics";
import {
  consultasSugeridas,
  responderConsulta,
  type IntencionKB,
  type RespuestaConversacionalKB,
} from "@/lib/kb/contexto-conversacional";
import type { ResultadoKB } from "@/lib/kb/tipos";
import { MessageSquare } from "lucide-react";

/**
 * Panel conversacional determinista: responde solo con la trazabilidad del
 * diagnóstico y plantillas del pack. Desacoplado para incorporar IA más adelante.
 */
export function PanelConversacionalKb({ resultado }: { resultado: ResultadoKB }) {
  const [respuesta, setRespuesta] = useState<RespuestaConversacionalKB | null>(null);

  const consultar = (intencion: IntencionKB) => {
    setRespuesta(responderConsulta(resultado, intencion));
    registrarEvento("kb_conversation_query", { intencion });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          Consultar el diagnóstico
        </CardTitle>
        <CardDescription>
          Las respuestas se construyen únicamente con tus respuestas declaradas y el conocimiento de
          esta versión del pack. Pymapa no agrega información que no esté sustentada.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {consultasSugeridas.map((consulta) => (
            <Button
              key={consulta.intencion}
              variant="outline"
              size="sm"
              onClick={() => consultar(consulta.intencion)}
            >
              {consulta.pregunta}
            </Button>
          ))}
        </div>

        {respuesta && (
          <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
            <p className="text-sm font-semibold text-foreground">{respuesta.pregunta}</p>
            {respuesta.bloques.map((bloque, indice) => (
              <div key={`${bloque.nivel}-${indice}`} className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {bloque.etiqueta}
                </p>
                <p className="text-sm text-foreground">{bloque.texto}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
