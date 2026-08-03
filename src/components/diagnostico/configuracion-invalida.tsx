import { AlertTriangle } from "lucide-react";
import type { ProblemaConfiguracion } from "@/lib/diagnostico/validacion";

interface ConfiguracionInvalidaProps {
  problemas: ProblemaConfiguracion[];
}

/**
 * Bloqueo del instrumento ante una configuración inválida (POC-03, 9.1 y 13),
 * con código técnico recuperable para diagnóstico interno.
 */
export function ConfiguracionInvalida({ problemas }: ConfiguracionInvalidaProps) {
  return (
    <div
      role="alert"
      className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-6"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
        <h2 className="text-base font-semibold text-foreground">
          El diagnóstico no está disponible en este momento
        </h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Detectamos un problema en la configuración del instrumento. Tus datos no se han modificado.
        Comparte estos códigos con el equipo técnico para resolverlo.
      </p>
      <ul className="space-y-1 text-sm text-foreground">
        {problemas.map((problema) => (
          <li key={`${problema.codigo}-${problema.detalle}`}>
            <span className="font-mono text-xs font-semibold">{problema.codigo}</span>{" "}
            {problema.detalle}
          </li>
        ))}
      </ul>
    </div>
  );
}
