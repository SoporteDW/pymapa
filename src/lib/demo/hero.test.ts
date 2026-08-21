/**
 * Macroentrega 3 · pruebas del ciclo completo B7 + B8 + B9 y del escenario Hero
 * final. Todo se prueba sobre funciones puras (sin almacenamiento ni interfaz).
 */

import { describe, expect, it } from "vitest";
import {
  HERO_ACTIVIDAD_CON_AJUSTES,
  HERO_ACTIVIDAD_VALIDADA,
  HERO_APOYO_ID,
  HERO_DELEGACION_ID,
  HERO_SEGUIMIENTO,
  HERO_TERCERO,
  construirSembradoHero,
} from "./sembrado-hero";
import { registroVacio as workspaceVacio } from "@/lib/workspace/repositorio";
import { registroVacio as evidenciasVacio } from "@/lib/evidencias/repositorio";
import { registroVacio as seguimientoVacio } from "@/lib/seguimiento/repositorio";
import { registroVacio as delegacionVacio } from "@/lib/delegacion/repositorio";
import { registroVacio as apoyoVacio } from "@/lib/apoyo-humano/repositorio";
import {
  ajustesSolicitados,
  asegurarActividad,
  cambiarEstado,
  marcarVerificacion,
  obtenerActividad,
  reabrirActividad,
  registrarEntrega,
} from "@/lib/workspace/servicio";
import { adjuntarEvidenciasDeEntrega } from "@/lib/workspace/puente-evidencias";
import { plantillasEscenarioHero } from "@/lib/workspace/escenario-hero";
import {
  asegurarSeguimiento,
  evaluarSeguimiento,
  proximoHitoPendiente,
  registrarDerivacion,
  registrarEvaluacion,
  registrarMedicion,
} from "@/lib/seguimiento/servicio";
import { plantillaComplementaria, motivoReapertura } from "@/lib/seguimiento/derivaciones";
import {
  delegar,
  marcarIncorporado,
  marcarRecibido,
  pendientesDeTerceros,
} from "@/lib/delegacion/servicio";
import { evaluarApoyo } from "@/lib/apoyo-humano/reglas";
import {
  reservarSesion,
  registrarRecomendacion,
  registrarSesionRealizada,
} from "@/lib/apoyo-humano/servicio";
import { especialistasDe } from "@/lib/apoyo-humano/especialistas";
import {
  pendientesDelRecorrido,
  rutaSoportada,
  siguientePasoOrquestado,
  type ContextoRecorrido,
} from "@/lib/siguiente-paso/orquestador";
import { sincronizarRoadmapConWorkspace, estadoUnificado } from "@/lib/sincronizacion/estado-actividad";
import { sesionDemo, crearSesionVacia } from "@/data/mocks/sesion";
import type { SeguimientoActividad } from "@/lib/seguimiento/tipos";

const EMPRESA = { empresaId: "PYME-04", empresaNombre: "Moda Origen" };
const plantillaValidada = plantillasEscenarioHero[0]!;
const plantillaAjustes = plantillasEscenarioHero[1]!;

function actividadValidada() {
  let registro = workspaceVacio(EMPRESA.empresaId, EMPRESA.empresaNombre);
  const { registro: conActividad, actividad } = asegurarActividad(registro, plantillaValidada);
  registro = cambiarEstado(conActividad, actividad.id, "en_ejecucion");
  for (const v of actividad.profundizacion?.verificaciones ?? []) {
    registro = marcarVerificacion(registro, actividad.id, v.id, "cumple");
  }
  const { registro: entregado, entrega } = registrarEntrega(registro, actividad.id, {
    nota: "Auditamos el checkout completo en móvil con el equipo y documentamos los hallazgos priorizados.",
    criteriosDeclarados: actividad.entregable.criteriosValidacion,
    archivos: [
      { nombre: "informe.pdf", tipoMime: "application/pdf", tamañoBytes: 2048, ubicacion: null },
    ],
  });
  return { registro: entregado, actividad: obtenerActividad(entregado, actividad.id)!, entrega: entrega! };
}

