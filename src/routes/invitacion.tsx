/**
 * PKG-02 · Aceptación de invitación. El token viaja en el fragmento (#), se
 * guarda solo en sessionStorage mientras la persona inicia sesión y se envía
 * una única vez al servidor, que compara su hash.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { acceptInvitation } from "@/lib/production/capabilities.functions";

const CLAVE = "pymapa-invitacion-token";

export const Route = createFileRoute("/invitacion")({
  head: () => ({
    meta: [
      { title: "Invitación — pymapa" },
      { name: "description", content: "Acepta la invitación para colaborar en el diagnóstico pymapa de tu empresa." },
      { property: "og:title", content: "Invitación — pymapa" },
      { property: "og:description", content: "Colabora en el diagnóstico pymapa de tu empresa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Invitacion,
});

const MENSAJES: Record<string, string> = {
  EMAIL_MISMATCH: "Esta invitación fue enviada a otro correo. Inicia sesión con el correo invitado.",
  INVITATION_NOT_FOUND: "No encontramos esta invitación.",
  INVITATION_NOT_PENDING: "Esta invitación ya fue usada o fue revocada.",
  INVITATION_EXPIRED: "Esta invitación expiró.",
  RESPONDENT_ALREADY_BOUND: "Esta invitación ya está vinculada a otra cuenta.",
  EMAIL_REQUIRED: "Tu cuenta no tiene un correo verificado.",
};

function Invitacion() {
  const { isHydrated, user } = useAuth();
  const aceptar = useServerFn(acceptInvitation);
  const [estado, setEstado] = useState<"idle" | "ok" | "error">("idle");
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    const t = window.location.hash.slice(1);
    if (t) {
      sessionStorage.setItem(CLAVE, t);
      history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated || !user || estado !== "idle") return;
    const token = sessionStorage.getItem(CLAVE);
    if (!token) {
      setEstado("error");
      setMensaje("El enlace de invitación no es válido.");
      return;
    }
    aceptar({ data: { token } })
      .then((r) => {
        sessionStorage.removeItem(CLAVE);
        if (r.accepted) setEstado("ok");
        else {
          setEstado("error");
          setMensaje(MENSAJES[r.reason ?? ""] ?? "No pudimos aceptar la invitación.");
        }
      })
      .catch(() => {
        setEstado("error");
        setMensaje("No pudimos aceptar la invitación.");
      });
  }, [isHydrated, user, estado, aceptar]);

  return (
    <div className="mx-auto max-w-lg p-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Invitación a colaborar</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm">
          {isHydrated && !user && (
            <>
              <p>Inicia sesión o crea tu cuenta con el correo invitado y vuelve a abrir este enlace.</p>
              <Button asChild><Link to="/acceso">Iniciar sesión</Link></Button>
            </>
          )}
          {user && estado === "idle" && <p>Aceptando invitación…</p>}
          {estado === "ok" && <p>Invitación aceptada. Ya formas parte del diagnóstico como colaborador.</p>}
          {estado === "error" && <p className="text-destructive">{mensaje}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
