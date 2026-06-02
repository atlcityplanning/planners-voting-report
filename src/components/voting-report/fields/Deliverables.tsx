import { useStore } from "@tanstack/react-store";
import { Camera, Globe, Layers, VideoIcon } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError } from "@/components/ui/field";
import { intakeFormOpts } from "@/features/form-options";
import { DELIVERABLE_GROUPS } from "@/utils/form.schema";

import { withForm } from "../../../hooks/form";

export const Deliverables = withForm({
  ...intakeFormOpts,
  render: ({ form }) => {
    const requestScope = useStore(form.store, (state) => state.values.requestScope);

    if (requestScope === "discovery") return null;

    return (
      <section className="space-y-6">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-400">
          <Layers className="w-5 h-5" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Deliverables
          </h2>
        </div>
        <form.AppField name="deliverables" mode="array">
          {(field) => (
            <Field>
              <div className="space-y-6">
                {Object.entries(DELIVERABLE_GROUPS).map(([group, items]) => (
                  <div key={group} className="space-y-3">
                    <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                      {group}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {items.map((item) => {
                        const isChecked = (field.state.value || []).includes(item.id);
                        return (
                          <div key={item.id} className="flex flex-col gap-2">
                            <label
                              className={`flex items-start p-3 rounded-lg border cursor-pointer transition-all ${
                                isChecked
                                  ? "bg-blue-50 border-blue-500 ring-1 ring-blue-500"
                                  : "bg-white border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              <Checkbox
                                id={item.id}
                                checked={isChecked}
                                onCheckedChange={(checked) => {
                                  const current = field.state.value || [];
                                  if (checked) {
                                    field.handleChange([...current, item.id]);
                                  } else {
                                    field.handleChange(
                                      current.filter((val: string) => val !== item.id),
                                    );
                                  }
                                }}
                                className="mr-3 mt-1"
                              />
                              <div className="flex flex-col">
                                <span
                                  className={`text-sm font-medium ${isChecked ? "text-blue-700" : "text-slate-700"}`}
                                >
                                  {item.title}
                                </span>
                              </div>
                            </label>

                            {item.id === "photography" && isChecked && (
                              <div className="mx-1 p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg text-[10px] text-blue-800 animate-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-2 mb-1 font-bold uppercase tracking-wider">
                                  <Camera className="w-3 h-3" /> Note for Photography
                                </div>
                                <p className="opacity-90 text-xs font-medium italic">{item.note}</p>
                              </div>
                            )}

                            {item.id === "website-update" && isChecked && (
                              <div className="mx-1 p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg text-[10px] text-blue-800 animate-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-2 mb-1 font-bold uppercase tracking-wider">
                                  <Globe className="w-3 h-3" /> Note for Website
                                </div>
                                <p className="opacity-90 text-xs font-medium italic">{item.note}</p>
                              </div>
                            )}

                            {item.id === "videography" && isChecked && (
                              <div className="mx-1 p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg text-[10px] text-blue-800 animate-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-2 mb-1 font-bold uppercase tracking-wider">
                                  <VideoIcon className="w-3 h-3" /> Note for Videography
                                </div>
                                <p className="opacity-90 text-xs font-medium italic">{item.note}</p>
                              </div>
                            )}
                            {item.id === "brochure-booklet-program" && isChecked && (
                              <div className="mx-1 p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg text-[10px] text-blue-800 animate-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-2 mb-1 font-bold uppercase tracking-wider">
                                  <Layers className="w-3 h-3" /> Note for Brochure
                                </div>
                                <p className="opacity-90 text-xs font-medium italic">{item.note}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {field.state.meta.isTouched && <FieldError errors={field.state.meta.errors} />}
            </Field>
          )}
        </form.AppField>
      </section>
    );
  },
});