function seguimientoConMedicion(valor: number): SeguimientoActividad {
  const { actividad } = actividadValidada();
  const { registro, seguimiento } = asegurarSeguimiento(
    seguimientoVacio(EMPRESA.empresaId, EMPRESA.empresaNombre),
    { actividad, empresaId: EMPRESA.empresaId, lineaBase: 72, meta: 55 }
  );
  const medido = registrarMedicion(registro, seguimiento!.id, "d30", { valor });
  return medido.seguimiento!;
}

function contexto(parcial: Partial<ContextoRecorrido> = {}): ContextoRecorrido {
  return {
    sesion: sesionDemo,
    necesidades: [],
    actividades: [],
    seguimientos: [],
    delegaciones: [],
    apoyos: [],
    ...parcial,
  };
}

describe("Deuda 0.1 · entregable → evidencia", () => {
  it("convierte el entregable validado en evidencia de la empresa con su cadena de trazabilidad", () => {
    const { actividad, entrega } = actividadValidada();
    const { registro, evidenciaIds } = adjuntarEvidenciasDeEntrega(
      evidenciasVacio(EMPRESA.empresaId, EMPRESA.empresaNombre),
      actividad,
      entrega
    );
    expect(evidenciaIds).toHaveLength(1);
    const evidencia = registro.evidencias[0]!;
    expect(evidencia.origen).toBe("entrega_workspace");
    expect(evidencia.vinculo.actividadIds).toContain(actividad.id);
    expect(evidencia.vinculo.revisionId).toBe(entrega.revision.id);
    expect(evidencia.analisis?.simulado).toBe(true);
  });

  it("no duplica la evidencia cuando la misma entrega se procesa dos veces", () => {
    const { actividad, entrega } = actividadValidada();
    const primera = adjuntarEvidenciasDeEntrega(
      evidenciasVacio(EMPRESA.empresaId, EMPRESA.empresaNombre),
      actividad,
      entrega
    );
    const segunda = adjuntarEvidenciasDeEntrega(primera.registro, actividad, entrega);
    expect(segunda.registro.evidencias).toHaveLength(1);
  });
});

describe("Deuda 0.2 · sincronización Workspace / Plan / Roadmap", () => {
  const roadmapBase = {
    id: "rm-1",
    diagnosisId: "diag-1",
    empresaId: EMPRESA.empresaId,
    fechaCreacion: new Date().toISOString(),
    fechaActualizacion: new Date().toISOString(),
    acciones: [
      {
        id: "acc-1",
        fichaAccionId: plantillaValidada.id,
        estado: "PENDIENTE" as const,
        avance: 0,
        actualizadaEn: new Date().toISOString(),
      },
    ],
    historial: [],
  };

  it("proyecta la validación del Workspace sobre el Roadmap", () => {
    const { actividad } = actividadValidada();
    // @ts-expect-error roadmap mínimo suficiente para la proyección de estado
    const { roadmap, cambios } = sincronizarRoadmapConWorkspace(roadmapBase, [actividad]);
    expect(cambios).toHaveLength(1);
    expect(roadmap.acciones[0]!.estado).toBe("COMPLETADA");
    expect(roadmap.acciones[0]!.avance).toBe(100);
  });

  it("no permite estados contradictorios entre Plan y Workspace", () => {
    const { actividad } = actividadValidada();
    expect(estadoUnificado("PENDIENTE", actividad)).toBe("COMPLETADA");
    expect(estadoUnificado("DESCARTADA", actividad)).toBe("DESCARTADA");
  });
});

