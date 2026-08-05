import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Link } from "@tanstack/react-router";
import { secuenciaRecorrido } from "@/lib/recorrido-modulos";
import { PlayCircle } from "lucide-react";

/**
 * Tutorial general del producto ("Cómo funciona"). Orienta al usuario sobre el
 * recorrido completo; no reemplaza ni altera el proceso.
 */
export function ComoFuncionaDialog({ variant = "outline" }: { variant?: "outline" | "secondary" }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant={variant} size="lg">
          <PlayCircle className="mr-2 h-4 w-4" aria-hidden="true" />
          Cómo funciona
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cómo funciona pymapa</DialogTitle>
          <DialogDescription>
            Un recorrido guiado en seis etapas. Puedes guardar y continuar en cualquier momento.
          </DialogDescription>
        </DialogHeader>

        <div className="flex aspect-video items-center justify-center rounded-xl border border-border bg-patron-marca bg-muted/40">
          <p className="max-w-sm px-6 text-center text-sm text-muted-foreground">
            El video tutorial se incorporará en la siguiente versión. Mientras tanto, este es el
            recorrido que te propone la plataforma.
          </p>
        </div>

        <ol className="space-y-3">
          {secuenciaRecorrido.map((modulo) => (
            <li key={modulo.id} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {modulo.numero}
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">{modulo.label}</p>
                <p className="text-sm text-muted-foreground">{modulo.descripcion}</p>
              </div>
            </li>
          ))}
        </ol>

        <Button variant="link" className="justify-start px-0" asChild>
          <Link to="/ayuda" onClick={() => setAbierto(false)}>
            Ver el centro de ayuda completo
          </Link>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
