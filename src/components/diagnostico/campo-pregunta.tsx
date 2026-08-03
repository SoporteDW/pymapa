import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { escala } from "@/lib/diagnostico/definicion";
import type { PreguntaDiagnostico, ValorRespuesta } from "@/lib/diagnostico/tipos";

interface CampoPreguntaProps {
  pregunta: PreguntaDiagnostico;
  valor: ValorRespuesta | undefined;
  onChange: (valor: ValorRespuesta) => void;
  error?: string | undefined;
}

/**
 * Biblioteca de campos del instrumento (POC-03, sección 7).
 * Cubre single_select, multi_select, scale_1_5, number y short_text.
 */
export function CampoPregunta({ pregunta, valor, onChange, error }: CampoPreguntaProps) {
  const errorId = error ? `${pregunta.id}-error` : undefined;
  const ayudaId = pregunta.ayuda ? `${pregunta.id}-ayuda` : undefined;
  const describedBy = [ayudaId, errorId].filter(Boolean).join(" ") || undefined;

  if (pregunta.tipo === "scale_1_5") {
    const seleccionado = valor === undefined ? "" : String(valor);
    return (
      <fieldset aria-describedby={describedBy}>
        <legend className="sr-only">{pregunta.texto}</legend>
        <RadioGroup
          value={seleccionado}
          onValueChange={(v) => onChange(Number(v))}
          className="space-y-2"
        >
          {escala.map((item) => {
            const id = `${pregunta.id}-e${item.valor}`;
            const activo = seleccionado === String(item.valor);
            return (
              <div
                key={item.valor}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 transition-colors",
                  activo ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
                )}
              >
                <RadioGroupItem
                  value={String(item.valor)}
                  id={id}
                  aria-label={`${pregunta.texto} — ${item.valor} de 5: ${item.etiqueta}`}
                  className="mt-0.5"
                />
                <Label htmlFor={id} className="flex-1 cursor-pointer text-sm font-normal">
                  <span className="mr-2 font-semibold text-foreground">{item.valor}</span>
                  <span>{item.etiqueta}</span>
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      </fieldset>
    );
  }

  if (pregunta.tipo === "single_select") {
    return (
      <fieldset aria-describedby={describedBy}>
        <legend className="sr-only">{pregunta.texto}</legend>
        <RadioGroup
          value={valor === undefined ? "" : String(valor)}
          onValueChange={(v) => onChange(v)}
          className="space-y-2"
        >
          {(pregunta.opciones ?? []).map((opcion) => (
            <div
              key={opcion.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 transition-colors",
                String(valor) === String(opcion.valor)
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-accent"
              )}
            >
              <RadioGroupItem
                value={String(opcion.valor)}
                id={opcion.id}
                aria-label={`${pregunta.texto} — ${opcion.etiqueta}`}
                className="mt-0.5"
              />
              <Label htmlFor={opcion.id} className="flex-1 cursor-pointer text-sm font-normal">
                {opcion.etiqueta}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </fieldset>
    );
  }

  if (pregunta.tipo === "multi_select") {
    const seleccion = Array.isArray(valor) ? valor.map(String) : [];
    const alternar = (opcionValor: string, marcado: boolean) => {
      const siguiente = marcado
        ? [...seleccion, opcionValor]
        : seleccion.filter((v) => v !== opcionValor);
      onChange(siguiente);
    };
    return (
      <fieldset aria-describedby={describedBy} className="space-y-2">
        <legend className="sr-only">{pregunta.texto}</legend>
        {(pregunta.opciones ?? []).map((opcion) => {
          const marcado = seleccion.includes(String(opcion.valor));
          return (
            <div
              key={opcion.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 transition-colors",
                marcado ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
              )}
            >
              <Checkbox
                id={opcion.id}
                checked={marcado}
                onCheckedChange={(estado) => alternar(String(opcion.valor), estado === true)}
                aria-label={`${pregunta.texto} — ${opcion.etiqueta}`}
                className="mt-0.5"
              />
              <Label htmlFor={opcion.id} className="flex-1 cursor-pointer text-sm font-normal">
                {opcion.etiqueta}
              </Label>
            </div>
          );
        })}
      </fieldset>
    );
  }

  if (pregunta.tipo === "number") {
    return (
      <div className="space-y-2">
        <Label htmlFor={pregunta.id}>{pregunta.texto}</Label>
        <Input
          id={pregunta.id}
          type="number"
          inputMode="numeric"
          min={pregunta.min}
          max={pregunta.max}
          value={valor === undefined ? "" : String(valor)}
          onChange={(event) => {
            const limpio = event.target.value.replace(/[^\d.-]/g, "");
            if (limpio === "") return;
            onChange(Number(limpio));
          }}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={pregunta.id}>{pregunta.texto}</Label>
      <Textarea
        id={pregunta.id}
        maxLength={pregunta.maxLength ?? 300}
        value={valor === undefined ? "" : String(valor)}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
        rows={4}
      />
      <p className="text-xs text-muted-foreground">
        Máximo {pregunta.maxLength ?? 300} caracteres. Esta respuesta no se puntúa.
      </p>
    </div>
  );
}
