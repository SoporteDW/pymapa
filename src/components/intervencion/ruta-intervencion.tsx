import { Link } from "@tanstack/react-router";
import { ArrowRight, Route as RouteIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  clasificarIntervencion,
  entradaDeActividad,
  etiquetaInversion,
  etiquetaRecursos,
  etiquetaTipoIntervencion,
} from "@/lib/intervencion/clasificacion";
import type { ActividadWorkspace } from "@/lib/workspace/tipos";

/**
 * Lectura derivada (no estado): cómo debería intervenirse la brecha de esta
 * Actividad. Es consulta, nunca un CTA de avance del Journey.
 */
export function RutaIntervencionPanel({ actividad }: { actividad: ActividadWorkspace }) {
  const entrada = entradaDeActividad(actividad);
  const ruta = clasificarIntervencion(entrada);

  return (
    <section className="rounded-[16px] border border-border bg-card p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <RouteIcon className="size-4 text-primary" aria-hidden="true" />
        Ruta de intervención
      </h3>
      <dl className="mt-3 space-y-3 text-sm">
        <Fila termino="Brecha" valor={ruta.brecha} />
        <Fila termino="Resultado esperado" valor={ruta.resultadoEsperado} />
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Intervención
          </dt>
          <dd className="mt-1 flex flex-wrap gap-2">
            {ruta.tipos.map((tipo) => (
              <Badge key={tipo} variant="secondary" className="rounded-full">
                {etiquetaTipoIntervencion[tipo]}
              </Badge>
            ))}
          </dd>
        </div>
        <Fila termino="Recursos" valor={etiquetaRecursos[ruta.recursos]} />
        <Fila termino="Requiere inversión" valor={etiquetaInversion[ruta.requiereInversion]} />
        <Fila
          termino="Indicador de verificación"
          valor={`${ruta.indicador.nombre} (${ruta.indicador.unidad}) · ${ruta.indicador.descripcion}`}
        />
      </dl>

      <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
        {ruta.porQue.map((razon) => (
          <li key={razon}>· {razon}</li>
        ))}
      </ul>

      {ruta.requiereInversion !== "no" && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-sm text-muted-foreground">
            Esta intervención podría requerir financiación externa y puede ser candidata para
            explorar instrumentos disponibles.
          </p>
          <Button variant="link" className="h-auto p-0" asChild>
            <Link to="/proyecto/$actividad" params={{ actividad: actividad.id }}>
              Ver como proyecto potencialmente financiable (consulta)
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      )}
    </section>
  );
}

function Fila({ termino, valor }: { termino: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {termino}
      </dt>
      <dd className="mt-0.5 text-sm text-foreground">{valor}</dd>
    </div>
  );
}
