import { useState } from "react";
import { toast } from "sonner";
import { CalendarCheck, LifeBuoy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApoyoHumano } from "@/hooks/use-apoyo-humano";
import { etiquetaEspecialidad } from "@/lib/apoyo-humano/reglas";
import { especialistasDemo, fechasDemo } from "@/lib/apoyo-humano/especialistas";
import { etiquetaEstadoApoyo } from "@/lib/apoyo-humano/servicio";
import type { OrigenApoyo } from "@/lib/apoyo-humano/tipos";

interface PedirApoyoExpertoProps {
  origen: OrigenApoyo;
  label?: string;
}

/**
 * Macroentrega 5 · El apoyo experto es transversal: puede solicitarse al cerrar
 * el diagnóstico (transferencia con consultor) o dentro de cualquier Actividad.
 * La reserva y la sesión son simuladas; al terminar, la conclusión devuelve al
 * usuario al punto exacto de su recorrido.
 */
export function PedirApoyoExperto({
  origen,
  label = "Solicitar apoyo especializado",
}: PedirApoyoExpertoProps) {
  const { de, evaluar, reservar, cerrarSesion } = useApoyoHumano();
  const [abierto, setAbierto] = useState(false);
  const fechas = fechasDemo();
  const [especialistaId, setEspecialistaId] = useState(especialistasDemo[0]?.id ?? "");
  const [fecha, setFecha] = useState(fechas[0] ?? "");
  const [hora, setHora] = useState(especialistasDemo[0]?.franjas[0] ?? "");

  const existentes = de(origen.referenciaId);
  const activa =
    existentes.find((r) => r.estado === "reservada") ??
    existentes.find((r) => r.estado === "realizada") ??
    existentes.find((r) => r.estado === "sugerida") ??
    null;

  const especialista = especialistasDemo.find((e) => e.id === especialistaId);

  const reservarSesion = () => {
    // Reutiliza las reglas B9: una solicitud explícita se registra como
    // decisión que conviene tomar acompañada.
    const creadas = activa ? [activa] : evaluar({ decisionEspecializada: true }, origen);
    const recomendacion = creadas[0];
    if (!recomendacion || !especialista) return;
    const reserva = reservar(recomendacion.id, {
      especialistaId: especialista.id,
      especialistaNombre: especialista.nombre,
      fecha,
      hora,
    });
    if (reserva) {
      toast.success(`Sesión reservada con ${reserva.especialistaNombre} (demostrativa).`, {
        description: `${reserva.fecha} · ${reserva.hora}. Tu actividad queda con el apoyo registrado.`,
      });
    }
  };

  const cerrar = () => {
    if (!activa || activa.estado !== "reservada") return;
    const resultado = cerrarSesion(
      activa.id,
      "El especialista revisó el caso contigo y acordaron el ajuste mínimo necesario (conclusión simulada).",
      "Retoma la actividad y aplica el ajuste acordado antes de volver a entregar."
    );
    if (resultado) {
      toast.success("Conclusión de la sesión incorporada.", {
        description: resultado.recomendacionRetorno,
      });
      setAbierto(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <LifeBuoy className="size-4" aria-hidden="true" />
          {label}
          {activa ? (
            <Badge variant="secondary" className="ml-1 rounded-full text-[10px]">
              {etiquetaEstadoApoyo[activa.estado]}
            </Badge>
          ) : null}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Apoyo especializado</DialogTitle>
          <DialogDescription>
            Sobre: {origen.referenciaTitulo}. Reserva demostrativa: no se agenda ninguna cita real.
          </DialogDescription>
        </DialogHeader>

        {activa?.estado === "realizada" && activa.resultado ? (
          <div className="space-y-3 rounded-[14px] border border-success/30 bg-success/5 p-4">
            <p className="text-sm font-semibold text-foreground">Sesión realizada (demostrativa)</p>
            <p className="text-sm text-muted-foreground">{activa.resultado.conclusion}</p>
            <p className="text-sm text-foreground">
              Qué hacer al volver: {activa.resultado.recomendacionRetorno}
            </p>
          </div>
        ) : activa?.estado === "reservada" && activa.reserva ? (
          <div className="space-y-4">
            <div className="rounded-[14px] border border-primary/25 bg-primary/5 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <CalendarCheck className="size-4 text-primary" aria-hidden="true" />
                {activa.reserva.especialistaNombre} · {etiquetaEspecialidad[activa.especialidad]}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {activa.reserva.fecha} · {activa.reserva.hora}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">Objetivo de la sesión:</p>
              <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                {activa.objetivos.map((objetivo) => (
                  <li key={objetivo}>· {objetivo}</li>
                ))}
              </ul>
            </div>
            <Button onClick={cerrar} className="w-full">
              Simular sesión realizada y volver a mi recorrido
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apoyo-especialista">Tipo de especialista</Label>
              <Select
                value={especialistaId}
                onValueChange={(valor) => {
                  setEspecialistaId(valor);
                  const elegido = especialistasDemo.find((e) => e.id === valor);
                  setHora(elegido?.franjas[0] ?? "");
                }}
              >
                <SelectTrigger id="apoyo-especialista">
                  <SelectValue placeholder="Selecciona un especialista" />
                </SelectTrigger>
                <SelectContent>
                  {especialistasDemo.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {etiquetaEspecialidad[e.especialidad]} · {e.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {especialista ? (
                <p className="text-xs text-muted-foreground">{especialista.perfil}</p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="apoyo-fecha">Fecha</Label>
                <Select value={fecha} onValueChange={setFecha}>
                  <SelectTrigger id="apoyo-fecha">
                    <SelectValue placeholder="Fecha" />
                  </SelectTrigger>
                  <SelectContent>
                    {fechas.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="apoyo-hora">Hora</Label>
                <Select value={hora} onValueChange={setHora}>
                  <SelectTrigger id="apoyo-hora">
                    <SelectValue placeholder="Hora" />
                  </SelectTrigger>
                  <SelectContent>
                    {(especialista?.franjas ?? []).map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={reservarSesion}
              disabled={!especialista || !fecha || !hora}
              className="w-full"
            >
              Reservar sesión (demostrativa)
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
