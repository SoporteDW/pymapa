/**
 * M1-D2 · Acceso mínimo con Supabase Auth (email + contraseña).
 * Ruta pública: sin esta sesión no puede ejecutarse el recorrido productivo.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/acceso")({
  head: () => ({
    meta: [
      { title: "Acceso a pymapa" },
      {
        name: "description",
        content:
          "Inicia sesión en pymapa para continuar tu recorrido de transformación digital con tu organización.",
      },
      { property: "og:title", content: "Acceso a pymapa" },
      {
        property: "og:description",
        content: "Inicia sesión en pymapa para continuar el recorrido de tu organización.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Acceso,
});

function Acceso() {
  const navigate = useNavigate();
  const { isHydrated, user, signIn, signUp } = useAuth();
  const [modo, setModo] = useState<"login" | "registro">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (isHydrated && user) {
      void navigate({ to: "/capacidad/op-01", replace: true });
    }
  }, [isHydrated, user, navigate]);

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    setMensaje(null);

    if (modo === "login") {
      const { error: err } = await signIn(email.trim(), password);
      if (err) setError(err);
    } else {
      const resultado = await signUp(email.trim(), password);
      if (resultado.error) setError(resultado.error);
      else if (resultado.needsEmailConfirmation) {
        setMensaje("Te enviamos un correo de confirmación. Ábrelo para activar tu cuenta.");
      }
    }
    setEnviando(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Acceso"
        descripcion="Entra con tu correo para trabajar sobre la información de tu organización."
      />

      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle>{modo === "login" ? "Iniciar sesión" : "Crear cuenta"}</CardTitle>
          <CardDescription>
            Tu recorrido y tus respuestas quedan asociados a tu organización.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={enviar}>
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete={modo === "login" ? "current-password" : "new-password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            {mensaje && (
              <p role="status" className="text-sm text-muted-foreground">
                {mensaje}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={enviando}>
              {modo === "login" ? "Entrar" : "Crear cuenta"}
            </Button>
          </form>

          <div className="mt-4 flex flex-col gap-2 text-sm">
            <button
              type="button"
              className="text-primary underline-offset-4 hover:underline"
              onClick={() => {
                setModo(modo === "login" ? "registro" : "login");
                setError(null);
                setMensaje(null);
              }}
            >
              {modo === "login" ? "No tengo cuenta, quiero crearla" : "Ya tengo cuenta"}
            </button>
            <Link to="/inicio" className="text-muted-foreground underline-offset-4 hover:underline">
              Volver al inicio
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
