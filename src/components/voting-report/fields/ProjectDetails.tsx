import { useStore } from "@tanstack/react-form";
import { FileText } from "lucide-react";

import { intakeFormOpts } from "@/features/form-options";
import { withForm } from "@/hooks/form";

export const ProjectDetails = withForm({
  ...intakeFormOpts,
  render: ({ form }) => {
    const requestScope = useStore(form.store, (state) => state.values.requestScope);

    return (
      <section className="space-y-6">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-400">
          <FileText className="w-5 h-5" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Project Details
          </h2>
        </div>

        <form.AppField name="requestTitle">
          {(field) => (
            <field.Input label="Project Title" placeholder="e.g. Summer Festival Flyer" />
          )}
        </form.AppField>

        <form.AppField name="requestDescription">
          {(field) => (
            <field.TextArea
              label={
                requestScope === "discovery"
                  ? "Program / Initiative Description"
                  : "Content / Description"
              }
              placeholder="Include dates, department info, and the main content..."
            />
          )}
        </form.AppField>
      </section>
    );
  },
});
