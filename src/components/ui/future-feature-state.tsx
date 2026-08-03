import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Construction } from "lucide-react";

interface FutureFeatureStateProps {
  title?: string;
  description?: string;
  className?: string;
}

export function FutureFeatureState({
  title = "Función en desarrollo",
  description = "Esta función se habilitará en una siguiente etapa del MVP.",
  className,
}: FutureFeatureStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-border bg-card p-8 text-center",
        className
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-info/10">
        <Construction className="h-6 w-6 text-info" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      <Button variant="outline" className="mt-4" asChild>
        <a href="/inicio">Volver al inicio</a>
      </Button>
    </div>
  );
}
