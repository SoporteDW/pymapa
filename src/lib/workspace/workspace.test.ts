import { describe, expect, it } from "vitest";
import { totalVerificaciones, gruposChecklist, seleccionarVerificaciones } from "@/lib/kb/ecommerce/checklist";
import { sugerirProfundizaciones } from "@/lib/kb/ecommerce/profundizacion";
import { verificacionesEsperadas } from "@/lib/dominios/registro";
import { evaluarCierre } from "@/lib/suficiencia/cierre";
import type { ResultadoSuficiencia } from "@/lib/suficiencia/tipos";
import { registroVacio } from "./repositorio";
import { exigeArchivo } from "./evidencia";
import {
  asegurarActividad,
  borradorDe,
  cambiarEstado,
  guardarBorrador,
  marcarPaso,
  marcarVerificacion,
  obtenerActividad,
  registrarEntrega,
} from "./servicio";
import { plantillasEscenarioHero } from "./escenario-hero";
import { puedeEntregar, transicionPermitida } from "./estados";

const plantilla = plantillasEscenarioHero[0]!;

function registroConHero() {
  return asegurarActividad(registroVacio("empresa-test", "Empresa de prueba"), plantilla);
}

describe("B6 · checklist experto CRO/UX", () => {
  it("incorpora las 304 verificaciones en 8 grupos", () => {
    expect(totalVerificaciones()).toBe(304);
    expect(gruposChecklist()).toHaveLength(8);
    expect(verificacionesEsperadas("INS-EC-CHECKLIST-304")).toBe(304);
  });

  it("profundiza de forma selectiva y determinista", () => {
    const seleccion = seleccionarVerificaciones({ grupoId: "checkout", maximo: 5, impactoMinimo: 3 });
    expect(seleccion).toHaveLength(5);
    expect(seleccion.every((v) => (v.impacto ?? 0) >= 3)).toBe(true);
    expect(seleccionarVerificaciones({ grupoId: "checkout", maximo: 5, impactoMinimo: 3 })).toEqual(
      seleccion
    );
  });

  it("activa el grupo pertinente según las señales del diagnóstico", () => {
    const [profundizacion] = sugerirProfundizaciones({
      senales: ["Abandono en el checkout de la tienda"],
      maximoProfundizaciones: 1,
    });
    expect(profundizacion?.grupoId).toBe("checkout");
    expect(profundizacion!.verificaciones.length).toBeLessThan(profundizacion!.totalGrupo);
  });
});

describe("B4 · workspace de ejecución", () => {
  it("abre el workspace de una actividad existente sin duplicarla", () => {
    const primera = registroConHero();
    const segunda = asegurarActividad(primera.registro, plantilla);
    expect(segunda.registro.actividades).toHaveLength(1);
    expect(segunda.actividad.id).toBe(plantilla.id);
  });

  it("asigna instrumento, entregable y profundización", () => {
    const { actividad } = registroConHero();
    expect(actividad.instrumentoId).toBe("INS-EJE-AUDITORIA-CRO");
    expect(actividad.entregable.criteriosValidacion.length).toBeGreaterThan(0);
    expect(actividad.profundizacion?.grupoId).toBe("checkout");
    expect(actividad.estado).toBe("pendiente");
  });

  it("pasa a ejecución al registrar el primer paso", () => {
    const { registro } = registroConHero();
    const siguiente = marcarPaso(registro, plantilla.id, 1, true);
    expect(obtenerActividad(siguiente, plantilla.id)?.estado).toBe("en_ejecucion");
  });
});

describe("B5 · ciclo de entrega y validación", () => {
  it("respeta las transiciones del ciclo", () => {
    expect(transicionPermitida("pendiente", "en_ejecucion")).toBe(true);
    expect(transicionPermitida("pendiente", "validado")).toBe(false);
    expect(puedeEntregar("requiere_ajustes")).toBe(true);
    expect(puedeEntregar("validado")).toBe(false);
  });

  it("devuelve ajustes concretos cuando la entrega está incompleta", () => {
    const { registro } = registroConHero();
    const enEjecucion = cambiarEstado(registro, plantilla.id, "en_ejecucion");
    const { registro: conEntrega, entrega } = registrarEntrega(enEjecucion, plantilla.id, {
      nota: "Listo",
      criteriosDeclarados: [],
      archivos: [],
    });
    expect(entrega?.revision.veredicto).toBe("requiere_ajustes");
    expect(entrega?.revision.simulada).toBe(true);
    expect(entrega!.revision.ajustesSolicitados.length).toBeGreaterThan(0);
    expect(obtenerActividad(conEntrega, plantilla.id)?.estado).toBe("requiere_ajustes");
  });

  it("valida cuando se cumplen todos los criterios y queda historial", () => {
    const { registro, actividad } = registroConHero();
    let actual = cambiarEstado(registro, plantilla.id, "en_ejecucion");
    for (const verificacion of actividad.profundizacion!.verificaciones) {
      const conMarca = obtenerActividad(actual, plantilla.id)!;
      actual = {
        ...actual,
        actividades: actual.actividades.map((a) =>
          a.id === conMarca.id
            ? {
                ...a,
                profundizacion: a.profundizacion && {
                  ...a.profundizacion,
                  verificaciones: a.profundizacion.verificaciones.map((v) =>
                    v.id === verificacion.id ? { ...v, estado: "cumple" as const } : v
                  ),
                },
              }
            : a
        ),
      };
    }

    const { registro: conEntrega, entrega } = registrarEntrega(actual, plantilla.id, {
      nota: "Auditamos el checkout en móvil con el equipo comercial y documentamos los hallazgos priorizados.",
      criteriosDeclarados: actividad.entregable.criteriosValidacion,
      archivos: [
        { nombre: "informe.pdf", tipoMime: "application/pdf", tamañoBytes: 1024, ubicacion: null },
      ],
    });

    expect(entrega?.revision.veredicto).toBe("validado");
    const final = obtenerActividad(conEntrega, plantilla.id)!;
    expect(final.estado).toBe("validado");
    expect(final.historial).toHaveLength(1);
  });
});

