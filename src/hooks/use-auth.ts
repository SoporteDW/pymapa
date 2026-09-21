/**
 * M1-D2 · Sesión productiva mínima (Supabase Auth, email + contraseña).
 *
 * Solo sesión: iniciar, mantener, cerrar y conocer al usuario autenticado.
 * No hay IAM, roles de aplicación, SSO ni proveedores adicionales aquí.
 */
import { useCallback, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface EstadoAuth {
  isHydrated: boolean;
  session: Session | null;
  user: User | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

export function useAuth(): EstadoAuth {
  const [session, setSession] = useState<Session | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let activo = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_evento, nueva) => {
      if (!activo) return;
      setSession(nueva);
      setIsHydrated(true);
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!activo) return;
      setSession(data.session);
      setIsHydrated(true);
    });

    return () => {
      activo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    return {
      error: error?.message ?? null,
      needsEmailConfirmation: !error && data.session === null,
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { isHydrated, session, user: session?.user ?? null, signIn, signUp, signOut };
}
