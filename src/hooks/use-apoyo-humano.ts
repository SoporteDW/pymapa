import { useCallback, useEffect, useMemo, useState } from "react";
import { useSesion } from "./use-sesion";
import {
  guardarRegistro,
  leerRegistro,
  registroVacio,
} from "@/lib/apoyo-humano/repositorio";
import {
  abiertas,
  descartarRecomendacion,
  fuenteRegla,
  recomendacionesDe,
  registrarRecomendacion,
  registrarSesionRealizada,
  reservarSesion,
  type EntradaReserva,
} from "@/lib/apoyo-humano/servicio";
import { evaluarApoyo, type SenalesApoyo } from "@/lib/apoyo-humano/reglas";
import { registrarEvento } from "@/lib/analytics";
import type {
  OrigenApoyo,
  RecomendacionApoyo,
  RegistroApoyoEmpresa,
} from "@/lib/apoyo-humano/tipos";

/**
 * B9 · Salidas de la autopista. La interfaz aporta SEÑALES observables; las
 * reglas deciden si corresponde apoyo humano especializado y de qué tipo.
 */
export function useApoyoHumano() {
  const { sesion, isHydrated, registrarActividad } = useSesion();
  const empresaId = sesion.empresa.id || "empresa-local";
  const empresaNombre = sesion.empresa.nombre.trim() || "Tu empresa";

  const [registro, setRegistro] = useState<RegistroApoyoEmpresa>(() =>
    registroVacio(empresaId, empresaNombre)
  );
  const [hidratado, setHidratado] = useState(false);

  useEffect(() => {
    if (!isHydrated) return;
    setRegistro(leerRegistro(empresaId, empresaNombre));
    setHidratado(true);
  }, [isHydrated, empresaId, empresaNombre]);

  const persistir = useCallback((siguiente: RegistroApoyoEmpresa) => {
    setRegistro(guardarRegistro(siguiente));
    return siguiente;
  }, []);

  /** Evalúa señales y registra (idempotente) las recomendaciones pertinentes. */
  const evaluar = useCallback(
    (senales: SenalesApoyo, origen: OrigenApoyo): RecomendacionApoyo[] => {
      const sugerencias = evaluarApoyo(senales);
      if (sugerencias.length === 0) return [];
      let actual = leerRegistro(empresaId, empresaNombre);
      const creadas: RecomendacionApoyo[] = [];
      for (const sugerencia of sugerencias) {
        const resultado = registrarRecomendacion(actual, sugerencia, origen, empresaId);
        if (resultado.registro !== actual) {
          registrarEvento("human_support_suggested", {
            reglaId: sugerencia.reglaId,
            especialidad: sugerencia.especialidad,
          });
        }
        actual = resultado.registro;
        creadas.push(resultado.recomendacion);
      }
      persistir(actual);
      return creadas;
    },
    [empresaId, empresaNombre, persistir]
  );

  const reservar = useCallback(
    (recomendacionId: string, entrada: EntradaReserva) => {
      const { registro: siguiente, reserva } = reservarSesion(
        leerRegistro(empresaId, empresaNombre),
        recomendacionId,
        entrada
      );
      persistir(siguiente);
      if (reserva) {
        registrarActividad(
          "sistema",
          `Sesión de apoyo reservada con ${reserva.especialistaNombre} (demostrativa).`
        );
        registrarEvento("human_support_booked", { recomendacionId, demo: true });
      }
      return reserva;
    },
    [empresaId, empresaNombre, persistir, registrarActividad]
  );

  const cerrarSesion = useCallback(
    (recomendacionId: string, conclusion: string, recomendacionRetorno: string) => {
      const { registro: siguiente, resultado } = registrarSesionRealizada(
        leerRegistro(empresaId, empresaNombre),
        recomendacionId,
        conclusion,
        recomendacionRetorno
      );
      persistir(siguiente);
      if (resultado) {
        registrarActividad("sistema", "Conclusión de la sesión de apoyo incorporada al recorrido.");
        registrarEvento("human_support_closed", { recomendacionId });
      }
      return resultado;
    },
    [empresaId, empresaNombre, persistir, registrarActividad]
  );

  const descartar = useCallback(
    (recomendacionId: string) => {
      persistir(descartarRecomendacion(leerRegistro(empresaId, empresaNombre), recomendacionId));
    },
    [empresaId, empresaNombre, persistir]
  );

  const de = useCallback(
    (referenciaId: string) => recomendacionesDe(registro, { referenciaId }),
    [registro]
  );

  const pendientes = useMemo(() => abiertas(registro), [registro]);

  return {
    hidratado,
    recomendaciones: registro.recomendaciones,
    pendientes,
    de,
    evaluar,
    reservar,
    cerrarSesion,
    descartar,
    fuenteRegla,
  };
}
