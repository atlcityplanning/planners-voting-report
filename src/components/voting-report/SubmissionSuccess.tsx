import { Calendar, CheckCircle2, ShoppingBag, Target, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IntakeFormData } from "@/utils/form.schema";

interface SubmissionSuccessProps {
  formData: IntakeFormData;
  setSubmitted: (submitted: boolean) => void;
}

export function SubmissionSuccess({
  formData,
  setSubmitted,
  isStandalone = false,
}: SubmissionSuccessProps & { isStandalone?: boolean }) {
  const getScopeLabel = (scope: string) => {
    if (scope === "general") return "General Design Request";
    if (scope === "discovery") return "Discovery Session";
    return scope;
  };

  return (
    <Card className="w-full max-w-4xl mx-auto my-8 border-emerald-100">
      <CardHeader className="text-center pb-8 border-b border-slate-100 bg-emerald-50/30 rounded-t-xl space-y-4">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm border border-emerald-200">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div>
          <CardTitle className="text-2xl font-bold text-slate-900 mb-2">
            Request Submitted
          </CardTitle>
          <CardDescription className="text-base">
            Thank you, {formData.fullName.split(" ")[0]}. Your request has been sent to MarComm.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-8 space-y-8 pt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-1">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Project Title
            </h4>
            <p className="font-medium text-slate-900 text-lg">{formData.requestTitle}</p>
          </div>
          <div className="space-y-1">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Request Type
            </h4>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 border border-indigo-100 text-indigo-700">
              {getScopeLabel(formData.requestScope)}
            </span>
          </div>
          <div className="space-y-1">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Deadline
            </h4>
            <div className="flex items-center gap-2 text-slate-700">
              <Calendar className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-semibold">
                {formData.deadline ? new Date(formData.deadline).toLocaleDateString() : "N/A"}
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Submitted By
            </h4>
            <div className="flex items-center gap-2 text-slate-700 mb-1">
              <User className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-900">{formData.fullName}</span>
            </div>
            <p className="text-xs text-slate-500 pl-6">{formData.email}</p>
          </div>
        </div>

        {/* Additional Request Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100">
          <div className="space-y-1">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Office / Bureau
            </h4>
            <p className="text-sm font-medium text-slate-800">{formData.office}</p>
          </div>
          <div className="space-y-1">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Sponsorship
            </h4>
            {formData.sponsor.supported ? (
              <div>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 mb-1.5">
                  ✓ Confirmed
                </span>
                <p className="text-xs text-slate-600">{formData.sponsor.email}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">No sponsor selected</p>
            )}
          </div>
        </div>

        {/* Scope Specific Details */}
        {formData.requestScope === "general" && (
          <div className="pt-6 border-t border-slate-100 flex flex-col gap-6">
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Deliverables
              </h4>
              <div className="flex flex-wrap gap-2">
                {formData.deliverables.map((p) => (
                  <span
                    key={p}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm font-medium text-slate-700"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 inline mr-1.5 text-slate-400" />{" "}
                    {p.replace(/-/g, " ")}
                  </span>
                ))}
                {formData.deliverables.length === 0 && (
                  <span className="text-sm text-slate-400 italic">None selected</span>
                )}
              </div>
            </div>
            {formData.requestDescription && (
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Description
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed border-l-2 border-slate-200 pl-4 py-1 whitespace-pre-line">
                  {formData.requestDescription}
                </p>
              </div>
            )}
          </div>
        )}

        {formData.requestScope === "discovery" && formData.discovery && (
          <div className="pt-6 border-t border-slate-100 space-y-4">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" /> Discovery Brief
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 bg-slate-50 rounded-xl p-6 border border-slate-100">
              {formData.discovery.audience && (
                <div className="md:col-span-2 space-y-1.5">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase">
                    Target Audience
                  </h4>
                  <p className="text-sm text-slate-800">{formData.discovery.audience}</p>
                </div>
              )}
              {formData.discovery.goals && (
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase">Goals</h4>
                  <p className="text-sm text-slate-800">{formData.discovery.goals}</p>
                </div>
              )}
              {formData.discovery.publicValue && (
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase">Public Value</h4>
                  <p className="text-sm text-slate-800">{formData.discovery.publicValue}</p>
                </div>
              )}
              {formData.discovery.partners && (
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase">Partners</h4>
                  <p className="text-sm text-slate-800">{formData.discovery.partners}</p>
                </div>
              )}
              {formData.discovery.deliverables && (
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase">
                    Expected Deliverables
                  </h4>
                  <p className="text-sm text-slate-800">{formData.discovery.deliverables}</p>
                </div>
              )}
              {formData.discovery.alignment && formData.discovery.alignment.length > 0 && (
                <div className="md:col-span-2 space-y-2 mt-2">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase">Priorities</h4>
                  <div className="flex flex-wrap gap-2">
                    {formData.discovery.alignment.map((p) => (
                      <span
                        key={p}
                        className="px-2.5 py-1 bg-white text-slate-700 text-xs font-medium rounded shadow-sm border border-slate-200"
                      >
                        {p.replace(/-/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Conditional description if included for Discovery too */}
            {formData.requestDescription && (
              <div className="space-y-2 mt-6">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Additional Context
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed border-l-2 border-slate-200 pl-4 py-1 whitespace-pre-line">
                  {formData.requestDescription}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Assets / Attachments */}
        {formData.assets && formData.assets.length > 0 && (
          <div className="pt-6 border-t border-slate-100">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4">
              Attachments & Links ({formData.assets.length})
            </h4>
            <div className="space-y-2">
              {formData.assets.map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-center justify-between p-3 bg-white border border-slate-200 shadow-sm rounded-lg text-sm"
                >
                  <span className="flex items-center gap-3 truncate">
                    <span className="text-[10px] px-2 py-1 bg-slate-100 rounded uppercase font-bold text-slate-500">
                      {asset.type}
                    </span>
                    <span className="text-slate-900 font-medium truncate" title={asset.name}>
                      {asset.name}
                      {asset.size && (
                        <span className="text-xs text-slate-400 font-normal ml-2">
                          ({asset.size})
                        </span>
                      )}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Additional Notes */}
        {formData.additionalNotes && (
          <div className="pt-6 border-t border-slate-100">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Additional Notes
            </h4>
            <p className="text-sm text-slate-600 italic border-l-2 border-amber-200 pl-4 py-1 whitespace-pre-line">
              "{formData.additionalNotes}"
            </p>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-8 pb-8 border-t border-slate-100 flex justify-end px-8 bg-slate-50/50 rounded-b-xl">
        {isStandalone ? (
          <Button asChild className="px-8 py-5 text-sm font-bold shadow-md h-auto">
            <a href="/">Submit Another Request</a>
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => setSubmitted(false)}
            className="px-8 py-5 text-sm font-bold shadow-md h-auto"
          >
            Submit Another Request
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
