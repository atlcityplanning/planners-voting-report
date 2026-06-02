import { useStore } from "@tanstack/react-store";
import { format, isBefore, isWeekend } from "date-fns";
import { Clock } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { intakeFormOpts } from "@/features/form-options";
import { withForm } from "@/hooks/form";
import { parseYmdToLocalDate } from "@/utils/form.schema";
import { getMinDeadlineDate, type RequestScope } from "@/utils/form.schema";

export const Timeline = withForm({
  ...intakeFormOpts,
  render: ({ form }) => {
    const scope = useStore(form.store, (state) => state.values.requestScope) as RequestScope;

    return (
      <section className="space-y-6">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-400">
          <Clock className="w-5 h-5" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Timeline</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <form.AppField name="deadline">
            {(field) => {
              const selected = parseYmdToLocalDate(field.state.value);
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
              const minDate = getMinDeadlineDate(scope);

              return (
                <Field>
                  <FieldLabel htmlFor={field.name}>Requested Delivery Date</FieldLabel>

                  <Calendar
                    mode="single"
                    selected={selected}
                    onSelect={(date) => field.handleChange(date ? format(date, "yyyy-MM-dd") : "")}
                    disabled={(date) => isBefore(date, minDate) || isWeekend(date)}
                    aria-invalid={isInvalid}
                  />

                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.AppField>

          <div className="space-y-4">
            <form.AppField name="additionalNotes">
              {(field) => (
                <field.TextArea
                  label="Additional Notes"
                  placeholder="Buzzwords to use, color preferences, or ongoing collaboration needs..."
                />
              )}
            </form.AppField>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
                <Clock className="w-4 h-4 text-blue-500" />
                Timeline Requirements
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">General Requests</p>
                    <p className="text-xs text-slate-500 italic">
                      Minimum 7 business days required for standard design assets.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Discovery Sessions</p>
                    <p className="text-xs text-slate-500 italic">
                      Minimum 30 calendar days required for complex strategic planning.
                    </p>
                  </div>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-200 text-xs text-slate-500 italic">
                To expedite a request beyond the required timeline, please have your Director or Assistant Director contact us directly to coordinate priority handling.
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  },
});