describe("Gate de suficiencia · preliminar vs cerrado", () => {
  const base: ResultadoSuficiencia = {
    catalogoId: "cat",
    catalogoVersion: "1.0.0",
    evaluadoEn: new Date().toISOString(),
    estadoGeneral: "suficiente",
    mensajeGeneral: "",
    dominios: [],
    necesidadesPendientes: [],
    puedeCerrar: true,
  };

  it("marca el diagnóstico como cerrado cuando no falta información", () => {
    expect(evaluarCierre(base).estado).toBe("cerrado");
  });

  it("marca resultado preliminar cuando falta evidencia", () => {
    const cierre = evaluarCierre({
      ...base,
      estadoGeneral: "evidencia_pendiente",
      puedeCerrar: false,
      necesidadesPendientes: [
        {
          reglaId: "R1",
          dominioId: "D01",
          tipo: "evidencia",
          referenciaId: "SOL-1",
          titulo: "Política de datos",
          porQue: "",
          preguntaIds: [],
          resuelta: false,
        },
      ],
    });
    expect(cierre.esPreliminar).toBe(true);
    expect(cierre.faltantes).toHaveLength(1);
  });
});

describe("P0 · evidencia opcional y persistencia del borrador", () => {
  it("P0.2 · valida sin archivo cuando el entregable no exige documento", () => {
    let { registro, actividad } = registroConHero();
    expect(exigeArchivo(actividad.entregable)).toBe(false);
    registro = cambiarEstado(registro, actividad.id, "en_ejecucion");
    for (const v of actividad.profundizacion?.verificaciones ?? []) {
      registro = marcarVerificacion(registro, actividad.id, v.id, "cumple");
    }
    const { entrega } = registrarEntrega(registro, actividad.id, {
      nota: "Auditamos el checkout completo con el equipo y registramos cada punto de fricción encontrado.",
      criteriosDeclarados: actividad.entregable.criteriosValidacion,
      archivos: [],
    });
    expect(entrega?.revision.veredicto).toBe("validado");
  });

  it("P0.2 · exige archivo solo cuando el entregable lo declara", () => {
    expect(exigeArchivo({ formato: "documento" })).toBe(false);
    expect(exigeArchivo({ formato: "captura" })).toBe(true);
    expect(exigeArchivo({ formato: "documento", requiereArchivo: true })).toBe(true);
  });

  it("P0.3 · guardar el borrador de evidencias no borra los pasos marcados", () => {
    let { registro, actividad } = registroConHero();
    registro = marcarPaso(registro, actividad.id, 1, true);
    registro = marcarPaso(registro, actividad.id, 2, true);
    registro = guardarBorrador(registro, actividad.id, { archivos: [] });
    registro = guardarBorrador(registro, actividad.id, { nota: "Avance parcial" });
    const vigente = obtenerActividad(registro, actividad.id)!;
    expect(vigente.pasos.filter((p) => p.hecho).map((p) => p.orden)).toEqual([1, 2]);
    expect(borradorDe(vigente).nota).toBe("Avance parcial");
  });

  it("P0.3 · los criterios declarados persisten en la actividad", () => {
    let { registro, actividad } = registroConHero();
    const [a, b] = actividad.entregable.criteriosValidacion;
    registro = guardarBorrador(registro, actividad.id, { criteriosDeclarados: [a!] });
    registro = guardarBorrador(registro, actividad.id, { criteriosDeclarados: [a!, b!] });
    registro = guardarBorrador(registro, actividad.id, { archivos: [] });
    expect(borradorDe(obtenerActividad(registro, actividad.id)!).criteriosDeclarados).toEqual([a, b]);
  });
});
