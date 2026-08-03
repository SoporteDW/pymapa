import { Link } from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Miga {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  titulo: string;
  subtitulo?: string;
  migas?: Miga[];
  acciones?: ReactNode;
  className?: string;
}

/**
 * Encabezado de página con breadcrumbs y foco automático en el título
 * (POC-02, regla de navegación 7: los cambios de vista llevan el foco al título).
 */
export function PageHeader({ titulo, subtitulo, migas, acciones, className }: PageHeaderProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, [titulo]);

  return (
    <div className={cn("space-y-3", className)}>
      {migas && migas.length > 0 && (
        <nav aria-label="Ruta de navegación">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            {migas.map((miga, index) => (
              <li key={`${miga.label}-${index}`} className="flex items-center gap-1">
                {index > 0 && <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
                {miga.to ? (
                  <Link to={miga.to} className="hover:text-foreground hover:underline">
                    {miga.label}
                  </Link>
                ) : (
                  <span className="text-foreground">{miga.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1
            ref={titleRef}
            tabIndex={-1}
            className="text-2xl font-bold tracking-tight text-foreground outline-none sm:text-3xl"
          >
            {titulo}
          </h1>
          {subtitulo && <p className="mt-1 text-sm text-muted-foreground">{subtitulo}</p>}
        </div>
        {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
      </div>
    </div>
  );
}
