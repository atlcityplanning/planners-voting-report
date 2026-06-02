import { Zap, ClipboardList, Target } from "lucide-react";

import { intakeFormOpts } from "@/features/form-options";
import { withForm } from "@/hooks/form";
import { REQUEST_SCOPES } from "@/utils/form.schema";

export const RequestScopeInfo = withForm({
  ...intakeFormOpts,
  render: ({ form }) => {
    return (
      <section className="space-y-6">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-400">
          <Zap className="w-5 h-5" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Request Type
          </h2>
        </div>
        <form.AppField name="requestScope">
          {(field) => (
            <field.RadioGroup
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
              options={REQUEST_SCOPES.map((scope) => ({
                ...scope,
                icon: scope.id === "general" ? ClipboardList : Target,
                activeClassName:
                  scope.id === "general"
                    ? "border-blue-600 bg-blue-50/50 ring-1 ring-blue-600"
                    : "border-purple-600 bg-purple-50/50 ring-1 ring-purple-600",
                radioClassName:
                  scope.id === "general"
                    ? "data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600"
                    : "data-[state=checked]:border-purple-600 data-[state=checked]:bg-purple-600",
              }))}
            />
          )}
        </form.AppField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-1 border-t border-slate-50 pt-4">
          <div className="space-y-1">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-tighter ml-1">
              General Request Detail
            </p>
            <p className="text-xs text-slate-500 leading-normal px-1 italic">
              Standard design requests for new collateral including flyers, posters, pull-up
              banners, and one-pagers.
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-purple-600 uppercase tracking-tighter ml-1">
              Discovery Detail
            </p>
            <p className="text-xs text-slate-500 leading-normal px-1 italic">
              Reserved for comprehensive strategic projects such as annual reports, full branding
              initiatives, or multi-channel community engagement campaigns. Once submitted, you will
              receive confirmation of receipt within 1 business day.
            </p>
          </div>
        </div>
      </section>
    );
  },
});