describe("B7 · seguimiento de una actividad validada", () => {
  it("solo abre seguimiento cuando la actividad está validada", () => {
    const pendiente = asegurarActividad(
      workspaceVacio(EMPRESA.empresaId, EMPRESA.empresaNombre),
      plantillaValidada
    ).actividad;
    const sinValidar = asegurarSeguimiento(
      seguimientoVacio(EMPRESA.empresaId, EMPRESA.empresaNombre),
      { actividad: pendiente, empresaId: EMPRESA.empresaId }
    );
    expect(sinValidar.seguimiento).toBeNull();

    const { actividad } = actividadValidada();
    const conValidacion = asegurarSeguimiento(
      seguimientoVacio(EMPRESA.empresaId, EMPRESA.empresaNombre),
      { actividad, empresaId: EMPRESA.empresaId }
    );
    expect(conValidacion.seguimiento?.actividadId).toBe(actividad.id);
    expect(conValidacion.seguimiento?.origen.entregaId).not.toBeNull();
  });

  it("parametriza los hitos 30 / 60 / 90 con sus solicitudes", () => {
    const { actividad } = actividadValidada();
    const { seguimiento } = asegurarSeguimiento(
      seguimientoVacio(EMPRESA.empresaId, EMPRESA.empresaNombre),
      { actividad, empresaId: EMPRESA.empresaId }
    );
    expect(seguimiento!.hitos.map((h) => h.id)).toEqual(["d30", "d60", "d90"]);
    expect(seguimiento!.hitos.every((h) => h.solicitudes.length > 0)).toBe(true);

    const soloDos = asegurarSeguimiento(
      seguimientoVacio(EMPRESA.empresaId, EMPRESA.empresaNombre),
      { actividad, empresaId: EMPRESA.empresaId, hitos: ["d30", "d90"] }
    );
    expect(soloDos.seguimiento!.hitos).toHaveLength(2);
  });

  it("registra el indicador y deja el hito medido", () => {
    const seguimiento = seguimientoConMedicion(64);
    expect(seguimiento.hitos[0]!.medicion?.valor).toBe(64);
    expect(seguimiento.estado).toBe("en_medicion");
    expect(proximoHitoPendiente(seguimiento)?.id).toBe("d60");
  });

  it("concluye Mejoró, Sin cambio, Empeoró e Información insuficiente", () => {
    expect(evaluarSeguimiento(seguimientoConMedicion(60)).resultado).toBe("mejoro");
    expect(evaluarSeguimiento(seguimientoConMedicion(71)).resultado).toBe("sin_cambio");
    expect(evaluarSeguimiento(seguimientoConMedicion(80)).resultado).toBe("empeoro");
    const sinMedicion = seguimientoConMedicion(64);
    const vacio: SeguimientoActividad = {
      ...sinMedicion,
      hitos: sinMedicion.hitos.map((h) => ({ ...h, medicion: null })),
    };
    expect(evaluarSeguimiento(vacio).resultado).toBe("insuficiente");
  });

  it("acompaña cada conclusión con su decisión y su explicación", () => {
    expect(evaluarSeguimiento(seguimientoConMedicion(50)).decision).toBe("validar_impacto");
    expect(evaluarSeguimiento(seguimientoConMedicion(64)).decision).toBe(
      "actividad_complementaria"
    );
    expect(evaluarSeguimiento(seguimientoConMedicion(71)).decision).toBe("reabrir_actividad");
    expect(evaluarSeguimiento(seguimientoConMedicion(80)).decision).toBe("apoyo_especializado");
    expect(evaluarSeguimiento(seguimientoConMedicion(64)).porQue.length).toBeGreaterThan(0);
    expect(evaluarSeguimiento(seguimientoConMedicion(64)).simulada).toBe(true);
  });

  it("reabre la actividad validada dejando constancia del motivo", () => {
    const { registro, actividad } = actividadValidada();
    const seguimiento = seguimientoConMedicion(71);
    const evaluado = registrarEvaluacion(
      registrarMedicion(
        asegurarSeguimiento(seguimientoVacio(EMPRESA.empresaId, EMPRESA.empresaNombre), {
          actividad,
          empresaId: EMPRESA.empresaId,
          lineaBase: 72,
          meta: 55,
        }).registro,
        seguimiento.id,
        "d30",
        { valor: 71 }
      ).registro,
      seguimiento.id
    );
    expect(evaluado.evaluacion?.decision).toBe("reabrir_actividad");

    const reabierto = reabrirActividad(
      registro,
      actividad.id,
      motivoReapertura({ ...seguimiento, evaluacion: evaluado.evaluacion }),
      seguimiento.id
    );
    const final = obtenerActividad(reabierto, actividad.id)!;
    expect(final.estado).toBe("en_ejecucion");
    expect(final.reaperturas).toHaveLength(1);
    expect(final.reaperturas![0]!.seguimientoId).toBe(seguimiento.id);
  });

  it("propone la siguiente acción como actividad complementaria trazable", () => {
    const seguimiento = seguimientoConMedicion(64);
    const evaluado = registrarEvaluacion(
      { ...seguimientoVacio(EMPRESA.empresaId, EMPRESA.empresaNombre), seguimientos: [seguimiento] },
      seguimiento.id
    );
    const conEvaluacion = { ...seguimiento, evaluacion: evaluado.evaluacion };
    const plantilla = plantillaComplementaria(conEvaluacion);
    expect(plantilla.origen.tipo).toBe("derivada_seguimiento");
    expect(plantilla.origen.referencias).toContain(seguimiento.indicador.id);

    const conDerivacion = registrarDerivacion(
      evaluado.registro,
      seguimiento.id,
      "actividad_complementaria",
      plantilla.id
    );
    expect(conDerivacion.seguimientos[0]!.derivaciones).toHaveLength(1);
  });
});

