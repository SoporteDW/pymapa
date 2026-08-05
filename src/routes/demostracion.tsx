import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { LoadingState } from "@/components/ui/loading-state";
import { DemoNote } from "@/components/ui/demo-note";
import { PageHeader } from "@/components/layout/page-header";
import { useIntegracion } from "@/hooks/use-integracion";
import type { InformeConsistencia } from "@/lib/integracion/consistencia";
import { toast } from "sonner";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Building2,
  Database,
  Download,
  Upload,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/demostracion")({
  head: () => ({
    meta: [
      { title: "Demostración integrada — pymapa" },
      {
        name: "description",
        content:
          "Carga perfiles de pyme simulados y verifica el recorrido completo: diagnóstico, motor, resultados, plan y roadmap.",
      },
      { property: "og:title", content: "Demostración integrada — pymapa" },
      {
        property: "og:description",
        content:
          "Carga perfiles de pyme simulados y verifica la consistencia entre todos los módulos del MVP Alfa.",
      },
    ],
  }),
  component: DemostracionPage,
});

const ICONO_ESTADO = {
  ok: CheckCircle2,
  aviso: AlertTriangle,
  falla: XCircle,
} as const;

const TONO_ESTADO = {
  ok: "text-success",
  aviso: "text-warning",
  falla: "text-destructive",
} as const;

