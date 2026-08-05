import { useCallback, useEffect, useState } from "react";
import {
  enlaceCorreo,
  guardarColaboraciones,
  leerColaboraciones,
  nuevaSolicitud,
  type DatosSolicitud,
  type EstadoColaboracion,
  type SolicitudColaboracion,
} from "@/lib/colaboracion/colaboracion";
import { registrarEvento } from "@/lib/analytics";

/**
 * Servicio de Solicitudes de Colaboración: capa superpuesta al Roadmap que
 * registra a quién se pidió apoyo y en qué estado quedó la actividad.
 */
export function useColaboracion() {
  const [solicitudes, setSolicitudes] = useState<SolicitudColaboracion[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setSolicitudes(leerColaboraciones());
    setIsHydrated(true);
  }, []);

  const persistir = useCallback((siguientes: SolicitudColaboracion[]) => {
    setSolicitudes(siguientes);
    guardarColaboraciones(siguientes);
  }, []);

  const solicitar = useCallback(
    (datos: DatosSolicitud, remitente: { empresa: string; responsable: string }) => {
      const solicitud = nuevaSolicitud(datos);
      const siguientes = [
        solicitud,
        ...leerColaboraciones().filter((s) => s.accionId !== datos.accionId),
      ];
      persistir(siguientes);
      registrarEvento("roadmap_note_added", { accionId: datos.accionId });
      if (typeof window !== "undefined") {
        window.location.href = enlaceCorreo(datos, remitente);
      }
      return solicitud;
    },
    [persistir]
  );

  const cambiarEstado = useCallback(
    (accionId: string, estado: EstadoColaboracion) => {
      const siguientes = leerColaboraciones().map((s) =>
        s.accionId === accionId
          ? { ...s, estado, fechaActualizacion: new Date().toISOString() }
          : s
      );
      persistir(siguientes);
    },
    [persistir]
  );

  const solicitudDe = useCallback(
    (accionId: string): SolicitudColaboracion | null =>
      solicitudes.find((s) => s.accionId === accionId) ?? null,
    [solicitudes]
  );

  const enEspera = solicitudes.filter((s) => s.estado === "en_espera");

  return { solicitudes, enEspera, isHydrated, solicitar, cambiarEstado, solicitudDe };
}
