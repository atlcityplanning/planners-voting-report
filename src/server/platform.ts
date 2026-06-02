import { env } from "cloudflare:workers";

type AppEnv = Cloudflare.Env & {
  NPU_REPORTS_DB?: D1Database;
  EMAIL?: SendEmail;
  NPU_TEAM_SUBMISSION_EMAIL?: string;
  NOTIFICATION_FROM_EMAIL?: string;
  PUBLIC_APP_URL?: string;
};

export function getAppEnv(): AppEnv {
  return env as AppEnv;
}

export function getPublicAppUrl() {
  const appEnv = getAppEnv();
  return appEnv.PUBLIC_APP_URL || appEnv.VITE_APP_URL || "http://127.0.0.1:3000";
}

export function getNpuTeamSubmissionEmail() {
  const appEnv = getAppEnv();
  return appEnv.NPU_TEAM_SUBMISSION_EMAIL || appEnv.WORK_EMAIL || "NPUMail@AtlantaGa.Gov";
}
