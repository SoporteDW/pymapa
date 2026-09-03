import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/layout/page-header";
import { BadgeEstadoEjecucion } from "@/components/workspace/badge-estado-ejecucion";
import { PanelInstrumento } from "@/components/workspace/panel-instrumento";
import { PanelChecklist } from "@/components/workspace/panel-checklist";
import { FormularioEntrega } from "@/components/workspace/formulario-entrega";
import { FichaActividad } from "@/components/workspace/ficha-actividad";
import { PedirAMiEmpresa } from "@/components/colaboracion/pedir-a-mi-empresa";
import { PedirApoyoExperto } from "@/components/apoyo-humano/pedir-apoyo-experto";
import { HistorialEntregas } from "@/components/workspace/historial-entregas";
import { useWorkspace } from "@/hooks/use-workspace";
import { metadatosDePlantilla } from "@/lib/intervencion/clasificacion";
import { descripcionEstadoEjecucion, puedeEntregar } from "@/lib/workspace/estados";
import { toast } from "sonner";
import { RotateCcw, SearchX, Target } from "lucide-react";

export const Route = createFileRoute("/plan-de-accion/workspace/$actividad")({
  /**
   * `desde=seguimiento` conserva el contexto: una Actividad ya validada que se
   * consulta desde Etapa 4 es un antecedente, y al salir se vuelve al mismo
   * seguimiento, no al Plan de Acción.
   */
  validateSearch: (search: Record<string, unknown>): { desde?: "seguimiento" } =>
    search["desde"] === "seguimiento" ? { desde: "seguimiento" } : {},
  head: () => ({
    meta: [
      { title: "Workspace de ejecución de la actividad — pymapa" },
      {
        name: "description",
        content:
          "Ejecuta la actividad con su instrumento metodológico, entrega el resultado y recibe la revisión con ajustes concretos.",
      },
      { property: "og:title", content: "Workspace de ejecución de la actividad — pymapa" },
      {
        property: "og:description",
        content:
          "Objetivo, metodología, pasos, entregable y ciclo de validación de cada actividad priorizada.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WorkspacePage,
});

function WorkspacePage() {
  const { actividad: actividadId } = useParams({ from: "/plan-de-accion/workspace/$actividad" });
  const navigate = useNavigate();
  const { desde } = Route.useSearch();
  const desdeSeguimiento = desde === "seguimiento";
  const {
    hidratado,
    actividad,
    existeEnRecorrido,
    iniciar,
    alternarPaso,
    revisarVerificacion,
    entregar,
    borrador,
    actualizarBorrador,
    retomar,
    plantillas,
  } = useWorkspace(actividadId);

  if (!hidratado) return <LoadingState fullPage />;

  if (!actividad) {
    return (
      <div className="space-y-6">
        <PageHeader
          titulo="Workspace de ejecución"
          subtitulo="Selecciona una actividad de tu plan de acción para trabajarla con su instrumento."
          migas={[
            { label: "Inicio", to: "/inicio" },
            { label: "Plan de acción", to: "/plan-de-accion" },
            { label: "Workspace" },
          ]}
        />
        <EmptyState
          title="No encontramos esta actividad"
          description={
            existeEnRecorrido
              ? "La actividad existe, pero aún no pudimos abrir su workspace. Vuelve a intentarlo."
              : "Esta actividad no forma parte de tu plan de acción actual ni del escenario de demostración."
          }
          icon={SearchX}
          actionLabel="Volver al plan de acción"
          onAction={() => navigate({ to: "/plan-de-accion" })}
        />
      </div>
    );
  }

  // Ajustes de la última revisión: siguen visibles después de "Retomar", que es
  // lo que permite corregir y reenviar sin perder el detalle de lo pedido.
  // Consulta histórica: una Actividad validada no es trabajo pendiente.
  const historico = actividad.estado === "validado";
  const ultimaRevision = actividad.historial.at(-1)?.revision ?? null;
  const ajustesPendientes =
    ultimaRevision && ultimaRevision.veredicto === "requiere_ajustes"
      ? ultimaRevision.ajustesSolicitados
      : [];

  const retomarActividad = () => {
    retomar(actividad.id);
    toast.info("Actividad retomada", {
      description: "Corrige los ajustes solicitados y vuelve a enviarla a revisión.",
    });
  };

  const esDemo = actividad.origen.tipo === "escenario_demo";
  const origenTransversal = {
    tipo: "actividad" as const,
    referenciaId: actividad.id,
    referenciaTitulo: actividad.titulo,
    dominioId: actividad.origen.dominioId,
    dominioNombre: actividad.origen.dominioNombre,
    rutaRetorno: `/plan-de-accion/workspace/${actividad.id}`,
  };

  // Macroentrega 5 · La Ficha de Actividad explica antes de ejecutar.
  if (actividad.estado === "pendiente") {
    return (
      <div className="space-y-6">
        <PageHeader
          titulo={actividad.titulo}
          subtitulo="Etapa 3 · Actuar — Comprende la actividad antes de ejecutarla."
          migas={[
            { label: "Inicio", to: "/inicio" },
            { label: "Plan de Acción", to: "/plan-de-accion" },
            { label: "Ficha de Actividad" },
          ]}
        />
        <FichaActividad
          actividad={actividad}
          onEmpezar={() => iniciar(actividad.id)}
          metadatos={metadatosDePlantilla(plantillas, actividad.id)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        titulo={actividad.titulo}
        subtitulo={
          historico
            ? "Actividad completada · histórico. Aquí queda el registro de lo que se hizo, se entregó y se validó."
            : "Qué se busca lograr, con qué instrumento se trabaja, qué se entrega y cómo se valida."
        }
        migas={
          desdeSeguimiento
            ? [
                { label: "Inicio", to: "/inicio" },
                { label: "Seguimiento", to: "/seguimiento" },
                { label: "Actividad histórica" },
              ]
            : [
                { label: "Inicio", to: "/inicio" },
                { label: "Plan de acción", to: "/plan-de-accion" },
                { label: historico ? "Actividad histórica" : "Workspace" },
              ]
        }
        acciones={
          desdeSeguimiento ? (
            <Button variant="outline" asChild>
              <Link
                to="/seguimiento/$actividad"
                params={{ actividad: actividad.id }}
              >
                Volver a mi seguimiento
              </Link>
            </Button>
          ) : (
            <Button variant="outline" asChild>
              <Link to="/plan-de-accion">Volver al plan</Link>
            </Button>
          )
        }
      />

      <Card>
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <BadgeEstadoEjecucion estado={actividad.estado} />
            {historico && (
              <Badge variant="outline" className="border-success/50 text-success">
                Actividad completada · histórico
              </Badge>
            )}
            <Badge variant="secondary">{actividad.origen.dominioNombre}</Badge>
            {esDemo && <Badge variant="outline">Escenario de demostración</Badge>}
          </div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-primary" aria-hidden="true" />
            {actividad.objetivo}
          </CardTitle>
          <CardDescription>{descripcionEstadoEjecucion[actividad.estado]}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Por qué esta actividad</p>
            <p className="text-sm text-muted-foreground">{actividad.porQue}</p>
          </div>
          <Separator />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Trazabilidad</p>
            <p className="text-xs text-muted-foreground">Origen: {actividad.origen.fuente}</p>
            {actividad.origen.referencias.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Sustentada en: {actividad.origen.referencias.join(" · ")}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {ajustesPendientes.length > 0 && (
        <Card className="border-warning/40 bg-warning/5">
          <CardHeader className="space-y-1.5">
            <CardTitle className="text-base">Qué pidió corregir la revisión</CardTitle>
            <CardDescription>
              {actividad.estado === "requiere_ajustes"
                ? "Retoma la Actividad para corregir estos puntos y volver a enviarla."
                : "Estás corrigiendo estos puntos. Cuando queden resueltos, vuelve a enviar a revisión."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-2 text-sm text-foreground">
              {ajustesPendientes.map((ajuste) => (
                <li key={ajuste} className="flex gap-2">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning"
                    aria-hidden="true"
                  />
                  {ajuste}
                </li>
              ))}
            </ul>
            {actividad.estado === "requiere_ajustes" && (
              <Button onClick={retomarActividad}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Retomar actividad y corregir
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {!historico && (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">¿Necesitas ayuda con esta actividad?</CardTitle>
          <CardDescription>
            Puedes pedir apoyo a alguien de tu empresa o a un especialista sin salir de la actividad.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <PedirAMiEmpresa
            origen={origenTransversal}
            tareaSugerida={`Apoyarme en: ${actividad.objetivo}`}
          />
          <PedirApoyoExperto origen={origenTransversal} />
        </CardContent>
      </Card>
      )}

      <PanelInstrumento
        actividad={actividad}
        soloLectura={historico}
        onAlternarPaso={(orden, hecho) => alternarPaso(actividad.id, orden, hecho)}
      />

      {actividad.profundizacion && (
        <PanelChecklist
          profundizacion={actividad.profundizacion}
          soloLectura={historico}
          onMarcar={(verificacionId, estado) =>
            revisarVerificacion(actividad.id, verificacionId, estado)
          }
        />
      )}

      {puedeEntregar(actividad.estado) ? (
        <FormularioEntrega
          actividad={actividad}
          borrador={borrador ?? { criteriosDeclarados: [], nota: "", archivos: [] }}
          onCambiarBorrador={(cambios) => actualizarBorrador(actividad.id, cambios)}
          onEntregar={(entrada) => {
            const entrega = entregar(actividad.id, entrada);
            if (!entrega) return;
            if (entrega.revision.veredicto === "validado") {
              toast.success("Actividad validada", { description: entrega.revision.mensaje });
            } else {
              toast.warning("La revisión pide ajustes", { description: entrega.revision.mensaje });
            }
          }}
        />
      ) : (
        <Card>
          <CardHeader className="space-y-1.5">
            <CardTitle className="text-base">{actividad.entregable.titulo}</CardTitle>
            <CardDescription>{actividad.entregable.descripcion}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {actividad.entregable.criteriosValidacion.map((criterio) => (
                <li key={criterio} className="flex gap-2">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                  {criterio}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* P0.4 · la Actividad siempre ofrece su propio cierre: no hace falta
          escapar por Roadmap ni por el menú lateral. */}
      <Card className="border-primary/25">
        <CardHeader className="space-y-1.5">
          <CardTitle className="text-base">
            {actividad.estado === "validado"
              ? "Actividad validada"
              : actividad.estado === "entregado"
                ? "Entrega en revisión"
                : "Cerrar o continuar esta actividad"}
          </CardTitle>
          <CardDescription>
            {actividad.estado === "validado"
              ? desdeSeguimiento
                ? "Esta actividad ya quedó validada: es el antecedente de lo que estás midiendo. Vuelve a tu seguimiento para continuar."
                : "Esta actividad quedó cerrada. Vuelve al Plan de Acción para continuar con la siguiente."
              : actividad.estado === "entregado"
                ? "La entrega está en revisión. Puedes volver al plan y retomarla cuando tengas el resultado."
                : "Puedes entregar cuando los criterios estén completos, o volver al plan y retomarla más tarde: el avance queda guardado."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {desdeSeguimiento ? (
            <Button asChild>
              <Link to="/seguimiento/$actividad" params={{ actividad: actividad.id }}>
                Volver a mi seguimiento
              </Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to="/plan-de-accion">
                {actividad.estado === "validado"
                  ? "Volver al Plan y ver la siguiente actividad"
                  : "Volver al Plan de Acción"}
              </Link>
            </Button>
          )}

        </CardContent>
      </Card>

      <HistorialEntregas historial={actividad.historial} />
    </div>
  );
}
