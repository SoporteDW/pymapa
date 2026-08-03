import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/roadmap")({
  component: RoadmapLayout,
});

function RoadmapLayout() {
  return <Outlet />;
}
