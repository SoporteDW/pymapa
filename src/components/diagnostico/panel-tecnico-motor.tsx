import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SalidaMotor } from "@/lib/motor/tipos";

/**
 * Vista técnica de validación del motor (POC-04, 15).
 * Solo presenta la salida del motor: no contiene reglas ni cálculos.
 */
export function PanelTecnicoMotor({ salida }: { salida: SalidaMotor }) {
  const [hallazgoAbierto, setHallazgoAbierto] = useState<string | null>(null);

  const explicacionPorHallazgo = useMemo(
    () => new Map(salida.explanations.map((e) => [e.hallazgoId, e])),
    [salida.explanations]
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Metadatos de la ejecución</CardTitle>
          <CardDescription>
            Identificadores y versiones aplicadas. Permiten reproducir y auditar el resultado.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <Dato etiqueta="Ejecución" valor={salida.metadata.executionId} />
          <Dato etiqueta="Diagnóstico" valor={salida.metadata.diagnosisId} />
          <Dato etiqueta="Catálogo" valor={salida.metadata.catalogVersion} />
          <Dato etiqueta="Reglas" valor={salida.metadata.ruleSetVersion} />
          <Dato etiqueta="Motor" valor={salida.metadata.engineVersion} />
          <Dato etiqueta="Instrumento" valor={salida.metadata.definitionVersion} />
          <Dato etiqueta="Huella de entrada" valor={salida.metadata.inputHash} />
          <Dato etiqueta="Estado" valor={salida.metadata.status} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Calidad de la evidencia</CardTitle>
          <CardDescription>
            Cobertura, consistencia y confianza declaradas de forma explícita.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid gap-3 sm:grid-cols-3">
            <Dato etiqueta="Cobertura" valor={`${salida.quality.coverage}%`} />
            <Dato etiqueta="Consistencia" valor={salida.quality.consistencyScore.toFixed(2)} />
            <Dato etiqueta="Confianza media" valor={salida.quality.confidence.toFixed(2)} />
            <Dato
              etiqueta="Respondidas aplicables"
              valor={`${salida.quality.respondidas} de ${salida.quality.aplicables}`}
            />
            <Dato etiqueta="Excluidas (no aplica)" valor={String(salida.quality.excluidasNoAplica)} />
            <Dato etiqueta="Inconsistencias" valor={String(salida.quality.inconsistencias)} />
          </div>
          {salida.quality.warnings.length > 0 && (
            <ul className="space-y-1 text-muted-foreground">
              {salida.quality.warnings.map((advertencia) => (
                <li key={`${advertencia.codigo}-${advertencia.mensaje}`}>
                  <span className="font-mono text-xs">{advertencia.codigo}</span> ·{" "}
                  {advertencia.mensaje}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Madurez por dimensión</CardTitle>
          <CardDescription>
            Los niveles con cobertura insuficiente se marcan como provisionales.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {salida.dimensionResults.map((dimension) => (
            <div key={dimension.dimensionId} className="rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">{dimension.nombre}</span>
                <Badge variant="secondary">{dimension.madurezNombre}</Badge>
                <span className="text-muted-foreground tabular-nums">
                  {dimension.puntaje.toFixed(1)} / 100 · cobertura {dimension.cobertura}%
                </span>
                {dimension.alertasCriticas > 0 && (
                  <Badge variant="destructive">
                    {dimension.alertasCriticas} alerta(s) crítica(s)
                  </Badge>
                )}
              </div>
              {dimension.notas.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {dimension.notas.map((nota) => (
                    <li key={nota}>{nota}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hallazgos y trazabilidad</CardTitle>
          <CardDescription>
            Cada hallazgo conserva su evidencia, las reglas que lo activaron y su nivel de confianza.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {salida.findings.length === 0 && (
            <p className="text-muted-foreground">
              No se generaron hallazgos con la evidencia disponible.
            </p>
          )}
          {salida.findings.map((hallazgo) => {
            const explicacion = explicacionPorHallazgo.get(hallazgo.id);
            const abierto = hallazgoAbierto === hallazgo.id;
            return (
              <div key={hallazgo.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{hallazgo.tipo}</Badge>
                  <span className="font-medium text-foreground">{hallazgo.titulo}</span>
                  <span className="text-xs text-muted-foreground">
                    severidad {hallazgo.severidad} · confianza {hallazgo.confianza.toFixed(2)}
                  </span>
                  {hallazgo.esHipotesis && <Badge variant="secondary">Hipótesis a validar</Badge>}
                </div>
                <p className="mt-1 text-muted-foreground">{hallazgo.estadoActual}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 px-0"
                  aria-expanded={abierto}
                  onClick={() => setHallazgoAbierto(abierto ? null : hallazgo.id)}
                >
                  {abierto ? "Ocultar traza" : "Ver traza completa"}
                </Button>
                {abierto && explicacion && (
                  <div className="mt-2 space-y-2 border-t border-border pt-2 text-xs">
                    <p className="text-foreground">{explicacion.usuario}</p>
                    <div>
                      <p className="font-medium text-foreground">Evidencia</p>
                      <ul className="mt-1 space-y-1 text-muted-foreground">
                        {explicacion.prueba.evidencia.map((item) => (
                          <li key={item.questionId}>
                            <span className="font-mono">{item.questionId}</span>: {item.texto} →{" "}
                            {item.respuesta}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Reglas activadas</p>
                      <ul className="mt-1 space-y-1 text-muted-foreground">
                        {explicacion.prueba.reglas.map((regla) => (
                          <li key={regla.ruleId} className="font-mono">
                            {regla.ruleId}@{regla.version} · {regla.severidad}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Condiciones evaluadas</p>
                      <ul className="mt-1 space-y-1 text-muted-foreground">
                        {explicacion.desarrollo.condiciones.map((condicion) => (
                          <li key={condicion.descripcion}>
                            {condicion.resultado ? "✓" : "✗"} {condicion.descripcion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prioridades calculadas</CardTitle>
          <CardDescription>
            Orden preliminar de necesidades con sus factores y pesos. No son recomendaciones finales.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {salida.priorities.map((prioridad) => (
            <div key={prioridad.id} className="rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">#{prioridad.orden}</span>
                <span className="font-medium text-foreground">{prioridad.titulo}</span>
                <Badge variant={prioridad.banda === "critica" ? "destructive" : "secondary"}>
                  {prioridad.bandaEtiqueta}
                </Badge>
                <span className="text-muted-foreground tabular-nums">
                  score {prioridad.score.toFixed(1)}
                </span>
                {prioridad.ajustadaPorDependencia && (
                  <Badge variant="outline">Ajustada por dependencia</Badge>
                )}
              </div>
              <p className="mt-1 text-muted-foreground">{prioridad.justificacion}</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {Object.entries(prioridad.factores)
                  .map(([clave, valor]) => `${clave}=${valor}`)
                  .join(" · ")}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {salida.dependencies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dependencias entre necesidades</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            {salida.dependencies.map((dependencia) => (
              <p key={`${dependencia.origen}-${dependencia.destino}`}>{dependencia.descripcion}</p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{etiqueta}</dt>
      <dd className="break-all font-mono text-xs text-foreground">{valor}</dd>
    </div>
  );
}
