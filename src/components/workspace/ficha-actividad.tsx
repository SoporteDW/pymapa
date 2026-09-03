import { ArrowRight, ClipboardCheck, Compass, Lightbulb, ListChecks, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PedirAMiEmpresa } from "@/components/colaboracion/pedir-a-mi-empresa";
import { PedirApoyoExperto } from "@/components/apoyo-humano/pedir-apoyo-experto";
import { RutaIntervencionPanel } from "@/components/intervencion/ruta-intervencion";
import { obtenerInstrumento } from "@/lib/instrumentos/catalogo";
import type { MetadatosActividad } from "@/lib/intervencion/clasificacion";
import type { ActividadWorkspace } from "@/lib/workspace/tipos";

/**
 * Macroentrega 5 · Ficha de Actividad.
 *
 * Antes de ejecutar, el usuario entiende: qué encontramos, qué queremos lograr,
 * cómo lo trabajaremos, qué debe entregar y cómo se valida. Colaboración y
 * apoyo experto están disponibles aquí mismo, en el contexto de la Actividad.
 */
export function FichaActividad({
  actividad,
  onEmpezar,
  metadatos,
}: {
  actividad: ActividadWorkspace;
  onEmpezar: () => void;
  metadatos?: MetadatosActividad | undefined;
}) {
  const instrumento = obtenerInstrumento(actividad.instrumentoId);
  const pasos = actividad.pasos;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="space-y-2">
          <Badge variant="secondary" className="w-fit rounded-full">
            Ficha de Actividad
          </Badge>
          <CardTitle className="text-xl leading-snug">{actividad.titulo}</CardTitle>
          <CardDescription>
            Antes de ejecutar, lee esta ficha: te explica de dónde viene la actividad, qué debes
            producir y cómo sabremos que quedó bien hecha.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Seccion icono={Lightbulb} titulo="Qué encontramos">
            <p className="text-sm text-muted-foreground">{actividad.porQue}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Dominio: {actividad.origen.dominioNombre}
            </p>
          </Seccion>

          <Seccion icono={Target} titulo="Qué queremos lograr">
            <p className="text-sm text-muted-foreground">{actividad.objetivo}</p>
          </Seccion>

          <Seccion icono={Compass} titulo="Cómo lo trabajaremos">
            <p className="text-sm text-muted-foreground">
              {instrumento?.metodologia ??
                "Trabajaremos la actividad paso a paso con un instrumento guiado."}
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              Instrumento: {instrumento?.nombre ?? actividad.instrumentoId}
            </p>
            <ol className="mt-2 space-y-1 text-sm text-muted-foreground">
              {pasos.map((paso) => (
                <li key={paso.orden}>
                  {paso.orden}. {paso.titulo}
                </li>
              ))}
            </ol>
          </Seccion>

          <Seccion icono={ClipboardCheck} titulo="Qué debes entregar">
            <p className="text-sm font-medium text-foreground">{actividad.entregable.titulo}</p>
            <p className="text-sm text-muted-foreground">{actividad.entregable.descripcion}</p>
          </Seccion>

          <Seccion icono={ListChecks} titulo="Cómo se valida">
            <ul className="space-y-2 text-sm text-muted-foreground">
              {actividad.entregable.criteriosValidacion.map((criterio) => (
                <li key={criterio} className="flex gap-2">
                  <span
                    className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                  {criterio}
                </li>
              ))}
            </ul>
          </Seccion>

          <RutaIntervencionPanel actividad={actividad} metadatos={metadatos} />



          <div className="flex flex-col gap-3 border-t border-border pt-4">
            <Button size="lg" onClick={onEmpezar} className="w-full sm:w-auto">
              Empezar actividad
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
            <div className="flex flex-wrap gap-2">
              <PedirAMiEmpresa
                origen={{
                  tipo: "actividad",
                  referenciaId: actividad.id,
                  referenciaTitulo: actividad.titulo,
                  dominioId: actividad.origen.dominioId,
                  dominioNombre: actividad.origen.dominioNombre,
                  rutaRetorno: `/plan-de-accion/workspace/${actividad.id}`,
                }}
                tareaSugerida={`Apoyarme en: ${actividad.objetivo}`}
              />
              <PedirApoyoExperto
                origen={{
                  tipo: "actividad",
                  referenciaId: actividad.id,
                  referenciaTitulo: actividad.titulo,
                  dominioId: actividad.origen.dominioId,
                  dominioNombre: actividad.origen.dominioNombre,
                  rutaRetorno: `/plan-de-accion/workspace/${actividad.id}`,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Puedes pedir apoyo interno o experto en cualquier momento; no interrumpe la actividad.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Seccion({
  icono: Icono,
  titulo,
  children,
}: {
  icono: typeof Target;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[16px] border border-border bg-card p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icono className="size-4 text-primary" aria-hidden="true" />
        {titulo}
      </h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}
