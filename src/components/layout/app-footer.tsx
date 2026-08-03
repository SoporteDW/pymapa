import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { HelpCircle } from "lucide-react";

interface AppFooterProps {
  className?: string;
}

export function AppFooter({ className }: AppFooterProps) {
  return (
    <footer
      className={cn(
        "border-t border-border bg-card py-4 px-4 text-sm text-muted-foreground",
        className
      )}
    >
      <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
        <p>
          MVP Alfa · Datos ilustrativos ·{" "}
          <Link to="/ayuda" className="hover:text-primary">
            Ayuda
          </Link>
        </p>
        <Link
          to="/ayuda"
          className="flex items-center gap-1 hover:text-primary"
          aria-label="Ir a ayuda"
        >
          <HelpCircle className="h-4 w-4" aria-hidden="true" />
          <span>¿Necesitas orientación?</span>
        </Link>
      </div>
    </footer>
  );
}
