import { useMemo, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Bot, MessageCircle, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSesion } from "@/hooks/use-sesion";
import { useEstadoDiagnostico } from "@/hooks/use-estado-diagnostico";
import { useWorkspace } from "@/hooks/use-workspace";
import { useSeguimiento } from "@/hooks/use-seguimiento";
import { proximoHitoPendiente } from "@/lib/seguimiento/servicio";
import {
  etiquetaZona,
  saludoAsistente,
  sugerenciasAsistente,
  zonaDesdeRuta,
  type ContextoAsistente,
  type RespuestaAsistente,
} from "@/lib/asistente/guion";
import { cn } from "@/lib/utils";

interface Turno {
  id: string;
  pregunta: string;
  respuesta: string;
}

/**
 * Macroentrega 5 · Asistente Pymapa persistente.
 *
 * Botón flotante discreto que no compite con el CTA principal. Las
 * conversaciones son SIMULADAS y contextuales: no hay IA real en el MVP Alfa.
 */
export function AsistentePymapa() {
  const ruta = useRouterState({ select: (s) => s.location.pathname });
  const { sesion } = useSesion();
  const { journey } = useEstadoDiagnostico();
  const workspace = useWorkspace();
  const seguimiento = useSeguimiento();
  const [abierto, setAbierto] = useState(false);
  const [turnos, setTurnos] = useState<Turno[]>([]);

  const zona = zonaDesdeRuta(ruta);

  const contexto = useMemo<ContextoAsistente>(() => {
    const enFoco =
      workspace.actividades.find((a) => ruta.includes(a.id)) ??
      workspace.actividades.find((a) => a.estado === "en_ejecucion" || a.estado === "requiere_ajustes") ??
      workspace.actividades[0];
    const seg = seguimiento.seguimientos[0];
    const hito = seg ? proximoHitoPendiente(seg) : null;
    return {
      empresaNombre: sesion.empresa.nombre,
      respondidas: journey.cuestionario.respondidas,
      total: journey.cuestionario.total,
      profundizacionPendiente: journey.profundizacion.pendientes,
      actividadTitulo: enFoco?.titulo ?? null,
      hallazgo: enFoco?.porQue ?? null,
      prioridad: enFoco?.origen.dominioNombre ? "Alta" : null,
      objetivo: enFoco?.objetivo ?? null,
      indicador: seg?.indicador.nombre ?? null,
      proximoHito: hito?.etiqueta ?? null,
    };
  }, [ruta, sesion.empresa.nombre, journey, workspace.actividades, seguimiento.seguimientos]);

  const sugerencias = useMemo(() => sugerenciasAsistente(zona, contexto), [zona, contexto]);
  const saludo = saludoAsistente(zona, contexto);

  const preguntar = (sugerencia: RespuestaAsistente) => {
    setTurnos((previos) => [
      ...previos,
      { id: `${sugerencia.id}-${previos.length}`, pregunta: sugerencia.pregunta, respuesta: sugerencia.respuesta },
    ]);
  };

  return (
    <Sheet
      open={abierto}
      onOpenChange={(valor) => {
        setAbierto(valor);
        if (!valor) setTurnos([]);
      }}
    >
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "fixed bottom-4 right-4 z-30 gap-2 rounded-full border-primary/30 bg-card/95 shadow-suave backdrop-blur",
            "hover:bg-primary/5"
          )}
          aria-label="Hablar con el asistente de Pymapa"
        >
          <Bot className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="hidden sm:inline">Hablar con Pymapa</span>
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="space-y-2 border-b border-border p-5 text-left">
          <Badge variant="secondary" className="w-fit rounded-full text-[11px]">
            {etiquetaZona[zona]}
          </Badge>
          <SheetTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            Asistente Pymapa
          </SheetTitle>
          <SheetDescription className="text-sm">{saludo}</SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-4 p-5">
            {turnos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Elige una de estas preguntas para ver cómo te acompaño en este punto del recorrido.
              </p>
            ) : (
              <ul className="space-y-4">
                {turnos.map((turno) => (
                  <li key={turno.id} className="space-y-2">
                    <p className="ml-auto w-fit max-w-[85%] rounded-[14px] bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
                      {turno.pregunta}
                    </p>
                    <p className="w-fit max-w-[92%] rounded-[14px] bg-muted px-3 py-2 text-sm text-foreground">
                      {turno.respuesta}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            <div className="space-y-2 pt-2">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                Puedes preguntarme
              </p>
              <ul className="space-y-2">
                {sugerencias.map((sugerencia) => (
                  <li key={sugerencia.id}>
                    <button
                      type="button"
                      onClick={() => preguntar(sugerencia)}
                      className="w-full rounded-[14px] border border-border bg-card px-3 py-2 text-left text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
                    >
                      {sugerencia.pregunta}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </ScrollArea>

        <p className="border-t border-border p-4 text-xs text-muted-foreground">
          Versión demostrativa: las respuestas provienen del conocimiento ya registrado de tu
          empresa y de tu recorrido, sin conexión a servicios externos.
        </p>
      </SheetContent>
    </Sheet>
  );
}
