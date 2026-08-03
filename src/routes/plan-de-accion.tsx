import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/plan-de-accion")({
  component: PlanLayout,
});

function PlanLayout() {
  return <Outlet />;
}