function ListaVerificaciones({ informe }: { informe: InformeConsistencia }) {
  return (
    <ul className="space-y-2">
      {informe.verificaciones.map((v) => {
        const Icono = ICONO_ESTADO[v.estado];
        return (
          <li key={v.id} className="flex gap-3 rounded-lg border border-border p-3">
            <Icono className={`mt-0.5 h-4 w-4 shrink-0 ${TONO_ESTADO[v.estado]}`} aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-medium">
                <span className="text-muted-foreground">{v.id} · </span>
                {v.titulo}
              </p>
              <p className="text-sm text-muted-foreground">{v.detalle}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function DemostracionPage() {
  const {
    estado,
    perfiles,
    perfilActivo,
    recuperacion,
    ejecucion,
    informe,
    mensaje,
    limpiarMensaje,
    cargarPerfil,
    verificarTodos,
    exportar,
    importar,
    reiniciarTodo,
  } = useIntegracion();

  const [informesGlobales, setInformesGlobales] = useState<InformeConsistencia[] | null>(null);
  const [respaldo, setRespaldo] = useState("");

  useEffect(() => {
    if (!mensaje) return;
    toast.info(mensaje);
    limpiarMensaje();
  }, [mensaje, limpiarMensaje]);

  const resumenGlobal = useMemo(() => {
    if (!informesGlobales) return null;
    return {
      total: informesGlobales.reduce((t, i) => t + i.total, 0),
      correctas: informesGlobales.reduce((t, i) => t + i.correctas, 0),
      avisos: informesGlobales.reduce((t, i) => t + i.avisos, 0),
      fallas: informesGlobales.reduce((t, i) => t + i.fallas, 0),
    };
  }, [informesGlobales]);

  if (estado === "cargando" || !recuperacion) {
    return <LoadingState fullPage />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Ver demostraciones"
        subtitulo="Cinco empresas de ejemplo completamente diligenciadas para demostraciones comerciales, capacitación y validación del producto."

        migas={[{ label: "Inicio", to: "/inicio" }, { label: "Demostración" }]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" aria-hidden="true" />
            Perfiles de pyme simulados
          </CardTitle>
          <CardDescription>
            Cada perfil escribe su diagnóstico, ejecución del motor, resultados, fichas y Roadmap en
            este navegador.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-2">
          {perfiles.map((perfil) => {
            const activo = perfilActivo?.id === perfil.id;
            return (
              <article
                key={perfil.id}
                className={`flex flex-col gap-3 rounded-lg border p-4 ${
                  activo ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <header className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold">{perfil.nombre}</h3>
                    <Badge variant="outline">{perfil.id}</Badge>
                    {perfil.cobertura === "parcial" && <Badge variant="secondary">Parcial</Badge>}
                    {activo && <Badge>Activo</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{perfil.resumen}</p>
                </header>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Resultado esperado: </span>
                  {perfil.expectativa}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => cargarPerfil(perfil.id)}>
                    Cargar este perfil
                  </Button>
                  {activo && (
                    <Button size="sm" variant="outline" asChild>
                      <Link to="/resultados">Ver resultados</Link>
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </CardContent>
      </Card>

      {ejecucion && informe && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Consistencia del recorrido cargado
            </CardTitle>
            <CardDescription>
              {informe.correctas} de {informe.total} verificaciones correctas
              {informe.avisos > 0 ? `, ${informe.avisos} aviso(s)` : ""}
              {informe.fallas > 0 ? `, ${informe.fallas} falla(s)` : ""}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-3 sm:grid-cols-4">
              {[
                { etiqueta: "Madurez", valor: `${Math.round(ejecucion.resultado?.overallScore ?? 0)} pts` },
                { etiqueta: "Hallazgos", valor: String(ejecucion.salidaMotor?.findings.length ?? 0) },
                { etiqueta: "Fichas de acción", valor: String(ejecucion.resultado?.actions.length ?? 0) },
                { etiqueta: "Acciones del plan", valor: String(ejecucion.roadmap?.acciones.length ?? 0) },
              ].map((item) => (
                <div key={item.etiqueta} className="rounded-lg border border-border p-3">
                  <dt className="text-xs text-muted-foreground">{item.etiqueta}</dt>
                  <dd className="text-lg font-semibold">{item.valor}</dd>
                </div>
              ))}
            </dl>
            <ListaVerificaciones informe={informe} />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/diagnostico">Diagnóstico</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/resultados">Resultados</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/plan-de-accion">Plan de acción</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/roadmap">Roadmap</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/dashboard">Indicadores</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Verificación de todos los perfiles</CardTitle>
          <CardDescription>
            Ejecuta la cadena completa de los cinco perfiles sin alterar el progreso guardado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="secondary" onClick={() => setInformesGlobales(verificarTodos())}>
            Ejecutar verificación integral
          </Button>
          {resumenGlobal && informesGlobales && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {resumenGlobal.correctas} de {resumenGlobal.total} verificaciones correctas ·{" "}
                {resumenGlobal.avisos} aviso(s) · {resumenGlobal.fallas} falla(s).
              </p>
              <ul className="space-y-2">
                {informesGlobales.map((i, indice) => {
                  const perfil = perfiles[indice];
                  const Icono = i.aprobado ? CheckCircle2 : XCircle;
                  return (
                    <li
                      key={i.diagnosisId}
                      className="flex items-center gap-3 rounded-lg border border-border p-3"
                    >
                      <Icono
                        className={`h-4 w-4 shrink-0 ${i.aprobado ? "text-success" : "text-destructive"}`}
                        aria-hidden="true"
                      />
                      <span className="text-sm">
                        {perfil?.nombre ?? i.diagnosisId} — {i.correctas}/{i.total} correctas
                        {i.avisos > 0 ? ` · ${i.avisos} aviso(s)` : ""}
                        {i.fallas > 0 ? ` · ${i.fallas} falla(s)` : ""}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4" aria-hidden="true" />
            Sesión y persistencia
          </CardTitle>
          <CardDescription>
            El progreso se guarda en este navegador por módulo. Puedes respaldarlo, restaurarlo o
            reiniciarlo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!recuperacion.almacenamientoDisponible && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/20 bg-warning/5 p-3 text-sm text-warning-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Este navegador bloquea el almacenamiento. El recorrido funciona, pero el progreso no
                se conservará al cerrar la pestaña.
              </span>
            </div>
          )}

          <ul className="grid gap-2 sm:grid-cols-2">
            {recuperacion.modulos.map((modulo) => (
              <li
                key={modulo.clave}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{modulo.nombre}</p>
                  <p className="truncate text-xs text-muted-foreground">{modulo.clave}</p>
                </div>
                <Badge variant={modulo.presente ? "default" : "outline"}>
                  {modulo.presente ? "Guardado" : "Vacío"}
                </Badge>
              </li>
            ))}
          </ul>

          <p className="text-sm text-muted-foreground">
            {recuperacion.hayProgreso
              ? `Hay progreso recuperable en este dispositivo${
                  recuperacion.sesion.perfilActivoNombre
                    ? ` (perfil “${recuperacion.sesion.perfilActivoNombre}”)`
                    : ""
                }.`
              : "Aún no hay progreso guardado en este dispositivo."}
          </p>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setRespaldo(JSON.stringify(exportar(), null, 2))}
            >
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              Generar respaldo
            </Button>
            <Button variant="outline" onClick={() => importar(respaldo)} disabled={!respaldo.trim()}>
              <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
              Restaurar desde el texto
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (confirm("¿Deseas borrar todo el progreso guardado en este navegador?")) {
                  reiniciarTodo();
                }
              }}
            >
              <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
              Reiniciar todo
            </Button>
          </div>

          <div className="space-y-2">
            <label htmlFor="respaldo" className="text-sm font-medium">
              Respaldo de la sesión (JSON)
            </label>
            <Textarea
              id="respaldo"
              rows={6}
              value={respaldo}
              onChange={(e) => setRespaldo(e.target.value)}
              placeholder="Genera un respaldo o pega aquí uno anterior para restaurarlo."
              className="font-mono text-xs"
            />
          </div>
        </CardContent>
      </Card>

      <DemoNote>
        Los cinco perfiles son datos de prueba controlados: no representan empresas reales ni
        provienen de modelos generativos. La sincronización en la nube y la autenticación se
        definirán en paquetes posteriores.
      </DemoNote>
    </div>
  );
}
