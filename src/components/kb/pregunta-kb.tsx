import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import type { PreguntaKB, ValorVariable } from "@/lib/kb/tipos";

interface PreguntaKbProps {
  pregunta: PreguntaKB;
  valor: ValorVariable | undefined;
  onChange: (valor: ValorVariable) => void;
}

/**
 * Campo genérico del formulario dinámico de un Knowledge Pack.
 * No conoce el pack de E-commerce: renderiza cualquier pregunta declarada.
 */
export function PreguntaKb({ pregunta, valor, onChange }: PreguntaKbProps) {
  const ayudaId = pregunta.ayuda ? `${pregunta.id}-ayuda` : undefined;

  if (pregunta.tipo === "multiple") {
    const seleccion = Array.isArray(valor) ? valor : [];
    const alternar = (opcion: string, activo: boolean) => {
      const siguiente = activo
        ? [...seleccion.filter((v) => v !== opcion), opcion]
        : seleccion.filter((v) => v !== opcion);
      onChange(siguiente);
    };

    return (
      <fieldset aria-describedby={ayudaId} className="space-y-2">
        <legend className="sr-only">{pregunta.texto}</legend>
        {pregunta.opciones.map((opcion) => {
          const id = `${pregunta.id}-${opcion.valor}`;
          const activo = seleccion.includes(opcion.valor);
          return (
            <div
              key={opcion.valor}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-3 transition-colors",
                activo ? "border-primary bg-primary/5" : "border-border bg-card"
              )}
            >
              <Checkbox
                id={id}
                checked={activo}
                onCheckedChange={(estado) => alternar(opcion.valor, estado === true)}
              />
              <Label htmlFor={id} className="cursor-pointer text-sm font-normal leading-snug">
                {opcion.etiqueta}
              </Label>
            </div>
          );
        })}
        {pregunta.ayuda && (
          <p id={ayudaId} className="text-xs text-muted-foreground">
            {pregunta.ayuda}
          </p>
        )}
      </fieldset>
    );
  }

  const seleccionado = typeof valor === "string" ? valor : "";

  return (
    <fieldset aria-describedby={ayudaId} className="space-y-2">
      <legend className="sr-only">{pregunta.texto}</legend>
      <RadioGroup value={seleccionado} onValueChange={onChange} className="space-y-2">
        {pregunta.opciones.map((opcion) => {
          const id = `${pregunta.id}-${opcion.valor}`;
          const activo = seleccionado === opcion.valor;
          return (
            <div
              key={opcion.valor}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-3 transition-colors",
                activo ? "border-primary bg-primary/5" : "border-border bg-card"
              )}
            >
              <RadioGroupItem id={id} value={opcion.valor} />
              <Label htmlFor={id} className="cursor-pointer text-sm font-normal leading-snug">
                {opcion.etiqueta}
              </Label>
            </div>
          );
        })}
      </RadioGroup>
      {pregunta.ayuda && (
        <p id={ayudaId} className="text-xs text-muted-foreground">
          {pregunta.ayuda}
        </p>
      )}
    </fieldset>
  );
}
