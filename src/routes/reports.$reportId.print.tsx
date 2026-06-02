import { createFileRoute } from "@tanstack/react-router";

import FinalReport from "@/components/final-report";

export const Route = createFileRoute("/reports/$reportId/print")({
  component: FinalReportRoute,
});

function FinalReportRoute() {
  const { reportId } = Route.useParams();
  return <FinalReport reportId={reportId} />;
}
