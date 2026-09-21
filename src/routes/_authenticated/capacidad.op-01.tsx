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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/loading-state";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout/page-header";
import { getOp01Context } from "@/lib/production/op01.functions";
import { createProductionAssessmentClient, resolveExecutionSource } from "@/services/production";
import { supabase } from "@/integrations/supabase/client";
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

const ALCANCES = [
  { value: "CAPABILITY", label: "Toda la capacidad" },
  { value: "SECTION", label: "Solo esta pregunta" },
  { value: "INFORMATION_NEED", label: "Una necesidad de información" },
  { value: "DOMAIN", label: "Todo el dominio" },
] as const;

function CapacidadOp01() {
  const queryClient = useQueryClient();
  const [estado, setEstado] = useState<KnowledgeState>("KNOWN");
  const [valor, setValor] = useState<string>("");
  const [razon, setRazon] = useState<string>("");
  const [fuentes, setFuentes] = useState<string[]>([]);
  const [correo, setCorreo] = useState<string>("");
  const [nombre, setNombre] = useState<string>("");
  const [alcance, setAlcance] = useState<(typeof ALCANCES)[number]["value"]>("CAPABILITY");
  const [motivo, setMotivo] = useState<string>("");
  const [tipoEvidencia, setTipoEvidencia] = useState<string>("");
  const [referenciaEvidencia, setReferenciaEvidencia] = useState<string>("");
  const [observacionesEvidencia, setObservacionesEvidencia] = useState<string[]>([]);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [recomendacionElegida, setRecomendacionElegida] = useState<string>("");
  const [tituloIntervencion, setTituloIntervencion] = useState<string>("");
  const [notaSeleccion, setNotaSeleccion] = useState<string>("");
  const [tituloActividad, setTituloActividad] = useState<string>("");
  const [revisionId, setRevisionId] = useState<string | null>(null);
  const [ejecutorCaso, setEjecutorCaso] = useState<string>("");
  const [notaSeguimiento, setNotaSeguimiento] = useState<string>("");
  const [tituloEntregable, setTituloEntregable] = useState<string>("");

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
    queryFn: () => cliente.getAssessmentDetail(),
    enabled: Boolean(contexto.data?.assessmentId),
  });

  const colaboracion = useQuery({
    queryKey: ["op01", "colaboracion"],
    queryFn: () => cliente.getCollaboration(),
    enabled: Boolean(contexto.data?.assessmentId),
  });

  const hallazgos = useQuery({
    queryKey: ["op01", "hallazgos"],
    queryFn: () => cliente.getFindings(),
    enabled: Boolean(contexto.data?.assessmentId),
  });

  const comprobacion = useQuery({
    queryKey: ["op01", "comprobacion"],
    queryFn: () => cliente.getValidation(),
    enabled: Boolean(contexto.data?.assessmentId),
  });

  /** Ejecuta una acción del servidor y refresca el estado productivo. */
  function accionProductiva<TInput>(
    ejecutar: (input: TInput) => Promise<{ accepted: boolean; rejectionReason: string | null }>,
    exito: string,
  ) {
    return {
      mutationFn: async (input: TInput) => {
        const salida = await ejecutar(input);
        if (!salida.accepted) throw new Error(salida.rejectionReason ?? "Acción no aceptada");
        return salida;
      },
      onSuccess: async () => {
        toast.success(exito);
        await queryClient.invalidateQueries({ queryKey: ["op01"] });
      },
      onError: (error: Error) => {
        toast.error("No pudimos completar la acción", { description: error.message });
      },
    };
  }

  const revisar = useMutation(
    accionProductiva(
      (input: { findingId: string; decision: "NEEDS_REVIEW" | "CONFIRMED" | "DISMISSED" }) =>
        cliente.reviewFinding(input),
      "Revisión registrada",
    ),
  );

  const crearRecomendacion = useMutation(
    accionProductiva(
      (input: { recommendationRef: string; findingId: string | null }) =>
        cliente.createRecommendationCandidate(input),
      "Recomendación registrada como candidata",
    ),
  );

  const decidirRecomendacion = useMutation(
    accionProductiva(
      (input: { recommendationCandidateId: string; decision: "SELECTED" | "REJECTED" }) =>
        cliente.decideRecommendation(input),
      "Decisión registrada",
    ),
  );

  const crearIntervencion = useMutation(
    accionProductiva(
      (input: { title: string; recommendationCandidateId?: string | null; selectionNote?: string | null }) =>
        cliente.createIntervention(input),
      "Intervención creada",
    ),
  );

  const crearActividad = useMutation(
    accionProductiva(
      (input: { interventionId: string; title: string }) => cliente.createActivity(input),
      "Actividad creada",
    ),
  );

  const cambiarEstadoActividad = useMutation(
    accionProductiva(
      (input: { activityId: string; state: "PENDING" | "EXECUTING" | "DELIVERABLE_PRODUCED" }) =>
        cliente.changeActivityState(input),
      "Estado de la actividad actualizado",
    ),
  );

  const registrarEntregable = useMutation(
    accionProductiva(
      (input: { activityId: string; title: string }) => cliente.registerDeliverable(input),
      "Entregable registrado (todavía sin validar)",
    ),
  );

  const marcarHecho = useMutation(
    accionProductiva(
      (input: { activityId: string }) => cliente.markActivityDone(input.activityId),
      "Tarea marcada como hecha (todavía sin comprobar)",
    ),
  );

  const prepararComprobacion = useMutation(
    accionProductiva(
      (input: { activityId: string; primaryExecutorRespondentId?: string | null }) =>
        cliente.registerValidationRequirement(input),
      "Comprobación preparada",
    ),
  );

  const registrarCaso = useMutation(
    accionProductiva(
      (input: {
        validationRequirementId: string;
        executorRespondentId: string;
        outcome: "CORRECT" | "INCORRECT";
        criticalAssistance: boolean;
      }) => cliente.registerValidationCase(input),
      "Caso registrado",
    ),
  );

  const abrirComprobacion = useMutation(
    accionProductiva(
      (input: { activityId: string }) => cliente.openValidation(input),
      "Comprobación abierta",
    ),
  );

  const decidirComprobacion = useMutation(
    accionProductiva(
      (input: {
        validationId: string;
        decision: "VALIDATED" | "NOT_VALIDATED" | "INSUFFICIENT_EVIDENCE";
      }) => cliente.decideValidation(input),
      "Decisión de comprobación registrada",
    ),
  );

  const iniciarSeguimiento = useMutation(
    accionProductiva(
      (input: { validationId: string }) => cliente.startFollowUp(input),
      "Seguimiento iniciado",
    ),
  );

  const decidirSeguimiento = useMutation(
    accionProductiva(
      (input: { followUpId: string; outcome: "CONSOLIDATED" | "NEEDS_ADJUSTMENT"; note: string }) =>
        cliente.decideFollowUp(input),
      "Seguimiento cerrado",
    ),
  );

  const nuevaRevision = useMutation({
    mutationFn: async () => {
      const salida = await cliente.startReassessment();
      if (!salida.accepted) throw new Error(salida.rejectionReason ?? "Acción no aceptada");
      return salida;
    },
    onSuccess: async (salida) => {
      toast.success("Nueva revisión iniciada");
      setRevisionId(salida.reassessmentAssessmentId);
      await queryClient.invalidateQueries({ queryKey: ["op01"] });
    },
    onError: (error: Error) => {
      toast.error("No pudimos iniciar la nueva revisión", { description: error.message });
    },
  });

  const comparar = useMutation({
    mutationFn: async (input: { baselineAssessmentId: string; reassessmentAssessmentId: string }) =>
      cliente.compareAssessments(input),
    onError: (error: Error) => {
      toast.error("No pudimos comparar", { description: error.message });
    },
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
        ...(estado === "CONTRADICTORY" ? { conflictingObservationIds: fuentes } : {}),
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
      setValor("");
      setRazon("");
      setFuentes([]);
      await queryClient.invalidateQueries({ queryKey: ["op01"] });
    },
    onError: (error: Error) => {
      toast.error("No pudimos registrar la respuesta", { description: error.message });
    },
  });

  const invitar = useMutation({
    mutationFn: async () => {
      const acquisition = pregunta.data;
      const referencia =
        alcance === "CAPABILITY"
          ? (colaboracion.data?.capabilityId ?? "OP-01")
          : alcance === "DOMAIN"
            ? "OP"
            : alcance === "INFORMATION_NEED"
              ? (acquisition?.informationNeedRef ?? "")
              : (acquisition?.acquisitionId ?? "");
      if (!referencia) throw new Error("Elige un alcance con una pregunta activa.");
      return cliente.inviteRespondent({
        email: correo.trim(),
        displayName: nombre.trim() || null,
        roleLabel: null,
        scopeType: alcance,
        scopeRef: referencia,
        delegatedFromAssignmentId: null,
        delegationReason: motivo.trim() || null,
      });
    },
    onSuccess: async () => {
      toast.success("Invitación creada", {
        description: "La persona solo verá el alcance que le asignaste.",
      });
      setCorreo("");
      setNombre("");
      setMotivo("");
      await queryClient.invalidateQueries({ queryKey: ["op01", "colaboracion"] });
    },
    onError: (error: Error) => {
      toast.error("No pudimos crear la invitación", { description: error.message });
    },
  });

  const adjuntar = useMutation({
    mutationFn: async () => {
      let storagePath: string | null = null;
      if (archivo && contexto.data) {
        // El archivo vive en el almacén privado, no en la base de datos.
        const ruta = `${contexto.data.organizationId}/${contexto.data.assessmentId}/${crypto.randomUUID()}-${archivo.name}`;
        const { error } = await supabase.storage.from("evidence").upload(ruta, archivo, {
          upsert: false,
        });
        if (error) throw new Error(error.message);
        storagePath = ruta;
      }
      return cliente.registerEvidence({
        candidateRef: tipoEvidencia || null,
        evidenceType: tipoEvidencia || "DOCUMENT",
        source: "DOCUMENT",
        storageBucket: storagePath ? "evidence" : null,
        storagePath,
        externalReference: referenciaEvidencia.trim() || null,
        title: referenciaEvidencia.trim() || archivo?.name || null,
        note: null,
        observationIds: observacionesEvidencia,
      });
    },
    onSuccess: async () => {
      toast.success("Evidencia registrada");
      setReferenciaEvidencia("");
      setArchivo(null);
      setObservacionesEvidencia([]);
      await queryClient.invalidateQueries({ queryKey: ["op01"] });
    },
    onError: (error: Error) => {
      toast.error("No pudimos registrar la evidencia", { description: error.message });
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
  const observaciones = colaboracion.data?.observations ?? [];
  const puedeEnviar =
    Boolean(acquisition) &&
    (estado !== "KNOWN" || valor.trim().length > 0) &&
    (estado !== "NOT_APPLICABLE" || razon.trim().length > 0) &&
    (estado !== "CONTRADICTORY" || fuentes.length >= 2);

  function alternar(lista: string[], valorLista: string, set: (v: string[]) => void) {
    set(lista.includes(valorLista) ? lista.filter((x) => x !== valorLista) : [...lista, valorLista]);
  }

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

            {estado === "KNOWN" && opciones.length === 0 && (
              <div className="space-y-2">
                <Label htmlFor="respuesta">Cuéntanos en tus palabras</Label>
                <Textarea
                  id="respuesta"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  rows={4}
                />
              </div>
            )}

            {estado === "UNKNOWN" && (
              <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                Dejar esto pendiente no cuenta como respuesta negativa: la necesidad de información
                sigue abierta y puedes invitar a otra persona o adjuntar un documento más abajo.
              </p>
            )}

            {estado === "NOT_APPLICABLE" && (
              <div className="space-y-2">
                <Label htmlFor="razon">Cuéntanos por qué no aplica</Label>
                <Textarea id="razon" value={razon} onChange={(e) => setRazon(e.target.value)} />
              </div>
            )}

            {estado === "CONTRADICTORY" && (
              <fieldset className="space-y-2">
                <legend className="mb-2 text-sm font-medium text-foreground">
                  Marca al menos dos respuestas anteriores que se contradicen
                </legend>
                {observaciones.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Todavía no hay respuestas anteriores con las que comparar.
                  </p>
                ) : (
                  observaciones.map((o) => (
                    <label
                      key={o.id}
                      className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={fuentes.includes(o.id)}
                        onChange={() => alternar(fuentes, o.id, setFuentes)}
                      />
                      <span>
                        {o.acquisitionRef} · {o.knowledgeState}
                      </span>
                    </label>
                  ))
                )}
              </fieldset>
            )}

            <Button onClick={() => enviar.mutate()} disabled={!puedeEnviar || enviar.isPending}>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Pedir ayuda a otra persona</CardTitle>
          <CardDescription>
            Quien invites solo verá el alcance que le asignes, nada más de la organización.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="correo-invitado">Correo</Label>
              <Input
                id="correo-invitado"
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nombre-invitado">Nombre (opcional)</Label>
              <Input
                id="nombre-invitado"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
          </div>
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium text-foreground">¿Sobre qué responde?</legend>
            <RadioGroup
              value={alcance}
              onValueChange={(v) => setAlcance(v as typeof alcance)}
              className="space-y-2"
            >
              {ALCANCES.map((op) => (
                <div
                  key={op.value}
                  className="flex items-center gap-3 rounded-lg border border-border p-3"
                >
                  <RadioGroupItem value={op.value} id={`alcance-${op.value}`} />
                  <Label htmlFor={`alcance-${op.value}`} className="cursor-pointer font-normal">
                    {op.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </fieldset>
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo (opcional)</Label>
            <Textarea id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>
          <Button
            variant="outline"
            onClick={() => invitar.mutate()}
            disabled={correo.trim().length === 0 || invitar.isPending}
          >
            Invitar
          </Button>

          {(colaboracion.data?.assignments.length ?? 0) > 0 && (
            <ul className="space-y-2 text-sm text-muted-foreground">
              {colaboracion.data!.assignments.map((a) => {
                const persona = colaboracion.data!.respondents.find((r) => r.id === a.respondentId);
                return (
                  <li key={a.id} className="rounded-lg border border-border p-3">
                    {persona?.displayName ?? persona?.email ?? "Persona"} · {a.scopeRef} ·{" "}
                    <span className="text-foreground">{a.status}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Adjuntar evidencia</CardTitle>
          <CardDescription>
            Un documento puede respaldar varias respuestas a la vez.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(colaboracion.data?.evidenceCandidates.length ?? 0) > 0 && (
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium text-foreground">Tipo de evidencia</legend>
              <RadioGroup value={tipoEvidencia} onValueChange={setTipoEvidencia} className="space-y-2">
                {colaboracion.data!.evidenceCandidates.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <RadioGroupItem value={c.id} id={`ev-${c.id}`} />
                    <Label htmlFor={`ev-${c.id}`} className="cursor-pointer font-normal">
                      {c.name}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </fieldset>
          )}
          <div className="space-y-2">
            <Label htmlFor="referencia-evidencia">Nombre o enlace del documento</Label>
            <Input
              id="referencia-evidencia"
              value={referenciaEvidencia}
              onChange={(e) => setReferenciaEvidencia(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="archivo-evidencia">O sube el archivo (opcional)</Label>
            <Input
              id="archivo-evidencia"
              type="file"
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            />
          </div>
          {observaciones.length > 0 && (
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium text-foreground">
                ¿Qué respuestas respalda?
              </legend>
              {observaciones.map((o) => (
                <label
                  key={o.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={observacionesEvidencia.includes(o.id)}
                    onChange={() => alternar(observacionesEvidencia, o.id, setObservacionesEvidencia)}
                  />
                  <span>
                    {o.acquisitionRef} · {o.variableRef}
                  </span>
                </label>
              ))}
            </fieldset>
          )}
          <Button
            variant="outline"
            onClick={() => adjuntar.mutate()}
            disabled={tipoEvidencia.length === 0 || adjuntar.isPending}
          >
            Registrar evidencia
          </Button>
          {(colaboracion.data?.evidence.length ?? 0) > 0 && (
            <ul className="space-y-2 text-sm text-muted-foreground">
              {colaboracion.data!.evidence.map((e) => (
                <li key={e.id} className="rounded-lg border border-border p-3">
                  {e.title ?? e.evidenceType} · {e.candidateRef ?? e.source}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {(colaboracion.data?.clarificationCandidates.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Aclaraciones pendientes</CardTitle>
            <CardDescription>
              Hay información que no coincide entre fuentes. No la promediamos: pedimos aclaración.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {colaboracion.data!.clarificationCandidates.map((c) => (
              <p key={c.acquisitionId} className="rounded-lg border border-border p-3">
                {c.question}
              </p>
            ))}
          </CardContent>
        </Card>
      )}


      {(hallazgos.data?.findings.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Hallazgos por revisar</CardTitle>
            <CardDescription>
              Ninguno se confirma automáticamente: cada uno depende de criterio humano y conserva
              el origen de la información que lo sustenta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hallazgos.data!.findings.map((f) => (
              <div key={f.id} className="space-y-3 rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={f.polarity === "STRENGTH" ? "default" : "secondary"}>
                    {f.polarity === "STRENGTH" ? "Fortaleza" : "Punto débil"}
                  </Badge>
                  <Badge variant="outline">{f.lifecycleState}</Badge>
                  <span className="text-sm font-medium">{f.name}</span>
                </div>
                {f.reason && <p className="text-sm text-muted-foreground">{f.reason}</p>}
                <p className="text-xs text-muted-foreground">
                  Gravedad: {f.severityQualitative ?? "sin definir"}. {f.severityReason}
                </p>
                <p className="text-xs text-muted-foreground">
                  Basado en: {f.variableRefs.join(", ") || "sin variables"} · reglas{" "}
                  {f.ruleRefs.join(", ") || "sin reglas"}
                </p>
                {f.lifecycleState !== "SUPERSEDED" && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => revisar.mutate({ findingId: f.id, decision: "CONFIRMED" })}
                      disabled={revisar.isPending}
                    >
                      Confirmar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => revisar.mutate({ findingId: f.id, decision: "NEEDS_REVIEW" })}
                      disabled={revisar.isPending}
                    >
                      Dejar en revisión
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => revisar.mutate({ findingId: f.id, decision: "DISMISSED" })}
                      disabled={revisar.isPending}
                    >
                      Descartar
                    </Button>
                    {recomendacionElegida && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          crearRecomendacion.mutate({
                            recommendationRef: recomendacionElegida,
                            findingId: f.id,
                          })
                        }
                        disabled={crearRecomendacion.isPending}
                      >
                        Proponer {recomendacionElegida}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
            {(hallazgos.data?.recommendationIdentities.length ?? 0) > 0 && (
              <div className="space-y-2">
                <Label>Propuesta a considerar</Label>
                <RadioGroup
                  value={recomendacionElegida}
                  onValueChange={setRecomendacionElegida}
                  className="grid gap-2 sm:grid-cols-3"
                >
                  {hallazgos.data!.recommendationIdentities.map((r) => (
                    <div key={r.recommendationRef} className="flex items-center gap-2">
                      <RadioGroupItem value={r.recommendationRef} id={`rec-${r.recommendationRef}`} />
                      <Label htmlFor={`rec-${r.recommendationRef}`} className="text-sm font-normal">
                        {r.title ?? r.recommendationRef}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                <p className="text-xs text-muted-foreground">
                  El contenido detallado de estas propuestas todavía no está definido, así que se
                  registran solo como candidatas y nunca se generan por sí solas.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(hallazgos.data?.derivedDependencyReferences.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Relación con otras áreas</CardTitle>
            <CardDescription>
              Se anota la relación como referencia. No se inicia ningún otro diagnóstico.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {hallazgos.data!.derivedDependencyReferences.map((d) => (
              <p key={d.id} className="rounded-lg border border-border p-3">
                {d.cause} → {d.targetCapabilityId ?? d.targetDomainId ?? "sin destino definido"}
                {" · "}
                {d.note}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {(hallazgos.data?.recommendationCandidates.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Propuestas registradas</CardTitle>
            <CardDescription>
              Una propuesta no es un plan: se convierte en plan solo cuando la eliges.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {hallazgos.data!.recommendationCandidates.map((r) => (
              <div key={r.id} className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="outline">{r.status}</Badge>
                  <span>{r.title ?? r.recommendationRef}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      decidirRecomendacion.mutate({
                        recommendationCandidateId: r.id,
                        decision: "SELECTED",
                      })
                    }
                    disabled={decidirRecomendacion.isPending || r.status === "SELECTED"}
                  >
                    Elegir
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      decidirRecomendacion.mutate({
                        recommendationCandidateId: r.id,
                        decision: "REJECTED",
                      })
                    }
                    disabled={decidirRecomendacion.isPending}
                  >
                    Descartar
                  </Button>
                </div>
                {r.status === "SELECTED" && (
                  <div className="space-y-2 pt-2">
                    <Label htmlFor={`itv-${r.id}`}>Nombre del plan de trabajo</Label>
                    <Input
                      id={`itv-${r.id}`}
                      value={tituloIntervencion}
                      onChange={(e) => setTituloIntervencion(e.target.value)}
                      placeholder="Ej.: Aclarar quién hace qué en el proceso"
                    />
                    <Textarea
                      value={notaSeleccion}
                      onChange={(e) => setNotaSeleccion(e.target.value)}
                      placeholder="Por qué eliges este plan"
                    />
                    <Button
                      size="sm"
                      onClick={() =>
                        crearIntervencion.mutate({
                          title: tituloIntervencion,
                          recommendationCandidateId: r.id,
                          selectionNote: notaSeleccion || null,
                        })
                      }
                      disabled={crearIntervencion.isPending || tituloIntervencion.trim().length === 0}
                    >
                      Crear plan de trabajo
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {(hallazgos.data?.interventions.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Planes de trabajo</CardTitle>
            <CardDescription>
              Entregar algo no significa que quede aprobado: la comprobación llega más adelante.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hallazgos.data!.interventions.map((i) => (
              <div key={i.id} className="space-y-3 rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="outline">{i.status}</Badge>
                  <span className="font-medium">{i.title}</span>
                </div>
                {i.activities.map((a) => (
                  <div key={a.id} className="space-y-2 rounded-lg border border-border p-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge variant="secondary">{a.state}</Badge>
                      <span>{a.title}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          cambiarEstadoActividad.mutate({ activityId: a.id, state: "EXECUTING" })
                        }
                        disabled={cambiarEstadoActividad.isPending}
                      >
                        En curso
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => marcarHecho.mutate({ activityId: a.id })}
                        disabled={marcarHecho.isPending}
                      >
                        Marcar como hecha
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => prepararComprobacion.mutate({ activityId: a.id })}
                        disabled={prepararComprobacion.isPending}
                      >
                        Preparar comprobación
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => abrirComprobacion.mutate({ activityId: a.id })}
                        disabled={abrirComprobacion.isPending}
                      >
                        Abrir comprobación
                      </Button>
                    </div>
                    {a.deliverables.map((d) => (
                      <p key={d.id} className="text-xs text-muted-foreground">
                        Entregado: {d.title} (pendiente de comprobación)
                      </p>
                    ))}
                    <div className="space-y-2">
                      <Label htmlFor={`dlv-${a.id}`}>Registrar entregable</Label>
                      <Input
                        id={`dlv-${a.id}`}
                        value={tituloEntregable}
                        onChange={(e) => setTituloEntregable(e.target.value)}
                        placeholder="Ej.: Mapa del proceso en una página"
                      />
                      <Button
                        size="sm"
                        onClick={() =>
                          registrarEntregable.mutate({ activityId: a.id, title: tituloEntregable })
                        }
                        disabled={registrarEntregable.isPending || tituloEntregable.trim().length === 0}
                      >
                        Registrar entregable
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="space-y-2">
                  <Label htmlFor={`act-${i.id}`}>Añadir tarea</Label>
                  <Input
                    id={`act-${i.id}`}
                    value={tituloActividad}
                    onChange={(e) => setTituloActividad(e.target.value)}
                    placeholder="Ej.: Escribir la guía del proceso"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      crearActividad.mutate({ interventionId: i.id, title: tituloActividad })
                    }
                    disabled={crearActividad.isPending || tituloActividad.trim().length === 0}
                  >
                    Añadir tarea
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {comprobacion.data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Comprobación y seguimiento</CardTitle>
            <CardDescription>
              Entregar y marcar como hecho no es lo mismo que comprobar. Una tarea solo queda
              comprobada cuando se cumple, completa, la condición acordada.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {comprobacion.data.requirements.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Todavía no hay comprobaciones preparadas para este plan.
              </p>
            )}

            {comprobacion.data.requirements.map((r) => (
              <div key={r.id} className="space-y-3 rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="outline">{r.status}</Badge>
                  <span className="font-medium">{r.definition}</span>
                </div>
                {r.status === "VALIDATION_REQUIREMENT_NOT_EXPLICIT" ? (
                  <p className="text-xs text-muted-foreground">
                    No existe una condición de comprobación acordada para esta tarea. Queda anotado
                    como vacío de conocimiento: no la damos por comprobada.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor={`crv-${r.id}`}>Quién realizó el caso</Label>
                    <select
                      id={`crv-${r.id}`}
                      className="w-full rounded-md border border-input bg-background p-2 text-sm"
                      value={ejecutorCaso}
                      onChange={(e) => setEjecutorCaso(e.target.value)}
                    >
                      <option value="">Selecciona a la persona</option>
                      {(colaboracion.data?.respondents ?? []).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.displayName ?? p.email ?? p.id}
                        </option>
                      ))}
                    </select>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          registrarCaso.mutate({
                            validationRequirementId: r.id,
                            executorRespondentId: ejecutorCaso,
                            outcome: "CORRECT",
                            criticalAssistance: false,
                          })
                        }
                        disabled={registrarCaso.isPending || ejecutorCaso.length === 0}
                      >
                        Caso correcto, sin ayuda clave
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          registrarCaso.mutate({
                            validationRequirementId: r.id,
                            executorRespondentId: ejecutorCaso,
                            outcome: "CORRECT",
                            criticalAssistance: true,
                          })
                        }
                        disabled={registrarCaso.isPending || ejecutorCaso.length === 0}
                      >
                        Necesitó ayuda clave
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          registrarCaso.mutate({
                            validationRequirementId: r.id,
                            executorRespondentId: ejecutorCaso,
                            outcome: "INCORRECT",
                            criticalAssistance: false,
                          })
                        }
                        disabled={registrarCaso.isPending || ejecutorCaso.length === 0}
                      >
                        No salió bien
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {comprobacion.data.validations.map((v) => (
              <div key={v.id} className="space-y-3 rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="secondary">{v.status}</Badge>
                  <span className="text-muted-foreground">{v.decisionReason}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      decidirComprobacion.mutate({ validationId: v.id, decision: "VALIDATED" })
                    }
                    disabled={decidirComprobacion.isPending}
                  >
                    Confirmar comprobación
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      decidirComprobacion.mutate({ validationId: v.id, decision: "NOT_VALIDATED" })
                    }
                    disabled={decidirComprobacion.isPending}
                  >
                    No queda comprobada
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => iniciarSeguimiento.mutate({ validationId: v.id })}
                    disabled={iniciarSeguimiento.isPending}
                  >
                    Iniciar seguimiento
                  </Button>
                </div>
              </div>
            ))}

            {comprobacion.data.followUps.map((f) => (
              <div key={f.id} className="space-y-2 rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="outline">{f.status}</Badge>
                  <span className="text-muted-foreground">Seguimiento de la tarea</span>
                </div>
                <Label htmlFor={`seg-${f.id}`}>Qué observaste</Label>
                <Input
                  id={`seg-${f.id}`}
                  value={notaSeguimiento}
                  onChange={(e) => setNotaSeguimiento(e.target.value)}
                  placeholder="Ej.: tres meses funcionando sin incidencias"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      decidirSeguimiento.mutate({
                        followUpId: f.id,
                        outcome: "CONSOLIDATED",
                        note: notaSeguimiento,
                      })
                    }
                    disabled={decidirSeguimiento.isPending || notaSeguimiento.trim().length === 0}
                  >
                    Quedó consolidado
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      decidirSeguimiento.mutate({
                        followUpId: f.id,
                        outcome: "NEEDS_ADJUSTMENT",
                        note: notaSeguimiento,
                      })
                    }
                    disabled={decidirSeguimiento.isPending || notaSeguimiento.trim().length === 0}
                  >
                    Necesita ajuste
                  </Button>
                </div>
              </div>
            ))}

            <div className="space-y-2 border-t border-border pt-4">
              <p className="text-sm font-medium">Nueva revisión</p>
              <p className="text-xs text-muted-foreground">
                La primera revisión se conserva tal como quedó: la nueva no la modifica ni la
                recalcula.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => nuevaRevision.mutate()}
                  disabled={nuevaRevision.isPending}
                >
                  Iniciar nueva revisión
                </Button>
                {revisionId && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      comparar.mutate({
                        baselineAssessmentId: comprobacion.data!.assessmentId,
                        reassessmentAssessmentId: revisionId,
                      })
                    }
                    disabled={comparar.isPending}
                  >
                    Comparar con la primera
                  </Button>
                )}
              </div>
              {comparar.data?.comparison && (
                <div className="space-y-1 text-xs text-muted-foreground">
                  {comparar.data.comparison.variableComparisons.map((c) => (
                    <p key={c.variableRef}>
                      {c.variableRef}: {c.baselineState ?? "—"} → {c.currentState ?? "—"} ·{" "}
                      {c.interpretation}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {assessmentState.data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Estado de la evaluación</CardTitle>
            <CardDescription>
              Registradas {assessmentState.data.answeredAcquisitionIds.length} de{" "}
              {assessmentState.data.totalAcquisitions} preguntas de esta capacidad.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Estado: {assessmentState.data.status}</p>
            {assessmentState.data.needsReview && (
              <p>Hay puntos que requieren revisión humana antes de concluir.</p>
            )}
            {assessmentState.data.contradictions.length > 0 && (
              <p>
                Información contradictoria detectada en{" "}
                {assessmentState.data.contradictions.map((c) => c.variableRef).join(", ")}.
              </p>
            )}
            {assessmentState.data.evidenceRequirements.length > 0 && (
              <p>
                Requisitos de evidencia por revisar:{" "}
                {assessmentState.data.evidenceRequirements.map((e) => e.variableRef).join(", ")}.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
