import { createFileRoute } from "@tanstack/react-router";

import { ReviewTokenPage } from "@/components/report-token-pages";

export const Route = createFileRoute("/review/$token")({
  component: ReviewRoute,
});

function ReviewRoute() {
  const { token } = Route.useParams();
  return <ReviewTokenPage token={token} />;
}
