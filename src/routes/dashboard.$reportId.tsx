import { createFileRoute } from "@tanstack/react-router";

import ReportDashboard from "@/components/report-dashboard";

export const Route = createFileRoute("/dashboard/$reportId")({
  component: DashboardRoute,
});

function DashboardRoute() {
  const { reportId } = Route.useParams();
  return <ReportDashboard reportId={reportId} />;
}
