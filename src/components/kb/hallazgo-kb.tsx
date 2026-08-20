import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { registrarEvento } from "@/lib/analytics";
import type { HallazgoDetectadoKB, IniciativaKB } from "@/lib/kb/tipos";
import { ArrowRight, CheckCircle2, Info } from "lucide-react";

interface HallazgoKbProps {
  detectado: HallazgoDetectadoKB;
  iniciativa: IniciativaKB | null;
  onConvertir: (detectado: HallazgoDetectadoKB) => void;
}

const etiquetaEvidencia: Record<HallazgoDetectadoKB["evidencia"], string> = {
  declarada: "Evidencia declarada",
  parcial: "Evidencia parcial",
  insuficiente: "Evidencia insuficiente",
};

/**
 * Hallazgo explicable: muestra recomendación estructurada y permite abrir la
 * trazabilidad completa ("Ver por qué") hasta las preguntas que lo originaron.
 */
export function HallazgoKb({ detectado, iniciativa, onConvertir }: HallazgoKbProps) {
  const [abierto, setAbierto] = useState(false);
  const { hallazgo, recomendacion, regla, trazas, evidencia } = detectado;

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{hallazgo.id}</Badge>
          <Badge variant="secondary">{recomendacion.dimension}</Badge>
          <Badge variant={evidencia === "declarada" ? "outline" : "secondary"}>
            {etiquetaEvidencia[evidencia]}
          </Badge>
        </div>
        <CardTitle className="text-base">{hallazgo.titulo}</CardTitle>
        <CardDescription>{hallazgo.interpretacion}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <p className="text-sm font-semibold text-foreground">Recomendación</p>
          <p className="mt-1 text-sm text-muted-foreground">{recomendacion.texto}</p>
          <dl className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
            <div>
              <dt className="font-semibold text-foreground">Impacto</dt>
              <dd>{recomendacion.impacto}</dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">Esfuerzo</dt>
              <dd>{recomendacion.esfuerzo}</dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">Urgencia</dt>
              <dd>{recomendacion.urgencia}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            Valores experimentales de esta versión del conocimiento: pueden revisarse al planificar.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Dialog
            open={abierto}
            onOpenChange={(estado) => {
              setAbierto(estado);
              if (estado) {
                registrarEvento("kb_finding_traced", { hallazgoId: hallazgo.id, reglaId: regla.id });
              }
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Info className="mr-2 h-4 w-4" aria-hidden="true" />
                Ver por qué
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Por qué apareció este hallazgo</DialogTitle>
                <DialogDescription>
                  Trazabilidad completa: pregunta → respuesta → variable → evaluación → hallazgo →
                  recomendación.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <section className="space-y-2">
                  <h3 className="font-semibold text-foreground">Respuestas que lo originaron</h3>
                  <ul className="space-y-2">
                    {trazas.map((traza) => (
                      <li key={traza.preguntaId} className="rounded-lg border border-border p-3">
                        <p className="text-xs font-semibold text-muted-foreground">
                          {traza.preguntaId} · {traza.variableId}
                        </p>
                        <p className="mt-1 text-foreground">{traza.pregunta}</p>
                        <p className="mt-1 text-muted-foreground">
                          Respuesta declarada: {traza.respuesta}
                        </p>
                        <p className="text-xs text-muted-foreground">Variable: {traza.variable}</p>
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="space-y-1">
                  <h3 className="font-semibold text-foreground">Evaluación aplicada</h3>
                  <p className="text-muted-foreground">
                    {regla.id}: si {regla.condicionTexto}
                  </p>
                  <p className="text-muted-foreground">{regla.evaluacion}</p>
                  <p className="text-xs text-muted-foreground">Fuente metodológica: {regla.fuente}</p>
                </section>
                <section className="space-y-1">
                  <h3 className="font-semibold text-foreground">Evidencia observada</h3>
                  <p className="text-muted-foreground">{hallazgo.evidencia}</p>
                </section>
                <section className="space-y-1">
                  <h3 className="font-semibold text-foreground">Resultado esperado</h3>
                  <p className="text-muted-foreground">{recomendacion.resultadoEsperado}</p>
                </section>
              </div>
            </DialogContent>
          </Dialog>

          {iniciativa ? (
            <Button variant="secondary" size="sm" disabled>
              <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
              Iniciativa creada
            </Button>
          ) : (
            <Button size="sm" onClick={() => onConvertir(detectado)}>
              Convertir en iniciativa
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
