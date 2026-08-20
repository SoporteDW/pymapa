import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";

/**
 * Botón discreto del recorrido demo paso a paso: diligencia la etapa actual con
 * el dataset de la empresa simulada para que la persona revise la información
 * antes de continuar. No genera respuestas dinámicas.
 */
export function AutocompletarEtapa({
  onAutocompletar,
  empresaDemo,
  descripcion,
}: {
  onAutocompletar: () => void;
  empresaDemo: string;
  descripcion?: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-primary/30 bg-primary/[0.04] p-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>
        {descripcion ??
          `Puedes diligenciar esta etapa con los datos simulados de ${empresaDemo} y revisarlos antes de continuar.`}
      </span>
      <Button variant="outline" size="sm" onClick={onAutocompletar}>
        <Wand2 className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
        Autocompletar esta etapa con datos demo
      </Button>
    </div>
  );
}