describe("B8 · delegación a un tercero", () => {
  const entrada = {
    empresaId: EMPRESA.empresaId,
    empresaNombre: EMPRESA.empresaNombre,
    origen: {
      tipo: "actividad" as const,
      referenciaId: plantillaAjustes.id,
      referenciaTitulo: plantillaAjustes.titulo,
      dominioId: "D03",
      dominioNombre: plantillaAjustes.origen.dominioNombre,
      rutaRetorno: `/plan-de-accion/workspace/${plantillaAjustes.id}`,
    },
    nombre: HERO_TERCERO.nombre,
    correo: HERO_TERCERO.correo,
    tarea: HERO_TERCERO.tarea,
  };

  it("registra la delegación con correo preparado y simulado", () => {
    const { delegacion } = delegar(delegacionVacio(EMPRESA.empresaId, EMPRESA.empresaNombre), entrada);
    expect(delegacion?.estado).toBe("pendiente_tercero");
    expect(delegacion?.correoSimulado).toBe(true);
    expect(delegacion?.mensajePreparado).toContain(HERO_TERCERO.nombre);
    expect(delegacion?.area.length).toBeGreaterThan(0);
  });

  it("recorre Pendiente tercero → Recibido → Incorporado", () => {
    const { registro, delegacion } = delegar(
      delegacionVacio(EMPRESA.empresaId, EMPRESA.empresaNombre),
      entrada
    );
    const recibido = marcarRecibido(registro, delegacion!.id, "Tarifas por ciudad adjuntas (DEMO).");
    expect(recibido.delegaciones[0]!.estado).toBe("recibido");
    expect(pendientesDeTerceros(recibido)).toHaveLength(1);

    const incorporado = marcarIncorporado(recibido, delegacion!.id);
    expect(incorporado.delegaciones[0]!.estado).toBe("incorporado");
    expect(incorporado.delegaciones[0]!.incorporadaEn).not.toBeNull();
    expect(pendientesDeTerceros(incorporado)).toHaveLength(0);
  });

  it("no incorpora una delegación que el tercero todavía no respondió", () => {
    const { registro, delegacion } = delegar(
      delegacionVacio(EMPRESA.empresaId, EMPRESA.empresaNombre),
      entrada
    );
    expect(marcarIncorporado(registro, delegacion!.id).delegaciones[0]!.estado).toBe(
      "pendiente_tercero"
    );
  });
});

