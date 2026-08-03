import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/diagnostico")({
  component: DiagnosticoLayout,
});

function DiagnosticoLayout() {
  return <Outlet />;
}
