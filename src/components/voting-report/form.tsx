import type { IntakeFormData } from "@/utils/form.schema";
import { useAsyncRateLimitedCallback } from "@tanstack/react-pacer";
import { useStore } from "@tanstack/react-store";
import { Info } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { intakeFormOpts } from "@/features/form-options";
import { sendEmail } from "@/server/actions";

import { useAppForm } from "../../hooks/form";
import { Card, CardContent, CardFooter } from "../ui/card";

import { EmailVerification } from "./EmailVerification";
import { Attachments } from "./fields/Attachments";
import { Deliverables } from "./fields/Deliverables";
import { DiscoveryBrief } from "./fields/DiscoveryBrief";
import { ProjectDetails } from "./fields/ProjectDetails";
import { RequesterInfo } from "./fields/RequesterInfo";
import { RequestScopeInfo } from "./fields/RequestScopeInfo";
import { SponsorInfo } from "./fields/SponsorInfo";
import { Timeline } from "./fields/Timeline";
import { SubmissionSuccess } from "./SubmissionSuccess";

export function MarCommRequest() {
  const [verificationSession, setVerificationSession] = useState<{
    email: string;
    token: string;
  } | null>(null);

  if (!verificationSession) {
    return (
      <div className="w-full max-w-md mx-auto my-16">
        <div className="mb-8 text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Design Request</h1>
          <p className="text-slate-500">Please verify your City of Atlanta email to continue.</p>
        </div>
        <EmailVerification
          onVerified={(email, token) => setVerificationSession({ email, token })}
        />
      </div>
    );
  }

  return <InnerForm verificationSession={verificationSession} />;
}

function InnerForm({
  verificationSession,
}: {
  verificationSession: { email: string; token: string };
}) {
  const [submittedData, setSubmittedData] = useState<IntakeFormData | null>(null);

  const submitRateLimited = useAsyncRateLimitedCallback(
    async (formData: IntakeFormData) => {
      // 1. Initialize native FormData to bypass Seroval JSON parsing
      const serverFormData = new FormData();

      // 2. Clone payload and strip out `file` objects so it safely stringifies to JSON
      const payload = {
        ...formData,
        assets: formData.assets.map(({ file: _file, ...asset }) => asset),
      };

      // 3. Append JSON payload
      serverFormData.append("payload", JSON.stringify(payload));

      // 4. Append session token for security
      serverFormData.append("sessionToken", verificationSession.token);

      // 5. Append raw Files directly to FormData mapped by their asset ID
      formData.assets.forEach((asset) => {
        if (asset.file instanceof File) {
          serverFormData.append(`file_${asset.id}`, asset.file);
        }
      });

      // 5. Send the multipart FormData directly
      await sendEmail({
        data: serverFormData,
      });

      setSubmittedData(formData);
      form.reset();
    },
    {
      limit: 3,
      window: 60 * 1000,
      onReject: (_args, limiter) => {
        toast.error(
          `Rate limit exceeded. Try again in ${Math.ceil(limiter.getMsUntilNextWindow() / 1000)}s`,
        );
      },
    },
  );

  const form = useAppForm({
    ...intakeFormOpts,
    onSubmit: async ({ value }) => {
      await submitRateLimited(value as IntakeFormData);
    },
  });

  useEffect(() => {
    window.scrollTo(0, 0);
    form.setFieldValue("email", verificationSession.email);
  }, [verificationSession.email, form]);

  const isSubmitting = useStore(form.store, (state) => state.isSubmitting);
  const canSubmit = useStore(form.store, (state) => state.canSubmit);
  const isDirty = useStore(form.store, (state) => state.isDirty);

  if (submittedData) {
    return (
      <SubmissionSuccess formData={submittedData} setSubmitted={() => setSubmittedData(null)} />
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto my-8">
      <CardContent className="p-8">
        <form
          id="marcomm-request-form"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
          className="space-y-8"
        >
          <RequesterInfo form={form} />
          <SponsorInfo form={form} />
          <RequestScopeInfo form={form} />
          <ProjectDetails form={form} />
          <DiscoveryBrief form={form} />
          <Deliverables form={form} />
          <Attachments form={form} />
          <Timeline form={form} />

          <CardFooter className="pt-10 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6 px-0">
            <div className="flex gap-3 items-center">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                <Info className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-xs text-slate-400 max-w-[240px] leading-relaxed">
                Submitted requests undergo MarComm review. All copy will be edited for brand
                consistency and grammar.
              </p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <Button
                type="submit"
                form="marcomm-request-form"
                disabled={!canSubmit || !isDirty || isSubmitting}
                className="w-full sm:w-auto px-12 py-6 font-bold shadow-lg shadow-blue-100 transition-all active:scale-95"
              >
                {isSubmitting ? "Sending..." : "Submit Request"}
              </Button>
            </div>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}
