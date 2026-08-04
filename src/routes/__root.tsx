import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppFooter } from "@/components/layout/app-footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { useSesion } from "@/hooks/use-sesion";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";

const modulosPrincipales = [
  { to: "/inicio", label: "Inicio" },
  { to: "/diagnostico", label: "Diagnóstico" },
  { to: "/resultados", label: "Resultados" },
  { to: "/plan-de-accion", label: "Plan de acción" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/ayuda", label: "Ayuda" },
];

function NotFoundComponent() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-lg text-center">
        <p className="text-sm font-medium text-muted-foreground">Página no encontrada</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">
          Esta página no está disponible o cambió de dirección
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Puedes volver al inicio o continuar por uno de los módulos principales.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link to="/inicio">Ir a Inicio</Link>
          </Button>
          <Button variant="outline" onClick={() => router.history.back()}>
            Volver
          </Button>
        </div>
        <ul className="mt-8 flex flex-wrap justify-center gap-2">
          {modulosPrincipales.map((modulo) => (
            <li key={modulo.to}>
              <Link
                to={modulo.to}
                className="inline-flex rounded-full border border-border bg-card px-3 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {modulo.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          No pudimos mostrar esta página
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ocurrió un problema al cargar la información. Intenta de nuevo o vuelve al inicio.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button
            onClick={() => {
              router.invalidate();
              reset();
            }}
          >
            Intentar de nuevo
          </Button>
          <Button variant="outline" asChild>
            <a href="/inicio">Ir a Inicio</a>
          </Button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "pymapa — Transformación digital para tu pyme" },
      {
        name: "description",
        content:
          "pymapa: plataforma autogestionada de transformación digital para pequeñas y medianas empresas.",
      },
      { name: "author", content: "pymapa" },
      { property: "og:title", content: "pymapa — Transformación digital para tu pyme" },
      {
        property: "og:description",
        content:
          "pymapa: plataforma autogestionada de transformación digital para pequeñas y medianas empresas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { sesion, isHydrated, storageError, updatePreferencias } = useSesion();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!isHydrated) return;
    setSidebarCollapsed(sesion.preferencias.menuColapsado);
  }, [isHydrated, sesion.preferencias.menuColapsado]);

  const handleToggleSidebar = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    updatePreferencias({ menuColapsado: next });
  };

  return (
    <QueryClientProvider client={queryClient}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Saltar al contenido
      </a>
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader
          empresa={sesion.empresa}
          onToggleSidebar={handleToggleSidebar}
          mobileNav={<MobileNav />}
        />
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar collapsed={sidebarCollapsed} className="h-[calc(100vh-4rem)]" />
          <div className="flex flex-1 flex-col overflow-hidden">
            <main
              id="main-content"
              className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"
              tabIndex={-1}
            >
              <div className="mx-auto max-w-6xl">
                {storageError && (
                  <div
                    role="status"
                    className="mb-4 rounded-lg border border-warning/20 bg-warning/5 p-3 text-sm text-warning-foreground"
                  >
                    No pudimos usar el almacenamiento de este navegador. Puedes seguir navegando,
                    pero los cambios se perderán al cerrar la pestaña.
                  </div>
                )}
                <Outlet />
              </div>
            </main>
            <AppFooter />
          </div>
        </div>
      </div>
      <Toaster position="bottom-right" />
    </QueryClientProvider>
  );
}
