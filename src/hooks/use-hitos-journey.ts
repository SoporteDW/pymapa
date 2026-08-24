import { useCallback, useEffect, useState } from "react";
import { mismoRegistro, useVersionEstado } from "@/lib/estado/bus";

import {
  guardarHitos,
  hitosVacios,
  leerHitos,
  type HitosJourney,
} from "@/lib/journey/hitos-repositorio";

type ClaveHito = keyof Omit<HitosJourney, "actualizadoEn">;

/** Macroentrega 5 · Hitos narrativos ya vividos por el usuario. */
export function useHitosJourney() {
  const [hitos, setHitos] = useState<HitosJourney>(hitosVacios);
  const [hidratado, setHidratado] = useState(false);

  const version = useVersionEstado();

  useEffect(() => {
    const leidos = leerHitos();
    setHitos((previos) => (mismoRegistro(previos, leidos) ? previos : leidos));
    setHidratado(true);
  }, [version]);

  const marcar = useCallback((clave: ClaveHito) => {
    setHitos((previos) => {
      if (previos[clave]) return previos;
      return guardarHitos({ ...previos, [clave]: true });
    });
  }, []);

  return { hitos, hidratado, marcar };
}
