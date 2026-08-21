import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ComoFuncionaDialog } from "@/components/recorrido/como-funciona-dialog";
import { etapas } from "@/lib/recorrido";
import type { PasoSugerido } from "@/lib/siguiente-paso/orquestador";
import { ArrowRight } from "lucide-react";

interface TarjetaSiguientePasoProps {
  paso: PasoSugerido;
  otrosPendientes: PasoSugerido[];
}

function nombreEtapa(etapaId: PasoSugerido["etapa"]): string {
  const etapa = etapas.find((e) => e.id === etapaId);
  return etapa ? `Etapa ${etapa.numero} · ${etapa.titulo}` : "Tu recorrido";
}

/** Home como orquestador: un único siguiente paso, con su explicación. */
export function TarjetaSiguientePaso({ paso, otrosPendientes }: TarjetaSiguientePasoProps) {
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-0 bg-brand-gradient text-primary-foreground shadow-suave">
        <div className="bg-patron-marca">
          <CardHeader className="gap-2 p-8">
            <CardDescription className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground/80">
              Tu siguiente paso · {nombreEtapa(paso.etapa)}
            </CardDescription>
            <CardTitle className="text-2xl font-semibold sm:text-3xl">{paso.titulo}</CardTitle>
            <CardDescription className="max-w-xl text-primary-foreground/85">
              {paso.descripcion}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-8 pt-0">
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link to={paso.ruta}>
                  {paso.label}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <ComoFuncionaDialog />
            </div>
            <p className="max-w-2xl text-xs text-primary-foreground/80">
              Por qué te lo proponemos: {paso.porQue}
            </p>
          </CardContent>
        </div>
      </Card>

      {otrosPendientes.length > 0 && (
        <Card>
          <CardHeader className="space-y-1.5">
            <CardTitle className="text-base">Qué más tienes abierto</CardTitle>
            <CardDescription>
              pymapa mantiene la lista de todo lo que quedó pendiente en tu recorrido.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {otrosPendientes.map((pendiente) => (
                <li
                  key={`${pendiente.tipo}-${pendiente.ruta}`}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-[11px]">
                        {nombreEtapa(pendiente.etapa)}
                      </Badge>
                      <span className="text-sm font-medium text-foreground">
                        {pendiente.titulo}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{pendiente.descripcion}</p>
                  </div>
                  <Button variant="link" className="shrink-0 px-0" asChild>
                    <Link to={pendiente.ruta}>{pendiente.label}</Link>
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
