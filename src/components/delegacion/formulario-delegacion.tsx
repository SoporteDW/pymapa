import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EntradaDelegacion } from "@/lib/delegacion/servicio";
import type { OrigenDelegacion } from "@/lib/delegacion/tipos";
import { UserPlus } from "lucide-react";

type Entrada = Omit<EntradaDelegacion, "empresaId" | "empresaNombre" | "solicitante">;

interface FormularioDelegacionProps {
  origen: OrigenDelegacion;
  areaSugerida: string;
  tareaSugerida?: string;
  onDelegar: (entrada: Entrada) => void;
}

/** B8 · Delegar una parte del recorrido a la persona competente de la empresa. */
export function FormularioDelegacion({
  origen,
  areaSugerida,
  tareaSugerida = "",
  onDelegar,
}: FormularioDelegacionProps) {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [area, setArea] = useState(areaSugerida);
  const [tarea, setTarea] = useState(tareaSugerida);
  const [fecha, setFecha] = useState("");

  const completo = nombre.trim() && correo.trim() && tarea.trim();

  return (
    <Card>
      <CardHeader className="space-y-1.5">
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="h-5 w-5 text-primary" aria-hidden="true" />
          Pedir apoyo a alguien de la empresa
        </CardTitle>
        <CardDescription>
          Se prepara el mensaje y queda registrado quién debe responder. Tema: {origen.referenciaTitulo}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(evento) => {
            evento.preventDefault();
            if (!completo) return;
            onDelegar({
              origen,
              nombre,
              correo,
              area,
              tarea,
              fechaEsperada: fecha || null,
            });
            setNombre("");
            setCorreo("");
            setTarea("");
            setFecha("");
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="del-nombre">Nombre</Label>
              <Input id="del-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="del-correo">Correo</Label>
              <Input
                id="del-correo"
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="del-area">Área</Label>
              <Input id="del-area" value={area} onChange={(e) => setArea(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="del-fecha">Fecha esperada</Label>
              <Input
                id="del-fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="del-tarea">Qué necesitas de esta persona</Label>
            <Textarea
              id="del-tarea"
              rows={3}
              value={tarea}
              onChange={(e) => setTarea(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={!completo}>
            Preparar solicitud
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
