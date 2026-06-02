import { ShieldCheck, CheckCircle2, Mail } from "lucide-react";

import { intakeFormOpts } from "@/features/form-options";
import { withForm } from "@/hooks/form";

export const SponsorInfo = withForm({
  ...intakeFormOpts,
  render: ({ form }) => {
    return (
      <section className="space-y-6">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-400">
          <ShieldCheck className="w-5 h-5" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Sponsor Approval
          </h2>
        </div>

        {/* Sponsor support is ALWAYS required — lock true in UI */}
        <form.AppField name="sponsor.supported">
          {(field) => (
            <field.Checkbox
              className="h-8 w-8 rounded-full data-checked:bg-emerald-600 data-checked:border-emerald-600 data-checked:text-white  bg-emerald-600 border-emerald-600 text-white disabled:opacity-90"
              label="Sponsor Support Verification"
              description="I confirm this request is supported by a Sponsor (Director or Assistant Director)."
              disabled
              icon={CheckCircle2}
            />
          )}
        </form.AppField>

        <form.AppField name="sponsor.email">
          {(field) => (
            <field.Input
              label="Sponsor's Email"
              placeholder="sponsor@atlantaga.gov"
              type="email"
              icon={Mail}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value.toLowerCase())}
            />
          )}
        </form.AppField>
      </section>
    );
  },
});
