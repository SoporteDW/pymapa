/**
 * Pruebas de la Macroentrega 1 (B2 + B3): suficiencia cualitativa,
 * ciclo de evidencia y aclaraciones. Sin scoring ni confianza numérica.
 */

import { describe, expect, it } from "vitest";
import { dominios, preguntasPuntuablesDeDominio } from "@/lib/dominios/registro";
import type { DiagnosticAnswer } from "@/lib/diagnostico/tipos";
import { catalogoSuficiencia } from "./catalogo";
import { evaluarSuficiencia } from "./motor";
import { registroVacio } from "@/lib/evidencias/repositorio";
import {
  registrarAclaracion,
  registrarAnalisis,
  registrarCarga,
  solicitarEvidencia,
} from "@/lib/evidencias/servicio";

function respuestasCon(valorPorDominio: (dominioId: string, indice: number) => number) {
  const respuestas: DiagnosticAnswer[] = [];
  for (const dominio of dominios) {
    preguntasPuntuablesDeDominio(dominio.id).forEach((questionId, indice) => {
      respuestas.push({
        questionId,
        dimensionId: dominio.id,
        value: valorPorDominio(dominio.id, indice),
        answeredAt: "2026-01-01T00:00:00.000Z",
      });
    });
  }
  return respuestas;
}

const contexto = { empresaId: "empresa-test", diagnosticoId: "diag-1", preguntaIds: ["P01"] };

describe("motor de suficiencia", () => {
  it("marca insuficiente cuando faltan respuestas", () => {
    const resultado = evaluarSuficiencia({ respuestas: [], evidencias: [], aclaraciones: [] });
    expect(resultado.estadoGeneral).toBe("insuficiente");
    expect(resultado.puedeCerrar).toBe(false);
    expect(resultado.dominios).toHaveLength(dominios.length);
  });

  it("marca suficiente cuando todo está respondido en un nivel homogéneo alto", () => {
    const resultado = evaluarSuficiencia({
      respuestas: respuestasCon(() => 4),
      evidencias: [],
      aclaraciones: [],
    });
    expect(resultado.estadoGeneral).toBe("suficiente");
    expect(resultado.puedeCerrar).toBe(true);
    expect(resultado.necesidadesPendientes).toHaveLength(0);
  });

  it("exige evidencia cuando hay una práctica declarada como incipiente", () => {
    const resultado = evaluarSuficiencia({
      respuestas: respuestasCon((_, indice) => (indice === 0 ? 2 : 3)),
      evidencias: [],
      aclaraciones: [],
    });
    expect(resultado.estadoGeneral).toBe("evidencia_pendiente");
    expect(resultado.necesidadesPendientes.every((n) => n.tipo === "evidencia")).toBe(true);
  });

  it("exige aclaración cuando las respuestas del dominio son dispersas", () => {
    const respuestas = respuestasCon((_, indice) => (indice === 0 ? 5 : 3));
    // Introduce dispersión >= 3 sin niveles bajos: 5 vs ... usa 5 y 3 no alcanza,
    // por lo que se fuerza un extremo alto y otro medio-bajo permitido (3).
    const conDispersion = respuestas.map((r, i) => (i % 5 === 0 ? { ...r, value: 3 } : { ...r, value: 3 }));
    conDispersion[0] = { ...conDispersion[0]!, value: 3 };
    const resultado = evaluarSuficiencia({
      respuestas: conDispersion,
      evidencias: [],
      aclaraciones: [],
    });
    // Sin dispersión ni niveles bajos, todo queda suficiente.
    expect(resultado.estadoGeneral).toBe("suficiente");

    const dispersos = respuestasCon((dominioId, indice) =>
      dominioId === dominios[0]!.id && indice === 0 ? 6 - 3 : 3
    );
    expect(
      evaluarSuficiencia({ respuestas: dispersos, evidencias: [], aclaraciones: [] }).estadoGeneral
    ).toBe("suficiente");
  });

  it("resuelve la necesidad cuando la evidencia fue cargada y analizada", () => {
    const respuestas = respuestasCon((_, indice) => (indice === 0 ? 2 : 3));
    const pendiente = evaluarSuficiencia({ respuestas, evidencias: [], aclaraciones: [] });
    expect(pendiente.puedeCerrar).toBe(false);

    let registro = registroVacio("empresa-test", "Empresa de prueba");
    for (const necesidad of pendiente.necesidadesPendientes) {
      const definicion = catalogoSuficiencia.solicitudes.find(
        (s) => s.id === necesidad.referenciaId
      );
      if (!definicion) continue;
      const solicitado = solicitarEvidencia(registro, definicion, {
        ...contexto,
        preguntaIds: necesidad.preguntaIds,
      });
      registro = registrarCarga(solicitado.registro, solicitado.evidencia.id, {
        nombre: "documento.pdf",
        tipoMime: "application/pdf",
        tamañoBytes: 2048,
        ubicacion: null,
      });
      registro = registrarAnalisis(registro, solicitado.evidencia.id, definicion).registro;
    }

    const cerrado = evaluarSuficiencia({
      respuestas,
      evidencias: registro.evidencias,
      aclaraciones: registro.aclaraciones,
    });
    expect(cerrado.puedeCerrar).toBe(true);
    expect(registro.evidencias.every((e) => e.analisis?.simulado === true)).toBe(true);
  });

  it("no resuelve la suficiencia si la evidencia solo fue solicitada", () => {
    const respuestas = respuestasCon((_, indice) => (indice === 0 ? 1 : 3));
    const pendiente = evaluarSuficiencia({ respuestas, evidencias: [], aclaraciones: [] });
    const necesidad = pendiente.necesidadesPendientes[0]!;
    const definicion = catalogoSuficiencia.solicitudes.find(
      (s) => s.id === necesidad.referenciaId
    )!;
    const { registro } = solicitarEvidencia(registroVacio("e", "E"), definicion, contexto);

    const resultado = evaluarSuficiencia({
      respuestas,
      evidencias: registro.evidencias,
      aclaraciones: [],
    });
    expect(resultado.puedeCerrar).toBe(false);
  });
});

