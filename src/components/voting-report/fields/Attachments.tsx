import { Paperclip } from "lucide-react";

import { intakeFormOpts } from "@/features/form-options";
import { withForm } from "@/hooks/form";

export const Attachments = withForm({
  ...intakeFormOpts,
  render: ({ form }) => {
    return (
      <section className="space-y-6">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-400">
          <Paperclip className="w-5 h-5" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Attachments & Assets
          </h2>
        </div>
        <form.AppField name="assets">{(field) => <field.Dropzone />}</form.AppField>
      </section>
    );
  },
});
