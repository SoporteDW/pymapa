import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ArchivoEvidencia } from "@/lib/evidencias/tipos";
import type { ActividadWorkspace } from "@/lib/workspace/tipos";
import { FileUp, Paperclip, Send } from "lucide-react";

interface Props {
  actividad: ActividadWorkspace;
  onEntregar: (entrada: {
    nota: string;
    criteriosDeclarados: string[];
    archivos: ArchivoEvidencia[];
  }) => void;
}

/**
 * B5 · Entrega del entregable definido por el instrumento. El archivo no se
 * almacena: se registran sus metadatos y la revisión posterior es simulada.
 */
export function FormularioEntrega({ actividad, onEntregar }: Props) {
  const inputArchivo = useRef<HTMLInputElement>(null);
  const [nota, setNota] = useState("");
  const [criterios, setCriterios] = useState<string[]>([]);
  const [archivos, setArchivos] = useState<ArchivoEvidencia[]>([]);

  const alternar = (criterio: string, marcado: boolean) => {
    setCriterios((previos) =>
      marcado ? [...previos, criterio] : previos.filter((c) => c !== criterio)
    );
  };

  const agregarArchivo = (archivo: File) => {
    setArchivos((previos) => [
      ...previos,
      {
        nombre: archivo.name,
        tipoMime: archivo.type || "application/octet-stream",
        tamañoBytes: archivo.size,
        ubicacion: null,
      },
    ]);
  };

  return (
    <Card className="border-primary/30">
      <CardHeader className="space-y-2">
        <Badge variant="outline" className="w-fit gap-1.5 border-primary/40 text-primary">
          <Send className="h-3.5 w-3.5" aria-hidden="true" />
          Entregar para revisión
        </Badge>
        <CardTitle className="text-base">{actividad.entregable.titulo}</CardTitle>
        <CardDescription>{actividad.entregable.descripcion}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">
            Criterios que se verificarán en la revisión
          </p>
          {actividad.entregable.criteriosValidacion.map((criterio) => (
            <label key={criterio} className="flex items-start gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={criterios.includes(criterio)}
                onCheckedChange={(valor) => alternar(criterio, valor === true)}
                aria-label={criterio}
                className="mt-0.5"
              />
              {criterio}
            </label>
          ))}
        </div>

        <div className="space-y-2">
          <label htmlFor="nota-entrega" className="text-sm font-semibold text-foreground">
            Nota de entrega
          </label>
          <Textarea
            id="nota-entrega"
            value={nota}
            onChange={(evento) => setNota(evento.target.value)}
            placeholder="Describe qué se hizo, quién participó y qué resultado obtuvieron."
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <input
            ref={inputArchivo}
            type="file"
            className="hidden"
            onChange={(evento) => {
              const archivo = evento.target.files?.[0];
              if (archivo) agregarArchivo(archivo);
              evento.target.value = "";
            }}
          />
          <Button variant="outline" onClick={() => inputArchivo.current?.click()}>
            <FileUp className="h-4 w-4" aria-hidden="true" />
            Adjuntar entregable
          </Button>
          {archivos.length > 0 && (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {archivos.map((archivo) => (
                <li key={archivo.nombre} className="flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
                  {archivo.nombre}
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">
            En esta versión del demo el contenido del archivo no se lee: la revisión es simulada y
            verifica los criterios declarados.
          </p>
        </div>

        <Button
          onClick={() => {
            onEntregar({ nota, criteriosDeclarados: criterios, archivos });
            setNota("");
            setCriterios([]);
            setArchivos([]);
          }}
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          Enviar a revisión
        </Button>
      </CardContent>
    </Card>
  );
}
