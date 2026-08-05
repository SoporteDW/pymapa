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
  { label: "Política de Cookies", to: "/ayuda" },
  { label: "Contacto", to: "/ayuda" },
];

export function AppFooter({ className }: AppFooterProps) {
  return (
    <footer
      className={cn("border-t border-border bg-card px-4 py-8 sm:px-6", className)}
      aria-label="Pie de página"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-2">
          <img
            src={digiwayLogo.url}
            alt="Digiway"
            width={760}
            height={150}
            className="h-7 w-auto object-contain object-left"
          />
          <span className="text-xs text-muted-foreground">
            pymapa es una plataforma de Digiway ·{" "}
            <Link to="/ayuda" className="hover:text-primary">
              Centro de ayuda
            </Link>
          </span>
        </div>

        <div className="flex flex-col gap-3 md:items-center">
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
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

        <div className="text-xs leading-relaxed text-muted-foreground md:text-right">
          <p>© Digiway. Todos los derechos reservados.</p>
          <p>Marca registrada.</p>
          <p className="mt-1">MVP Alfa · datos ilustrativos</p>
        </div>
      </div>
    </footer>
  );
}
