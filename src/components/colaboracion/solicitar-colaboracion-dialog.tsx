import { useState } from "react";
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
import { useColaboracion } from "@/hooks/use-colaboracion";
import { useSesion } from "@/hooks/use-sesion";
import { etiquetaColaboracion, type SolicitudColaboracion } from "@/lib/colaboracion/colaboracion";
import { toast } from "sonner";
import { CheckCircle2, RotateCcw, UserPlus, Users } from "lucide-react";

/** Insignia del estado de colaboración, visible en Plan de Acción, Roadmap e Indicadores. */
export function ColaboracionBadge({ solicitud }: { solicitud: SolicitudColaboracion }) {
  const tono =
    solicitud.estado === "en_espera"
      ? "border-warning/50 bg-warning/10 text-warning-foreground"
      : solicitud.estado === "completada"
        ? "border-success/50 bg-success/10 text-success"
        : "border-primary/40 bg-primary/10 text-primary";

  return (
    <Badge variant="outline" className={`rounded-full font-medium ${tono}`}>
      <Users className="mr-1 h-3 w-3" aria-hidden="true" />
      {etiquetaColaboracion[solicitud.estado]}
    </Badge>
  );
}

interface Props {
  accionId: string;
  accionTitulo: string;
  size?: "sm" | "default";
}

/**
 * Solicitar colaboración: formulario mínimo (nombre, cargo, correo y mensaje),
 * envío por correo y registro del responsable asignado. La actividad queda
 * marcada como "En espera de colaboración".
 */
export function SolicitarColaboracionDialog({ accionId, accionTitulo, size = "sm" }: Props) {
  const { sesion } = useSesion();
  const { solicitar, cambiarEstado, solicitudDe } = useColaboracion();
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState({ nombre: "", cargo: "", correo: "", mensaje: "" });

  const solicitud = solicitudDe(accionId);

  const enviar = (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!form.nombre.trim() || !form.correo.trim()) return;
    solicitar(
      { accionId, accionTitulo, ...form },
      { empresa: sesion.empresa.nombre, responsable: sesion.empresa.responsable }
    );
    setAbierto(false);
    setForm({ nombre: "", cargo: "", correo: "", mensaje: "" });
    toast.success("Solicitud de colaboración registrada.", {
      description: "Abrimos tu correo para enviarla y marcamos la actividad en espera.",
    });
  };

  if (solicitud) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <ColaboracionBadge solicitud={solicitud} />
        <span className="text-xs text-muted-foreground">
          Responsable asignado: {solicitud.nombre}
          {solicitud.cargo ? ` · ${solicitud.cargo}` : ""}
        </span>
        {solicitud.estado !== "completada" && (
          <>
            {solicitud.estado === "en_espera" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  cambiarEstado(accionId, "retomada");
                  toast.info("Actividad retomada por el responsable principal.");
                }}
              >
                <RotateCcw className="mr-1 h-4 w-4" aria-hidden="true" />
                Retomar
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                cambiarEstado(accionId, "completada");
                toast.success("Colaboración marcada como completada.");
              }}
            >
              <CheckCircle2 className="mr-1 h-4 w-4" aria-hidden="true" />
              Completada
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="outline" size={size}>
          <UserPlus className="mr-1 h-4 w-4" aria-hidden="true" />
          Solicitar colaboración
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Solicitar colaboración</DialogTitle>
          <DialogDescription>
            Pide apoyo a otra persona de tu empresa para “{accionTitulo}”. La actividad quedará en
            espera de colaboración.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={enviar} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`colab-nombre-${accionId}`}>Nombre</Label>
              <Input
                id={`colab-nombre-${accionId}`}
                value={form.nombre}
                maxLength={100}
                required
                onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`colab-cargo-${accionId}`}>Cargo</Label>
              <Input
                id={`colab-cargo-${accionId}`}
                value={form.cargo}
                maxLength={100}
                onChange={(e) => setForm((p) => ({ ...p, cargo: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`colab-correo-${accionId}`}>Correo electrónico</Label>
            <Input
              id={`colab-correo-${accionId}`}
              type="email"
              value={form.correo}
              maxLength={255}
              required
              onChange={(e) => setForm((p) => ({ ...p, correo: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`colab-mensaje-${accionId}`}>Mensaje breve</Label>
            <Textarea
              id={`colab-mensaje-${accionId}`}
              rows={3}
              maxLength={600}
              value={form.mensaje}
              placeholder="Explica qué necesitas de esta persona."
              onChange={(e) => setForm((p) => ({ ...p, mensaje: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit">Enviar solicitud</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
