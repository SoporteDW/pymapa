import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface DemoNoteProps {
  children: React.ReactNode;
  className?: string;
  variant?: "info" | "aviso";
}

/** Aviso de datos ilustrativos: diferencia lo simulado de lo real (POC-02, principio de confianza). */
export function DemoNote({ children, className, variant = "info" }: DemoNoteProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border p-4 text-sm",
        variant === "info"
          ? "border-info/20 bg-info/5 text-info-foreground"
          : "border-warning/20 bg-warning/5 text-warning-foreground",
        className
      )}
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

/** Etiqueta compacta para señalar contenido demostrativo. */
export function DemoTag({ children = "Dato ilustrativo" }: { children?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  );
}
