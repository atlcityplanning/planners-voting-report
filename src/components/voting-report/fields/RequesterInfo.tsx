import { User, Mail } from "lucide-react";

import { intakeFormOpts } from "@/features/form-options";
import { withForm } from "@/hooks/form";

export const RequesterInfo = withForm({
  ...intakeFormOpts,
  render: ({ form }) => {
    return (
      <section className="space-y-6">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-400">
          <User className="w-5 h-5" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Requester Information
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <form.AppField name="fullName">
            {(field) => <field.Input label="Full Name" placeholder="Jane Doe" />}
          </form.AppField>

          <form.AppField name="email">
            {(field) => (
              <field.Input
                label="Email Address"
                placeholder="email@atlantaga.gov"
                type="email"
                icon={Mail}
                disabled
              />
            )}
          </form.AppField>

          <div className="md:col-span-2">
            <form.AppField name="office">
              {(field) => (
                <field.Combobox label="Office / Department" placeholder="Select Office..." />
              )}
            </form.AppField>
          </div>
        </div>
      </section>
    );
  },
});
