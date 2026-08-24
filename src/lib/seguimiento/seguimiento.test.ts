import { describe, expect, it } from "vitest";

import {
  construirSeguimiento,
  estadoHitos,
  evolucionIndicador,
  registrarMedicion,
  hitoHabilitado,
} from "./servicio";
import { registroVacio } from "./repositorio";
import type { ActividadWorkspace } from "@/lib/workspace/tipos";

const actividad = {
  id: "act-demo",
  titulo: "Mejorar la ficha de producto",
  objetivo: "Aumentar la conversión de la tienda",
  estado: "validado",
  historial: [],
  origen: { tipo: "ficha", dominioId: "comercial", dominioNombre: "Comercial" },
} as unknown as ActividadWorkspace;

function seguimientoBase() {
  return construirSeguimiento({
    actividad,
    empresaId: "empresa-demo",
    lineaBase: 50,
    meta: 60,
    ahora: "2026-01-01T00:00:00.000Z",
  });
}

describe("Habilitación secuencial de checkpoints", () => {
  it("solo habilita el hito de 30 días al comenzar", () => {
    const estados = estadoHitos(seguimientoBase());
    expect(estados.map((e) => e.habilitado)).toEqual([true, false, false]);
    expect(estados[1]!.bloqueadoPor).toBe(estados[0]!.hito.etiqueta);
  });

  it("habilita el siguiente hito solo tras registrar el anterior", () => {
    const seguimiento = seguimientoBase();
    const registro = { ...registroVacio("empresa-demo", "Demo"), seguimientos: [seguimiento] };
    const { seguimiento: conD30 } = registrarMedicion(registro, seguimiento.id, "d30", {
      valor: 55,
    });
    expect(hitoHabilitado(conD30!, "d60")).toBe(true);
    expect(hitoHabilitado(conD30!, "d90")).toBe(false);
  });
});

describe("Evolución del indicador", () => {
  it("parte de la línea base y marca los checkpoints sin medir como pendientes", () => {
    const puntos = evolucionIndicador(seguimientoBase());
    expect(puntos[0]).toMatchObject({ etiqueta: "Línea base", valor: 50, pendiente: false });
    expect(puntos.slice(1).every((p) => p.pendiente)).toBe(true);
  });
});