describe("B9 · apoyo humano especializado", () => {
  const origen = {
    tipo: "actividad" as const,
    referenciaId: plantillaAjustes.id,
    referenciaTitulo: plantillaAjustes.titulo,
    dominioId: "D03",
    dominioNombre: plantillaAjustes.origen.dominioNombre,
    rutaRetorno: `/plan-de-accion/workspace/${plantillaAjustes.id}`,
  };

  it("recomienda apoyo solo ante una condición observable", () => {
    expect(evaluarApoyo({ ajustesSolicitados: 1 })).toHaveLength(0);
    const [sugerencia] = evaluarApoyo({ ajustesSolicitados: 2 });
    expect(sugerencia?.reglaId).toBe("AP-R01");
    expect(sugerencia?.especialidad).toBe("ecommerce_cro");
    expect(sugerencia!.objetivos.length).toBeGreaterThan(0);
    expect(evaluarApoyo({ resultadoSeguimiento: "empeoro" })[0]?.reglaId).toBe("AP-R02");
  });

  it("reserva la sesión demostrativa y registra su conclusión y retorno", () => {
    const sugerencia = evaluarApoyo({ ajustesSolicitados: 2 })[0]!;
    const { registro, recomendacion } = registrarRecomendacion(
      apoyoVacio(EMPRESA.empresaId, EMPRESA.empresaNombre),
      sugerencia,
      origen,
      EMPRESA.empresaId
    );
    expect(recomendacion.estado).toBe("sugerida");

    const especialista = especialistasDe(sugerencia.especialidad)[0]!;
    const reservado = reservarSesion(registro, recomendacion.id, {
      especialistaId: especialista.id,
      especialistaNombre: especialista.nombre,
      fecha: "2026-09-02",
      hora: "10:00",
    });
    expect(reservado.reserva?.demostrativa).toBe(true);
    expect(reservado.registro.recomendaciones[0]!.estado).toBe("reservada");

    const realizada = registrarSesionRealizada(
      reservado.registro,
      recomendacion.id,
      "Se acordó mostrar el costo total del envío antes del pago.",
      "Volver al workspace del carrito y entregar de nuevo con los criterios cubiertos."
    );
    expect(realizada.resultado?.demostrativa).toBe(true);
    expect(realizada.registro.recomendaciones[0]!.estado).toBe("realizada");
    expect(realizada.registro.recomendaciones[0]!.origen.rutaRetorno).toBe(origen.rutaRetorno);
    expect(rutaSoportada(origen.rutaRetorno)).toBe(true);
  });

  it("no genera dos recomendaciones abiertas por la misma condición", () => {
    const sugerencia = evaluarApoyo({ ajustesSolicitados: 2 })[0]!;
    const primera = registrarRecomendacion(
      apoyoVacio(EMPRESA.empresaId, EMPRESA.empresaNombre),
      sugerencia,
      origen,
      EMPRESA.empresaId
    );
    const segunda = registrarRecomendacion(primera.registro, sugerencia, origen, EMPRESA.empresaId);
    expect(segunda.registro.recomendaciones).toHaveLength(1);
  });
});