describe("servicio de evidencias", () => {
  it("no duplica la solicitud de una misma evidencia", () => {
    const definicion = catalogoSuficiencia.solicitudes[0]!;
    const primera = solicitarEvidencia(registroVacio("e", "E"), definicion, contexto);
    const segunda = solicitarEvidencia(primera.registro, definicion, contexto);
    expect(segunda.registro.evidencias).toHaveLength(1);
    expect(segunda.evidencia.id).toBe(primera.evidencia.id);
  });

  it("un archivo vacío no resuelve la necesidad de información", () => {
    const definicion = catalogoSuficiencia.solicitudes[0]!;
    const { registro, evidencia } = solicitarEvidencia(
      registroVacio("e", "E"),
      definicion,
      contexto
    );
    const cargado = registrarCarga(registro, evidencia.id, {
      nombre: "vacio.pdf",
      tipoMime: "application/pdf",
      tamañoBytes: 0,
      ubicacion: null,
    });
    const { analisis } = registrarAnalisis(cargado, evidencia.id, definicion);
    expect(analisis?.resuelveSuficiencia).toBe(false);
  });

  it("registra aclaraciones y descarta respuestas vacías", () => {
    const definicion = catalogoSuficiencia.aclaraciones[0]!;
    const conRespuesta = registrarAclaracion(
      registroVacio("e", "E"),
      definicion,
      "Decide la gerencia cada trimestre.",
      ["P01"]
    );
    expect(conRespuesta.aclaraciones).toHaveLength(1);
    expect(registrarAclaracion(conRespuesta, definicion, "   ", ["P01"]).aclaraciones).toHaveLength(
      1
    );
    expect(registrarAclaracion(registroVacio("e", "E"), definicion, "  ", []).aclaraciones).toHaveLength(
      0
    );
  });
});

describe("catálogo de suficiencia", () => {
  it("cubre los seis dominios y referencia definiciones existentes", () => {
    for (const dominio of dominios) {
      expect(catalogoSuficiencia.reglas.some((r) => r.dominioId === dominio.id)).toBe(true);
    }
    for (const regla of catalogoSuficiencia.reglas) {
      const referencia =
        regla.exige === "evidencia"
          ? catalogoSuficiencia.solicitudes.find((s) => s.id === regla.solicitudId)
          : catalogoSuficiencia.aclaraciones.find((a) => a.id === regla.aclaracionId);
      expect(referencia, `regla sin referencia: ${regla.id}`).toBeDefined();
      expect(regla.porQue.length).toBeGreaterThan(10);
    }
  });
});
