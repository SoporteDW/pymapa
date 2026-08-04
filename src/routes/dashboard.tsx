import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Layout del módulo de Dashboard e Indicadores (POC-07). */
export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Indicadores y seguimiento — pymapa" },
      {
        name: "description",
        content:
          "Tablero de indicadores de tu transformación digital: madurez, avance del Roadmap, alertas y actividad reciente.",
      },
      { property: "og:title", content: "Indicadores y seguimiento — pymapa" },
      {
        property: "og:description",
        content:
          "Tablero de indicadores de tu transformación digital: madurez, avance del Roadmap, alertas y actividad reciente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <Outlet />,
});
