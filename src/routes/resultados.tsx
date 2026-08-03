import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/resultados")({
  component: ResultadosLayout,
});

function ResultadosLayout() {
  return <Outlet />;
}
