import { useStore } from "@tanstack/react-form-start";
import { CheckCircle2, Handshake, Heart, Target, TrendingUp, Users } from "lucide-react";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { intakeFormOpts } from "@/features/form-options";
import { cn } from "@/utils/cn";

import { withForm } from "../../../hooks/form";

const CITY_PRIORITIES = [
  {
    title: "One Safe City",
    id: "one-safe-city",
    desc: "The One Safe City plan is a balanced approach that mobilizes the entire government and engages our partners, communities and residents. It addresses the root causes of crime as well as targets gangs, drugs, illegal guns and repeat offenders. One Safe City is working to keep all our neighborhoods safe and welcoming for residents, visitors and businesses.",
  },
  {
    title: "A City of Opportunity for All",
    id: "city-opportunity",
    desc: "We want to ensure that all Atlantans share in Atlanta’s growth and prosperity. We invest in our young people, care for the most vulnerable and create opportunities for all to advance. This means a focus on education, workforce development, equity programs, affordable housing and other initiatives to support our residents.",
  },
  {
    title: "A City Built for the Future",
    id: "city-future",
    desc: "We are making smart investments to improve Atlanta’s existing infrastructure while developing and implementing new infrastructure projects to meet the needs of today and prepare for the needs of the future. From new investments in transportation that build a safe, equitable mobility network throughout Atlanta, to resilience and sustainability actions that can be taken at the local level to combat the global climate crisis, we believe investing in infrastructure is essential for fostering economic growth and improving Atlanta’s competitiveness on the world stage.",
  },
  {
    title: "Effective & Ethical Government",
    id: "ethical-gov",
    desc: "Atlanta’s success is directly tied to how much confidence residents and businesses have in City policies and practices. We want to foster a culture of integrity and innovation in the City. This includes transparency, efficiency and accountability for City actions and decision-making. It also means delivering on City services and programs, being responsive to resident needs and providing timely, reliable information.",
  },
];

const DCP_PRIORITIES = [
  {
    title: "Equitable Growth & Housing",
    id: "equitable-growth",
    desc: "Enable high-quality, sustainable growth while facilitating abundant housing opportunities for all Atlantans.",
  },
  {
    title: "Thriving & Well-Designed Communities",
    id: "thriving-communities",
    desc: "Support vibrant neighborhoods through exceptional architecture, thoughtfully designed public spaces, and preservation of historic resources.",
  },
  {
    title: "Effective Planning & Safe Development",
    id: "effective-planning",
    desc: "Advance innovative regulatory practices that guide responsible development and ensure safe, resilient, and durable buildings.",
  },
  {
    title: "Service & Public Engagement",
    id: "service-engagement",
    desc: "Deliver attentive customer service and foster meaningful community engagement in planning and development decisions.",
  },
];