describe("Home orquestador", () => {
  it("pide primero el perfil en un recorrido nuevo", () => {
    const paso = siguientePasoOrquestado(contexto({ sesion: crearSesionVacia() }));
    expect(paso.tipo).toBe("completar_perfil");
    expect(paso.ruta).toBe("/perfil");
  });

  it("prioriza corregir el entregable sobre continuar otras actividades", () => {
    const sembrado = construirSembradoHero(EMPRESA);
    const paso = siguientePasoOrquestado(contexto({ actividades: sembrado.workspace.actividades }));
    expect(paso.tipo).toBe("corregir_entregable");
    expect(paso.ruta).toBe(`/plan-de-accion/workspace/${HERO_ACTIVIDAD_CON_AJUSTES}`);
  });

  it("cambia al seguimiento cuando el entregable ya no requiere ajustes", () => {
    const sembrado = construirSembradoHero(EMPRESA);
    const actividades = sembrado.workspace.actividades.filter(
      (a) => a.estado === "validado"
    );
    const paso = siguientePasoOrquestado(
      contexto({ actividades, seguimientos: sembrado.seguimiento.seguimientos })
    );
    expect(paso.tipo).toBe("realizar_seguimiento");
    expect(paso.ruta).toBe(`/seguimiento/${HERO_ACTIVIDAD_VALIDADA}`);
  });

  it("propone atender la delegación y luego el apoyo cuando no hay nada más urgente", () => {
    const sembrado = construirSembradoHero(EMPRESA);
    const pendientes = pendientesDelRecorrido(
      contexto({
        delegaciones: sembrado.delegacion.delegaciones,
        apoyos: sembrado.apoyo.recomendaciones,
      })
    );
    expect(pendientes.map((p) => p.tipo)).toEqual([
      "atender_delegacion",
      "revisar_apoyo",
      "iniciar_actividad",
    ]);
  });

  it("nunca propone una ruta inexistente", () => {
    const sembrado = construirSembradoHero(EMPRESA);
    const pendientes = pendientesDelRecorrido(
      contexto({
        actividades: sembrado.workspace.actividades,
        seguimientos: sembrado.seguimiento.seguimientos,
        delegaciones: sembrado.delegacion.delegaciones,
        apoyos: sembrado.apoyo.recomendaciones,
      })
    );
    expect(pendientes.length).toBeGreaterThan(0);
    expect(pendientes.every((p) => rutaSoportada(p.ruta))).toBe(true);
    expect(rutaSoportada("/inventado")).toBe(false);
  });
});

