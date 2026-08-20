import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/diagnostico/especializados")({
  component: () => <Outlet />,
});
