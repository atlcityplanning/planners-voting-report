import { createFileRoute } from "@tanstack/react-router";

import { AuthorizationTokenPage } from "@/components/report-token-pages";

export const Route = createFileRoute("/authorize/$token")({
  component: AuthorizationRoute,
});

function AuthorizationRoute() {
  const { token } = Route.useParams();
  return <AuthorizationTokenPage token={token} />;
}
