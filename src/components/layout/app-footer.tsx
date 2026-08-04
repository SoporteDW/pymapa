import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface AppFooterProps {
  className?: string;
}

const paises = ["Colombia", "Ecuador", "Perú", "Puerto Rico", "Costa Rica", "USA"];

const enlaces = [
  { label: "Nosotros", to: "/ayuda" },
  { label: "Privacidad", to: "/ayuda" },
  { label: "Términos", to: "/ayuda" },
];

export function AppFooter({ className }: AppFooterProps) {
  return (
    <footer
      className={cn("border-t border-border bg-card px-4 py-5 sm:px-6", className)}
      aria-label="Pie de página"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xl font-extrabold italic tracking-tight text-destructive">
            digiway
          </span>
          <span className="text-xs text-muted-foreground">
            MVP Alfa · Datos ilustrativos ·{" "}
            <Link to="/ayuda" className="hover:text-primary">
              Ayuda
            </Link>
          </span>
        </div>

        <div className="flex flex-col gap-2 md:items-center">
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
            {enlaces.map((enlace) => (
              <li key={enlace.label}>
                <Link to={enlace.to} className="hover:text-primary">
                  {enlace.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            {paises.map((pais, index) => (
              <span key={pais}>
                {index > 0 && <span aria-hidden="true"> · </span>}
                {pais}
              </span>
            ))}
          </p>
        </div>

        <p className="text-xs leading-tight text-muted-foreground md:text-right">
          Marca
          <br className="hidden md:block" /> registrada
        </p>
      </div>
    </footer>
  );
}
