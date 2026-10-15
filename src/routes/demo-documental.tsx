import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FileUp, ListChecks, RotateCcw, Check, X, FileText, ClipboardList } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { preguntasEnOrden, obtenerPregunta, etiquetaRespuesta, obtenerDimension } from "@/lib/diagnostico/definicion";
import { calcularResultado, areasParaProfundizar } from "@/lib/diagnostico/calculo";
import type { PreguntaDiagnostico, ValorRespuesta, DiagnosticAnswer } from "@/lib/diagnostico/tipos";
import { plantillasEscenarioHero } from "@/lib/workspace/escenario-hero";
import { extraerPdf, ExtraccionError, mensajeErrorExtraccion } from "@/lib/document-first/pdf-texto";
import { aplicarReglasG1, resumenCobertura } from "@/lib/document-first/reglas-g1";
import { importarPlan, sugerirVinculo } from "@/lib/document-first/plan-import";
import {
  estadoVacio, guardarSandbox, leerSandbox, registrarRespuesta, revertirRespuesta,
  type EstadoSandboxDF, type PropuestaSandbox, type PrioridadPlanSandbox,
} from "@/lib/document-first/sandbox-demo";

export const Route = createFileRoute("/demo-documental")({
  head: () => ({
    meta: [
      { title: "Moda Origen · Demo con documentos — pymapa" },
      { name: "description", content: "Demostración de Moda Origen: responde el diagnóstico a mano o acelera con documentos, revisando cada propuesta con su cita." },
      { property: "og:title", content: "Moda Origen · Demo con documentos — pymapa" },
      { property: "og:description", content: "Carga un documento, revisa las respuestas propuestas con su página y cita, y confirma antes de ver el diagnóstico." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DemoDocumental,
});

const TOTAL = preguntasEnOrden.length;
const ahora = () => new Date().toISOString();

function valorTexto(p: PreguntaDiagnostico, v: ValorRespuesta | null | undefined) {
  return v === null || v === undefined ? "—" : etiquetaRespuesta(p, v) ?? String(v);
}

function SelectorValor({ p, valor, onChange }: { p: PreguntaDiagnostico; valor: ValorRespuesta | null | undefined; onChange: (v: ValorRespuesta) => void }) {
  if (p.tipo === "multi_select") {
    const sel = Array.isArray(valor) ? valor.map(String) : [];
    return (
      <div className="flex flex-wrap gap-2">
        {p.opciones?.map((o) => {
          const on = sel.includes(String(o.valor));
          return (
            <Button key={o.id} type="button" size="sm" variant={on ? "default" : "outline"}
              onClick={() => onChange(on ? sel.filter((s) => s !== String(o.valor)) : [...sel, String(o.valor)])}>
              {o.etiqueta}
            </Button>
          );
        })}
      </div>
    );
  }
  return (
    <select aria-label={`Respuesta para ${p.id}`} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      value={valor === null || valor === undefined ? "" : String(valor)}
      onChange={(e) => onChange(p.tipo === "scale_1_5" ? Number(e.target.value) : e.target.value)}>
      <option value="" disabled>Elige una opción</option>
      {p.opciones?.map((o) => <option key={o.id} value={String(o.valor)}>{p.tipo === "scale_1_5" ? `${o.valor} · ${o.etiqueta}` : o.etiqueta}</option>)}
    </select>
  );
}

function DemoDocumental() {
  const [estado, setEstado] = useState<EstadoSandboxDF>(estadoVacio);
  const [hidratado, setHidratado] = useState(false);
  const [tab, setTab] = useState("inicio");
  const [leyendo, setLeyendo] = useState(false);

  useEffect(() => { setEstado(leerSandbox()); setHidratado(true); }, []);
  const actualizar = (fn: (e: EstadoSandboxDF) => EstadoSandboxDF) =>
    setEstado((prev) => { const n = fn(prev); guardarSandbox(n); return n; });

  const respondidas = Object.keys(estado.respuestas).length;
  const pendientes = preguntasEnOrden.filter((p) => !estado.respuestas[p.id]);

  const resultado = useMemo(() => {
    if (respondidas < TOTAL) return null;
    const answers: DiagnosticAnswer[] = preguntasEnOrden.map((p) => ({
      questionId: p.id, ...(p.dimensionId ? { dimensionId: p.dimensionId } : {}),
      value: estado.respuestas[p.id]!.valor, answeredAt: estado.respuestas[p.id]!.en,
    }));
    return calcularResultado("demo-df", answers);
  }, [estado.respuestas, respondidas]);

  async function leerArchivo(file: File): Promise<Awaited<ReturnType<typeof extraerPdf>> | null> {
    setLeyendo(true);
    try {
      return await extraerPdf(new Uint8Array(await file.arrayBuffer()));
    } catch (e) {
      toast.error(mensajeErrorExtraccion(e instanceof ExtraccionError ? e.codigo : "PDF_CORRUPTO"));
      return null;
    } finally { setLeyendo(false); }
  }

  async function cargarDiagnostico(file: File) {
    const doc = await leerArchivo(file);
    if (!doc) return;
    const props = aplicarReglasG1(doc);
    actualizar((e) => ({
      ...e,
      // Propuestas anteriores quedan reemplazadas (SUPERSEDED): no se heredan de otro archivo.
      propuestas: props.map<PropuestaSandbox>((p) => ({
        preguntaId: p.preguntaId, estadoCobertura: p.estado, valorPropuesto: p.valorPropuesto, valorEditado: null,
        decision: p.estado === "NOT_SUPPORTED" ? "NEEDS_CLARIFICATION" : "PROPOSED",
        procedencia: p.cita ? { documento: file.name, sha256: doc.sha256, pagina: p.pagina!, cita: p.cita, regla: p.regla } : null,
      })),
      documentoDiagnostico: { nombre: file.name, sha256: doc.sha256, paginas: doc.paginas, fragmentos: doc.fragmentos.length, cargadoEn: ahora() },
    }));
    const r = resumenCobertura(props);
    toast.success(`Leímos ${doc.paginas} páginas: ${r.soportadas + r.parciales} preguntas con propuesta, ${r.sinSoporte} sin información.`);
  }

  function confirmar(pr: PropuestaSandbox) {
    const v = pr.valorEditado ?? pr.valorPropuesto;
    if (v === null || !pr.procedencia) return;
    actualizar((e) => ({
      ...registrarRespuesta(e, pr.preguntaId, { valor: v, origen: "documento", procedencia: pr.procedencia!, en: ahora() }, pr.valorEditado !== null ? "EDITADA_Y_CONFIRMADA" : "CONFIRMADA"),
      propuestas: e.propuestas.map((x) => (x.preguntaId === pr.preguntaId ? { ...x, decision: "CONFIRMED" } : x)),
    }));
  }
  function rechazar(pr: PropuestaSandbox) {
    actualizar((e) => ({
      ...e,
      historial: [...e.historial, { preguntaId: pr.preguntaId, accion: "RECHAZADA", anterior: e.respuestas[pr.preguntaId] ?? null, nueva: null, en: ahora() }],
      propuestas: e.propuestas.map((x) => (x.preguntaId === pr.preguntaId ? { ...x, decision: "REJECTED" } : x)),
    }));
  }
  function responderManual(id: string, v: ValorRespuesta) {
    if (Array.isArray(v) && v.length === 0) return;
    actualizar((e) => registrarRespuesta(e, id, { valor: v, origen: "manual", en: ahora() }, "MANUAL"));
  }

  async function cargarPlan(file: File) {
    const doc = await leerArchivo(file);
    if (!doc) return;
    const prioridades = importarPlan(doc.lineas);
    if (prioridades.length === 0) { toast.error("No encontramos prioridades con campos en este documento."); return; }
    const candidatos = plantillasEscenarioHero.map((h) => ({ id: h.id, titulo: h.titulo, objetivo: h.objetivo }));
    actualizar((e) => ({
      ...e,
      plan: prioridades.map<PrioridadPlanSandbox>((p) => ({
        codigo: p.codigo, titulo: p.titulo,
        vinculoLegacyId: sugerirVinculo(p.titulo, p.campos.find((c) => c.campo === "objetivo")?.valor ?? "", candidatos),
        campos: p.campos, decision: "PROPUESTA", documento: { nombre: file.name, sha256: doc.sha256 },
      })),
    }));
    toast.success(`Importamos ${prioridades.length} prioridades como propuestas para revisar.`);
  }

  const reiniciar = () => { const v = estadoVacio(); guardarSandbox(v); setEstado(v); toast.success("Demo reiniciada."); };

  if (!hidratado) return <div className="mx-auto max-w-5xl p-6 text-muted-foreground">Cargando demo…</div>;

  const cobertura = estado.propuestas.length ? {
    con: estado.propuestas.filter((p) => p.estadoCobertura !== "NOT_SUPPORTED").length,
    sin: estado.propuestas.filter((p) => p.estadoCobertura === "NOT_SUPPORTED").length,
  } : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="space-y-2">
        <Badge variant="outline">Demostración · datos ficticios · solo en este navegador</Badge>
        <h1 className="text-2xl font-semibold text-foreground">Moda Origen: diagnóstico con o sin documentos</h1>
        <p className="text-sm text-muted-foreground">
          Tienda de ropa de producción local en Cali (empresa ficticia). Puedes responder las 28 preguntas a mano o cargar un
          documento para que Pymapa proponga respuestas. Nada se guarda sin tu confirmación.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="inicio">Inicio</TabsTrigger>
          <TabsTrigger value="documento">Acelerar con documentos</TabsTrigger>
          <TabsTrigger value="preguntas">Preguntas ({respondidas}/{TOTAL})</TabsTrigger>
          <TabsTrigger value="resultado">Diagnóstico</TabsTrigger>
          <TabsTrigger value="plan">Plan de acción</TabsTrigger>
        </TabsList>

        <TabsContent value="inicio" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tu avance</CardTitle>
              <CardDescription>{respondidas} de {TOTAL} preguntas respondidas · {pendientes.length} pendientes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={(respondidas / TOTAL) * 100} />
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setTab("preguntas")}><ListChecks className="size-4" />Responder preguntas</Button>
                <Button variant="outline" onClick={() => setTab("documento")}><FileUp className="size-4" />Acelerar con documentos</Button>
                <Button variant="ghost" onClick={reiniciar}><RotateCcw className="size-4" />Empezar de cero</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documento" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Carga el expediente de la empresa (PDF)</CardTitle>
              <CardDescription>Leemos el contenido real del archivo, página por página. Cada propuesta muestra la cita exacta que la respalda.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <input type="file" accept="application/pdf,.pdf" aria-label="Cargar documento de diagnóstico" disabled={leyendo}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void cargarDiagnostico(f); e.target.value = ""; }}
                className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground" />
              {leyendo && <p className="text-sm text-muted-foreground">Leyendo el documento…</p>}
              {estado.documentoDiagnostico && cobertura && (
                <p className="text-sm" data-testid="cobertura">
                  <strong>{estado.documentoDiagnostico.nombre}</strong> · {estado.documentoDiagnostico.paginas} páginas · {estado.documentoDiagnostico.fragmentos} fragmentos leídos ·{" "}
                  <strong>{cobertura.con}</strong> preguntas con propuesta · <strong>{cobertura.sin}</strong> sin información en el documento
                </p>
              )}
            </CardContent>
          </Card>

          {estado.propuestas.map((pr) => {
            const p = obtenerPregunta(pr.preguntaId)!;
            const valor = pr.valorEditado ?? pr.valorPropuesto;
            return (
              <Card key={pr.preguntaId} data-testid={`propuesta-${pr.preguntaId}`}>
                <CardHeader className="space-y-1 pb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{pr.preguntaId}</Badge>
                    {pr.estadoCobertura === "SUPPORTED_FOR_PROPOSAL" && <Badge>Respaldada por el documento</Badge>}
                    {pr.estadoCobertura === "PARTIAL_NEEDS_REVIEW" && <Badge variant="outline">Revisar: respaldo parcial</Badge>}
                    {pr.estadoCobertura === "NOT_SUPPORTED" && <Badge variant="destructive">Sin información en el documento</Badge>}
                    {pr.decision === "CONFIRMED" && <Badge variant="outline"><Check className="size-3" />Confirmada</Badge>}
                    {pr.decision === "REJECTED" && <Badge variant="outline"><X className="size-3" />Rechazada</Badge>}
                  </div>
                  <CardTitle className="text-sm font-medium leading-snug">{p.texto}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {pr.procedencia ? (
                    <>
                      <blockquote className="border-l-2 border-primary/50 pl-3 text-muted-foreground">
                        “{pr.procedencia.cita}” <span className="whitespace-nowrap">— página {pr.procedencia.pagina}</span>
                      </blockquote>
                      <p className="text-xs text-muted-foreground">Por qué: {pr.procedencia.regla}</p>
                      <SelectorValor p={p} valor={valor} onChange={(v) => actualizar((e) => ({ ...e, propuestas: e.propuestas.map((x) => x.preguntaId === pr.preguntaId ? { ...x, valorEditado: v, decision: "PROPOSED" } : x) }))} />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => confirmar(pr)} disabled={pr.decision === "CONFIRMED"}>Confirmar</Button>
                        <Button size="sm" variant="outline" onClick={() => rechazar(pr)} disabled={pr.decision === "REJECTED"}>Rechazar</Button>
                      </div>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setTab("preguntas")}>Responder a mano</Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="preguntas" className="space-y-3">
          {preguntasEnOrden.map((p) => {
            const r = estado.respuestas[p.id];
            return (
              <Card key={p.id} data-testid={`pregunta-${p.id}`} className={r ? "" : "border-primary/40"}>
                <CardContent className="space-y-2 pt-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{p.id}</Badge>
                    {p.dimensionId && <span className="text-xs text-muted-foreground">{obtenerDimension(p.dimensionId)?.nombre}</span>}
                    {!r && <Badge variant="outline">Pendiente</Badge>}
                    {r?.origen === "documento" && <Badge variant="outline"><FileText className="size-3" />Del documento · pág. {r.procedencia?.pagina}</Badge>}
                    {r?.origen === "manual" && <Badge variant="outline">Respondida a mano</Badge>}
                  </div>
                  <p className="font-medium text-foreground">{p.texto}</p>
                  <SelectorValor p={p} valor={r?.valor} onChange={(v) => responderManual(p.id, v)} />
                  {r && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Actual: {valorTexto(p, r.valor)}</span>
                      <Button size="sm" variant="ghost" onClick={() => actualizar((e) => revertirRespuesta(e, p.id, ahora()))}>
                        <RotateCcw className="size-3" />Volver al valor anterior
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="resultado" className="space-y-4">
          {!resultado ? (
            <Card><CardContent className="pt-6 text-sm text-muted-foreground">
              Faltan {pendientes.length} preguntas para calcular el diagnóstico: {pendientes.map((p) => p.id).join(", ")}.
            </CardContent></Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Diagnóstico preliminar: {resultado.globalScore} / 100 · {resultado.globalLevel}</CardTitle>
                  <CardDescription>{resultado.globalMessage} Es un diagnóstico preliminar: las áreas para profundizar siguen abiertas.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2 sm:grid-cols-2">
                  {resultado.dimensionResults.map((d) => (
                    <div key={d.dimensionId} className="rounded-md border p-3 text-sm" data-testid={`dim-${d.dimensionId}`}>
                      <div className="font-medium">{d.nombre}</div>
                      <div className="text-muted-foreground">{d.displayedScore} · {d.level}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Áreas para profundizar</CardTitle></CardHeader>
                <CardContent className="text-sm">{areasParaProfundizar(resultado.dimensionResults).map((id) => obtenerDimension(id)?.nombre).join(" · ")}</CardContent>
              </Card>
            </>
          )}
          <Card>
            <CardHeader><CardTitle className="text-base">Recomendaciones del caso</CardTitle><CardDescription>Propuestas para trabajar; ninguna está iniciada.</CardDescription></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {plantillasEscenarioHero.map((h) => (
                <div key={h.id} className="rounded-md border p-3"><div className="font-medium">{h.titulo}</div><div className="text-muted-foreground">{h.objetivo}</div><Badge variant="outline" className="mt-2">Sin iniciar</Badge></div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plan" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Completar el plan con un documento (PDF)</CardTitle>
              <CardDescription>Proponemos actividades, responsables, plazos e indicadores con su cita. Todo queda como propuesta hasta que lo confirmes; nada se marca como ejecutado.</CardDescription>
            </CardHeader>
            <CardContent>
              <input type="file" accept="application/pdf,.pdf" aria-label="Cargar plan de mejora" disabled={leyendo}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void cargarPlan(f); e.target.value = ""; }}
                className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground" />
            </CardContent>
          </Card>
          {estado.plan.map((pr, i) => (
            <Card key={pr.codigo} data-testid={`plan-${pr.codigo}`}>
              <CardHeader className="space-y-2 pb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{pr.codigo}</Badge>
                  <Badge variant="outline">{pr.decision === "CONFIRMADA_COMO_PLAN" ? "En el plan · sin iniciar" : pr.decision === "RECHAZADA" ? "Rechazada" : "Propuesta"}</Badge>
                </div>
                <CardTitle className="text-sm">{pr.titulo}</CardTitle>
                <label className="block text-xs text-muted-foreground">Prioridad del diagnóstico a la que corresponde
                  <select className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={pr.vinculoLegacyId ?? ""}
                    onChange={(e) => actualizar((s) => ({ ...s, plan: s.plan.map((x, j) => j === i ? { ...x, vinculoLegacyId: e.target.value || null } : x) }))}>
                    <option value="">Sin vincular</option>
                    {plantillasEscenarioHero.map((h) => <option key={h.id} value={h.id}>{h.titulo}</option>)}
                  </select>
                </label>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {pr.campos.map((c, k) => (
                  <div key={k} className="grid gap-1 sm:grid-cols-[10rem_1fr]">
                    <span className="text-xs font-medium text-muted-foreground">{c.etiqueta} · pág. {c.pagina}</span>
                    <input aria-label={`${pr.codigo} ${c.etiqueta}`} className="rounded-md border border-input bg-background px-2 py-1 text-sm" value={c.valor}
                      disabled={pr.decision !== "PROPUESTA"}
                      onChange={(e) => actualizar((s) => ({ ...s, plan: s.plan.map((x, j) => j === i ? { ...x, campos: x.campos.map((y, m) => m === k ? { ...y, valor: e.target.value } : y) } : x) }))} />
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">Los plazos son relativos a la fecha de aprobación; no se convierten en fechas hasta que definas el inicio.</p>
                {pr.decision === "PROPUESTA" && (
                  <div className="flex gap-2">
                    <Button size="sm" disabled={!pr.vinculoLegacyId} onClick={() => actualizar((s) => ({ ...s, plan: s.plan.map((x, j) => j === i ? { ...x, decision: "CONFIRMADA_COMO_PLAN", confirmadaEn: ahora() } : x) }))}>
                      <ClipboardList className="size-4" />Agregar al plan
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => actualizar((s) => ({ ...s, plan: s.plan.map((x, j) => j === i ? { ...x, decision: "RECHAZADA" } : x) }))}>Descartar</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground">
        Esta demostración no usa cuentas ni datos reales. <Link to="/" className="underline">Volver al inicio</Link>
      </p>
    </div>
  );
}