describe("Escenario Hero final completo", () => {
  const sembrado = construirSembradoHero(EMPRESA);

  it("amplía el escenario existente sin crear otro", () => {
    expect(sembrado.workspace.actividades.map((a) => a.id)).toEqual([
      HERO_ACTIVIDAD_VALIDADA,
      HERO_ACTIVIDAD_CON_AJUSTES,
    ]);
    expect(plantillasEscenarioHero).toHaveLength(2);
  });

  it("deja la auditoría del checkout validada con su evidencia", () => {
    const validada = sembrado.workspace.actividades.find((a) => a.id === HERO_ACTIVIDAD_VALIDADA)!;
    expect(validada.estado).toBe("validado");
    expect(validada.historial[0]!.revision.veredicto).toBe("validado");
    expect(validada.historial[0]!.evidenciaIds).toHaveLength(1);
    expect(sembrado.evidencias.evidencias).toHaveLength(1);
  });

  it("precarga el seguimiento con indicador, línea base, meta, medición, conclusión y decisión", () => {
    const seguimiento = sembrado.seguimiento.seguimientos[0]!;
    expect(seguimiento.indicador.id).toBe("IND-EC-CHECKOUT");
    expect(seguimiento.indicador.lineaBase).toBe(HERO_SEGUIMIENTO.lineaBase);
    expect(seguimiento.indicador.meta).toBe(HERO_SEGUIMIENTO.meta);
    expect(seguimiento.hitos[0]!.medicion?.valor).toBe(HERO_SEGUIMIENTO.medicionD30);
    expect(seguimiento.evaluacion?.resultado).toBe("mejoro");
    expect(seguimiento.evaluacion?.decision).toBe("actividad_complementaria");
  });

  it("precarga la condición que justifica el apoyo especializado", () => {
    const conAjustes = sembrado.workspace.actividades.find(
      (a) => a.id === HERO_ACTIVIDAD_CON_AJUSTES
    )!;
    expect(conAjustes.estado).toBe("requiere_ajustes");
    expect(ajustesSolicitados(conAjustes)).toBe(2);
    const apoyo = sembrado.apoyo.recomendaciones[0]!;
    expect(apoyo.id).toBe(HERO_APOYO_ID);
    expect(apoyo.reglaId).toBe("AP-R01");
    expect(apoyo.estado).toBe("sugerida");
    expect(apoyo.origen.rutaRetorno).toBe(
      `/plan-de-accion/workspace/${HERO_ACTIVIDAD_CON_AJUSTES}`
    );
  });

  it("precarga la delegación con datos ficticios identificados como DEMO", () => {
    const delegacion = sembrado.delegacion.delegaciones[0]!;
    expect(delegacion.id).toBe(HERO_DELEGACION_ID);
    expect(delegacion.nombre).toContain("DEMO");
    expect(delegacion.correo).toContain("empresa-demo");
    expect(delegacion.estado).toBe("pendiente_tercero");
    expect(delegacion.correoSimulado).toBe(true);
  });

  it("marca todo el contenido del escenario como simulado", () => {
    expect(
      sembrado.workspace.actividades.every((a) =>
        a.historial.every((e) => e.revision.simulada === true)
      )
    ).toBe(true);
    expect(sembrado.seguimiento.seguimientos[0]!.evaluacion?.simulada).toBe(true);
    expect(sembrado.evidencias.evidencias[0]!.analisis?.simulado).toBe(true);
    expect(sembrado.workspace.actividades.every((a) => a.origen.tipo === "escenario_demo")).toBe(
      true
    );
  });

  it("aísla la información demostrativa en la empresa del escenario", () => {
    for (const registro of [
      sembrado.workspace,
      sembrado.evidencias,
      sembrado.seguimiento,
      sembrado.delegacion,
      sembrado.apoyo,
    ]) {
      expect(registro.empresaId).toBe(EMPRESA.empresaId);
    }
    const otra = construirSembradoHero({ empresaId: "PYME-01", empresaNombre: "Panadería" });
    expect(otra.workspace.empresaId).toBe("PYME-01");
    expect(sembrado.workspace.empresaId).toBe(EMPRESA.empresaId);
  });

  it("es reproducible: dos sembrados equivalentes describen el mismo escenario", () => {
    const otro = construirSembradoHero(EMPRESA);
    expect(otro.workspace.actividades.map((a) => a.estado)).toEqual(
      sembrado.workspace.actividades.map((a) => a.estado)
    );
    expect(otro.seguimiento.seguimientos[0]!.evaluacion?.resultado).toBe(
      sembrado.seguimiento.seguimientos[0]!.evaluacion?.resultado
    );
    expect(otro.apoyo.recomendaciones[0]!.reglaId).toBe(
      sembrado.apoyo.recomendaciones[0]!.reglaId
    );
  });
});

describe("Regresión del recorrido existente", () => {
  it("conserva las cinco etapas del recorrido en los pasos propuestos", () => {
    const sembrado = construirSembradoHero(EMPRESA);
    const pendientes = pendientesDelRecorrido(
      contexto({
        sesion: crearSesionVacia(),
        actividades: sembrado.workspace.actividades,
        seguimientos: sembrado.seguimiento.seguimientos,
      })
    );
    expect(pendientes[0]!.etapa).toBe("preparar");
    expect(pendientes.every((p) => p.porQue.length > 0)).toBe(true);
  });

  it("sin pendientes propone medir el avance en indicadores", () => {
    const sembrado = construirSembradoHero(EMPRESA);
    const validadas = sembrado.workspace.actividades.filter((a) => a.estado === "validado");
    const paso = siguientePasoOrquestado(contexto({ actividades: validadas }));
    expect(paso.tipo).toBe("medir_avance");
    expect(paso.ruta).toBe("/dashboard");
  });
});
