import { useCallback, useEffect, useMemo, useState } from "react";
import { useSesion } from "./use-sesion";
import {
  guardarRegistro,
  leerRegistro,
  registroVacio,
} from "@/lib/delegacion/repositorio";
import {
  delegacionesDe,
  delegar,
  marcarIncorporado,
  marcarRecibido,
  pendientesDeTerceros,
  type EntradaDelegacion,
} from "@/lib/delegacion/servicio";
import { areaSugerida } from "@/lib/delegacion/areas";
import { registrarEvento } from "@/lib/analytics";
import type { Delegacion, RegistroDelegacionEmpresa } from "@/lib/delegacion/tipos";

/**
 * B8 · Delegación y colaboración interna. El correo es simulado: se prepara el
 * mensaje y se registra el estado (pendiente tercero → recibido → incorporado).
 */
export function useDelegacion() {
  const { sesion, isHydrated, registrarActividad } = useSesion();
  const empresaId = sesion.empresa.id || "empresa-local";
  const empresaNombre = sesion.empresa.nombre.trim() || "Tu empresa";

  const [registro, setRegistro] = useState<RegistroDelegacionEmpresa>(() =>
    registroVacio(empresaId, empresaNombre)
  );
  const [hidratado, setHidratado] = useState(false);

  useEffect(() => {
    if (!isHydrated) return;
    setRegistro(leerRegistro(empresaId, empresaNombre));
    setHidratado(true);
  }, [isHydrated, empresaId, empresaNombre]);

  const persistir = useCallback((siguiente: RegistroDelegacionEmpresa) => {
    setRegistro(guardarRegistro(siguiente));
    return siguiente;
  }, []);

  const crear = useCallback(
    (entrada: Omit<EntradaDelegacion, "empresaId" | "empresaNombre" | "solicitante">) => {
      const { registro: siguiente, delegacion } = delegar(
        leerRegistro(empresaId, empresaNombre),
        {
          ...entrada,
          empresaId,
          empresaNombre,
          solicitante: sesion.empresa.responsable || "El responsable",
        }
      );
      persistir(siguiente);
      if (delegacion) {
        registrarActividad(
          "usuario",
          `Se delegó “${delegacion.origen.referenciaTitulo}” a ${delegacion.nombre} (${delegacion.area}).`
        );
        registrarEvento("delegation_created", {
          origen: delegacion.origen.tipo,
          area: delegacion.area,
          simulado: true,
        });
      }
      return delegacion;
    },
    [empresaId, empresaNombre, persistir, registrarActividad, sesion.empresa.responsable]
  );

  const recibir = useCallback(
    (delegacionId: string, respuesta: string) => {
      persistir(marcarRecibido(leerRegistro(empresaId, empresaNombre), delegacionId, respuesta));
      registrarEvento("delegation_status_changed", { delegacionId, estado: "recibido" });
    },
    [empresaId, empresaNombre, persistir]
  );

  const incorporar = useCallback(
    (delegacionId: string) => {
      persistir(marcarIncorporado(leerRegistro(empresaId, empresaNombre), delegacionId));
      registrarActividad("sistema", "La respuesta del colaborador se incorporó al conocimiento.");
      registrarEvento("delegation_status_changed", { delegacionId, estado: "incorporado" });
    },
    [empresaId, empresaNombre, persistir, registrarActividad]
  );

  const de = useCallback(
    (referenciaId: string): Delegacion[] => delegacionesDe(registro, { referenciaId }),
    [registro]
  );

  const pendientes = useMemo(() => pendientesDeTerceros(registro), [registro]);

  return {
    hidratado,
    delegaciones: registro.delegaciones,
    pendientes,
    de,
    crear,
    recibir,
    incorporar,
    areaSugerida,
  };
}
