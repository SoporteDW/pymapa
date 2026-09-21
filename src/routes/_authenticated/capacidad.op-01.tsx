/**
 * M1-D2 · Recorrido productivo de OP-01 dentro de la experiencia existente.
 *
 * Reutiliza los componentes de la app (PageHeader, Card, RadioGroup, Button).
 * Todo el contenido de la pregunta llega del Knowledge Pack a través de
 * AssessmentClient (PRODUCTION_ENGINE): aquí NO hay conocimiento diagnóstico.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/loading-state";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout/page-header";
import { getOp01Context } from "@/lib/production/op01.functions";
import { createProductionAssessmentClient, resolveExecutionSource } from "@/services/production";
import type { KnowledgeState } from "@pymapa/contracts";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/capacidad/op-01")({
  head: () => ({
    meta: [
      { title: "Capacidad OP-01 — pymapa" },
      {
        name: "description",
        content:
          "Recorrido de la capacidad OP-01 sobre el núcleo productivo de pymapa, con conocimiento gobernado y trazabilidad completa.",
      },
      { property: "og:title", content: "Capacidad OP-01 — pymapa" },
      {
        property: "og:description",
        content: "Recorrido de la capacidad OP-01 sobre el núcleo productivo de pymapa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CapacidadOp01,
});

const cliente = createProductionAssessmentClient();

const ETIQUETAS_ESTADO: Record<KnowledgeState, string> = {
  KNOWN: "Lo sé",
  UNKNOWN: "No lo sé todavía",
  NOT_APPLICABLE: "No aplica en mi empresa",
  CONTRADICTORY: "Tengo información contradictoria",
};

function CapacidadOp01() {
  const queryClient = useQueryClient();
  const [estado, setEstado] = useState<KnowledgeState>("KNOWN");
  const [valor, setValor] = useState<string>("");
  const [razon, setRazon] = useState<string>("");

  const contexto = useQuery({
    queryKey: ["op01", "contexto"],
    queryFn: () => getOp01Context(),
  });

  const pregunta = useQuery({
    queryKey: ["op01", "pregunta"],
    queryFn: () => cliente.getNextAcquisitionQuestion(contexto.data!.assessmentId),
    enabled: Boolean(contexto.data?.assessmentId),
  });

  const assessmentState = useQuery({
    queryKey: ["op01", "estado"],
    queryFn: () => cliente.getAssessmentState(contexto.data!.assessmentId),
    enabled: Boolean(contexto.data?.assessmentId),
  });

  const enviar = useMutation({
    mutationFn: async () => {
      const acquisition = pregunta.data;
      if (!acquisition || !contexto.data) throw new Error("Sin adquisición pendiente");
      return cliente.submitResponse({
        assessmentId: contexto.data.assessmentId,
        capabilityId: acquisition.capabilityId,
        itemId: acquisition.acquisitionId,
        value: estado === "KNOWN" ? valor : "",
        submittedAt: new Date().toISOString(),
        knowledgeState: estado,
        notApplicableReason: estado === "NOT_APPLICABLE" ? razon.trim() || null : null,
      });
    },
    onSuccess: async (resultado) => {
      if (!resultado.accepted) {
        toast.error("No pudimos registrar la respuesta", {
          description: resultado.rejectionReason ?? "Revisa la información e inténtalo de nuevo.",
        });
        return;
      }
      toast.success("Respuesta registrada");
      await queryClient.invalidateQueries({ queryKey: ["op01"] });
    },
    onError: (error: Error) => {
      toast.error("No pudimos registrar la respuesta", { description: error.message });
    },
  });

  if (contexto.isLoading) return <LoadingState fullPage />;

  if (contexto.isError) {
    return (
      <div className="space-y-4">
        <PageHeader titulo="Capacidad OP-01" subtitulo="No pudimos preparar tu espacio de trabajo." />
        <Card>
          <CardContent className="space-y-3 pt-6 text-sm text-muted-foreground">
            <p>{(contexto.error as Error).message}</p>
            <Button asChild variant="outline">
              <Link to="/acceso">Volver a acceso</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const acquisition = pregunta.data ?? null;
  const opciones = acquisition?.allowedSemanticValues ?? [];
  const estadosPermitidos = acquisition?.allowedKnowledgeStates ?? ["KNOWN"];
  const puedeEnviar =
    Boolean(acquisition) &&
    (estado !== "KNOWN" || valor.length > 0) &&
    (estado !== "NOT_APPLICABLE" || razon.trim().length > 0) &&
    estado !== "CONTRADICTORY";

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Capacidad OP-01"
        subtitulo="Este recorrido se ejecuta sobre el núcleo productivo con conocimiento gobernado."
        migas={[{ label: "Inicio", to: "/inicio" }, { label: "Capacidad OP-01" }]}
        acciones={<Badge variant="secondary">{resolveExecutionSource("OP-01")}</Badge>}
      />

      {acquisition ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">{acquisition.question}</CardTitle>
            {acquisition.purpose && <CardDescription>{acquisition.purpose}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-6">
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium text-foreground">
                ¿Cómo quieres responder?
              </legend>
              <RadioGroup
                value={estado}
                onValueChange={(v) => setEstado(v as KnowledgeState)}
                className="space-y-2"
              >
                {estadosPermitidos.map((posible) => (
                  <div
                    key={posible}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <RadioGroupItem value={posible} id={`estado-${posible}`} />
                    <Label htmlFor={`estado-${posible}`} className="cursor-pointer font-normal">
                      {ETIQUETAS_ESTADO[posible]}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </fieldset>

            {estado === "KNOWN" && opciones.length > 0 && (
              <fieldset className="space-y-2">
                <legend className="mb-2 text-sm font-medium text-foreground">
                  Selecciona la situación que reconoces hoy
                </legend>
                <RadioGroup value={valor} onValueChange={setValor} className="space-y-2">
                  {opciones.map((opcion) => (
                    <div
                      key={opcion}
                      className="flex items-center gap-3 rounded-lg border border-border p-3"
                    >
                      <RadioGroupItem value={opcion} id={`valor-${opcion}`} />
                      <Label htmlFor={`valor-${opcion}`} className="cursor-pointer font-normal">
                        {opcion}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </fieldset>
            )}

            {estado === "NOT_APPLICABLE" && (
              <div className="space-y-2">
                <Label htmlFor="razon">Cuéntanos por qué no aplica</Label>
                <Textarea id="razon" value={razon} onChange={(e) => setRazon(e.target.value)} />
              </div>
            )}

            {estado === "CONTRADICTORY" && (
              <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                Registrar información contradictoria requiere indicar las fuentes en conflicto; esa
                parte del recorrido todavía no está habilitada.
              </p>
            )}

            <Button
              onClick={() => enviar.mutate()}
              disabled={!puedeEnviar || enviar.isPending}
            >
              Registrar respuesta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">No hay preguntas pendientes</CardTitle>
            <CardDescription>
              Ya registramos la información disponible para esta capacidad en esta versión.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {assessmentState.data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Estado de la evaluación</CardTitle>
            <CardDescription>
              Registradas {assessmentState.data.answeredItemIds.length} de{" "}
              {assessmentState.data.totalItems} preguntas de esta capacidad.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Estado: {assessmentState.data.status}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