export const DiscoveryBrief = withForm({
  ...intakeFormOpts,
  render: ({ form }) => {
    const requestScope = useStore(form.store, (state) => state.values.requestScope);

    if (requestScope !== "discovery") return null;

    return (
      <div className="space-y-6 p-6 bg-purple-50/50 rounded-xl border border-purple-100 animate-in fade-in slide-in-from-top-4">
        <h2 className="flex items-center gap-2 font-bold text-purple-900 uppercase border-b border-purple-200 pb-2">
          <Target className="w-5 h-5" /> Discovery Session Brief
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <form.AppField name="discovery.projectType">
            {(field) => (
              <div className="md:col-span-2">
                <FieldLabel className="mb-3">Project Type</FieldLabel>
                <field.RadioGroup
                  options={[
                    {
                      id: "event",
                      title: "Event",
                      description: "A specific gathering or happening",
                    },
                    {
                      id: "program",
                      title: "Program",
                      description: "An ongoing set of related activities",
                    },
                    {
                      id: "initiative",
                      title: "Initiative",
                      description: "An ongoing effort, plan, or process designed to address a need",
                    },
                  ]}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4"
                  itemClassName="border-purple-500 bg-purple-50 shadow-sm ring-1 ring-purple-500"
                />
              </div>
            )}
          </form.AppField>

          <form.Subscribe selector={(state) => state.values.discovery?.projectType}>
            {(projectType) =>
              projectType === "event" ? (
                <form.AppField name="discovery.eventDate">
                  {(field) => (
                    <div className="md:col-span-2 animate-in fade-in slide-in-from-top-2">
                      <field.Input type="date" label="Event Date" />
                    </div>
                  )}
                </form.AppField>
              ) : null
            }
          </form.Subscribe>

          <form.AppField name="discovery.audience">
            {(field) => (
              <field.TextArea
                label="Target Audience and Stakeholders"
                icon={Users}
                className="min-h-[80px]"
              />
            )}
          </form.AppField>
          <form.AppField name="discovery.publicValue">
            {(field) => (
              <field.TextArea label="Public Value" icon={Heart} className="min-h-[80px]" />
            )}
          </form.AppField>
          <form.AppField name="discovery.goals">
            {(field) => <field.TextArea label="Goals" icon={TrendingUp} className="min-h-[80px]" />}
          </form.AppField>
          <form.AppField name="discovery.partners">
            {(field) => (
              <field.TextArea
                label="Partners and Collaborators"
                icon={Handshake}
                className="min-h-[80px]"
              />
            )}
          </form.AppField>
        </div>

        <form.AppField name="discovery.alignment">
          {(field) => (
            <Field>
              <FieldLabel className="text-xs text-slate-500 uppercase">
                City Priorities Alignment
              </FieldLabel>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                {CITY_PRIORITIES.map((priority) => {
                  const values = (field.state.value as string[]) || [];
                  const isSelected = values.includes(priority.title);
                  return (
                    <button
                      key={priority.id}
                      type="button"
                      className={cn(
                        "group relative p-4 rounded-xl border cursor-pointer transition-all duration-300 ease-out text-left w-full h-fit flex flex-col gap-1",
                        isSelected
                          ? "bg-purple-50 border-purple-500 shadow-sm ring-1 ring-purple-500"
                          : "bg-white border-slate-200 hover:border-purple-400 hover:bg-slate-50",
                      )}
                      onClick={() => {
                        if (isSelected) {
                          field.handleChange(values.filter((v: string) => v !== priority.title));
                        } else {
                          field.handleChange([...values, priority.title]);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between w-full gap-3">
                        <div>
                          <h3
                            className={cn(
                              "text-sm font-bold transition-colors",
                              isSelected
                                ? "text-purple-900"
                                : "text-slate-500 group-hover:text-slate-600",
                            )}
                          >
                            {priority.title}
                          </h3>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0" />
                        )}
                      </div>

                      {/* Description reveals on hover */}
                      <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-300 ease-out">
                        <div className="overflow-hidden">
                          <p className="text-[11px] leading-relaxed text-slate-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
                            {priority.desc}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {field.state.meta.isTouched && <FieldError errors={field.state.meta.errors} />}
            </Field>
          )}
        </form.AppField>

        <form.AppField name="discovery.dcpAlignment">
          {(field) => (
            <Field>
              <FieldLabel className="text-xs text-slate-500 uppercase">
                Department of City Planning Priorities
              </FieldLabel>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                {DCP_PRIORITIES.map((priority) => {
                  const values = (field.state.value as string[]) || [];
                  const isSelected = values.includes(priority.title);
                  return (
                    <button
                      key={priority.id}
                      type="button"
                      className={cn(
                        "group relative p-4 rounded-xl border cursor-pointer transition-all duration-300 ease-out text-left w-full h-fit flex flex-col gap-1",
                        isSelected
                          ? "bg-purple-50 border-purple-500 shadow-sm ring-1 ring-purple-500"
                          : "bg-white border-slate-200 hover:border-purple-400 hover:bg-slate-50",
                      )}
                      onClick={() => {
                        if (isSelected) {
                          field.handleChange(values.filter((v: string) => v !== priority.title));
                        } else {
                          field.handleChange([...values, priority.title]);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between w-full gap-3">
                        <div>
                          <h3
                            className={cn(
                              "text-sm font-bold transition-colors",
                              isSelected
                                ? "text-purple-900"
                                : "text-slate-500 group-hover:text-slate-600",
                            )}
                          >
                            {priority.title}
                          </h3>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0" />
                        )}
                      </div>

                      {/* Description reveals on hover */}
                      <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-300 ease-out">
                        <div className="overflow-hidden">
                          <p className="text-[11px] leading-relaxed text-slate-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
                            {priority.desc}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {field.state.meta.isTouched && <FieldError errors={field.state.meta.errors} />}
            </Field>
          )}
        </form.AppField>

        <form.AppField name="discovery.deliverables">
          {(field) => (
            <field.TextArea
              label="Specific Deliverables Needed"
              placeholder="List expected outcomes..."
              className="min-h-[100px]"
            />
          )}
        </form.AppField>
      </div>
    );
  },
});
