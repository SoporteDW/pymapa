import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, MailCheck, UserPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDelegacion } from "@/hooks/use-delegacion";
import { etiquetaEstadoDelegacion } from "@/lib/delegacion/servicio";
import type { OrigenDelegacion } from "@/lib/delegacion/tipos";

interface PedirAMiEmpresaProps {
  origen: OrigenDelegacion;
  tareaSugerida?: string;
  /** Texto del disparador; el botón es siempre secundario. */
  label?: string;
}

/**
 * Macroentrega 5 · Colaborar es una capacidad transversal, no una etapa.
 *
 * Disponible dentro del cuestionario, la profundización, una Actividad o el
 * seguimiento. El envío es simulado: se prepara el mensaje proforma, la
 * solicitud queda "Pendiente del tercero" y existe una forma controlada de
 * simular la respuesta para poder continuar el recorrido.
 */
export function PedirAMiEmpresa({
  origen,
  tareaSugerida = "",
  label = "Pedir a alguien de mi empresa",
}: PedirAMiEmpresaProps) {
  const { crear, recibir, incorporar, de } = useDelegacion();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [tarea, setTarea] = useState(tareaSugerida);

  const existentes = de(origen.referenciaId);
  const activa = existentes.find((d) => d.estado !== "incorporado") ?? null;
  const completo = nombre.trim().length > 0 && correo.trim().length > 0 && tarea.trim().length > 0;

  const enviar = () => {
    if (!completo) return;
    const delegacion = crear({ origen, nombre, correo, tarea, fechaEsperada: null });
    if (!delegacion) return;
    toast.success(`Solicitud preparada para ${delegacion.nombre}.`, {
      description: "Queda registrada como pendiente de esa persona y no bloquea tu avance.",
    });
    setNombre("");
    setCorreo("");
  };

  const simularRespuesta = () => {
    if (!activa) return;
    recibir(
      activa.id,
      `${activa.nombre} respondió con la información solicitada (respuesta simulada para la demostración).`
    );
    incorporar(activa.id);
    toast.success("Respuesta recibida e incorporada.", {
      description: "Puedes continuar desde el punto donde quedaste.",
    });
    setAbierto(false);
  };

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserPlus className="size-4" aria-hidden="true" />
          {label}
          {activa ? (
            <Badge variant="secondary" className="ml-1 rounded-full text-[10px]">
              Pendiente de tercero
            </Badge>
          ) : null}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pedir a alguien de mi empresa</DialogTitle>
          <DialogDescription>
            Tema: {origen.referenciaTitulo}. La solicitud queda registrada y tú puedes seguir
            avanzando mientras esa persona responde.
          </DialogDescription>
        </DialogHeader>

        {activa ? (
          <div className="space-y-4">
            <div className="rounded-[14px] border border-primary/25 bg-primary/5 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MailCheck className="size-4 text-primary" aria-hidden="true" />
                {activa.nombre} · {activa.area}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Estado: {etiquetaEstadoDelegacion[activa.estado]}
              </p>
              <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">
                {activa.mensajePreparado}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              En esta versión demostrativa el mensaje no se envía por correo: queda preparado y
              trazable dentro de tu recorrido.
            </p>
            <Button onClick={simularRespuesta} className="w-full gap-2">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              Simular respuesta recibida
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="colab-nombre">Nombre de la persona</Label>
              <Input
                id="colab-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="María Restrepo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="colab-correo">Correo</Label>
              <Input
                id="colab-correo"
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="maria@miempresa.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="colab-tarea">Qué necesitas de esa persona</Label>
              <Textarea
                id="colab-tarea"
                value={tarea}
                onChange={(e) => setTarea(e.target.value)}
                rows={3}
              />
            </div>
            <p className="rounded-[14px] bg-muted p-3 text-xs text-muted-foreground">
              Mensaje proforma: “Hola, te estoy enviando una solicitud que hace parte de nuestro
              Plan de Transformación. Necesitamos tu apoyo para completar esta
              información/actividad…”
            </p>
            <DialogFooter>
              <Button onClick={enviar} disabled={!completo} className="w-full">
                Preparar y registrar la solicitud
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
