import { useState } from "react";
import { Download, FileText, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Entregable } from "@/lib/entregables/catalogo";

interface Props {
  entregable: Entregable;
  /** Texto del botón principal; por defecto describe la descarga. */
  etiqueta?: string;
}

/**
 * Presentación uniforme de un entregable del recorrido. Si la descarga es real
 * se abre el archivo; si es demostrativa se explica con transparencia qué
 * contendría el documento en la versión completa.
 */
export function TarjetaEntregable({ entregable, etiqueta }: Props) {
  const [abierto, setAbierto] = useState(false);
  const esReal = entregable.modo === "real" && Boolean(entregable.archivo);

  return (
    <Card className="border-primary/25">
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
          <FileText className="size-4" aria-hidden="true" />
          Entregable
        </div>
        <CardTitle className="text-lg leading-snug">{entregable.titulo}</CardTitle>
        <CardDescription>{entregable.proposito}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-xs font-medium text-foreground">Qué incluye</p>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {entregable.contenido.map((linea) => (
            <li key={linea} className="flex gap-2">
              <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              <span>{linea}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="flex flex-wrap items-center gap-2">
        {esReal ? (
          /* P0.1 · descarga directa del activo estático: enlace nativo, sin
             navegación por el router ni lógica simulada. El usuario permanece
             en la pantalla actual. */
          <Button asChild>
            <a
              href={entregable.archivo}
              download={entregable.nombreArchivo}
              type="application/pdf"
              rel="noopener"
              target="_blank"
            >
              <Download className="size-4" aria-hidden="true" />
              {etiqueta ?? `Descargar ${entregable.titulo}`}
            </a>
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={() => setAbierto(true)}>
              <Download className="size-4" aria-hidden="true" />
              {etiqueta ?? `Descargar ${entregable.titulo}`}
            </Button>
            <span className="text-xs text-muted-foreground">Descarga demostrativa</span>
          </>
        )}
      </CardFooter>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="size-4 text-primary" aria-hidden="true" />
              {entregable.titulo}: descarga demostrativa
            </DialogTitle>
            <DialogDescription>{entregable.aviso}</DialogDescription>
          </DialogHeader>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {entregable.contenido.map((linea) => (
              <li key={linea} className="flex gap-2">
                <span
                  aria-hidden="true"
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-primary"
                />
                <span>{linea}</span>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button onClick={() => setAbierto(false)}>Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
