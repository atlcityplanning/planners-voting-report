import { z } from "zod";

import { formSchema } from "@/utils/form.schema";
import { logger } from "@/utils/logger";

export type FormData = z.infer<typeof formSchema>;

export class FormLoggerService {
  /**
   * Logs validation errors or successful submissions
   */
  static async logSubmission(data: FormData) {
    logger.info("Form submission received", {
      scope: "FormLoggerService",
      requestId: crypto.randomUUID(),
      fullName: data.fullName,
      email: data.email,
      office: data.office,
      requestScope: data.requestScope,
      requestTitle: data.requestTitle,
      requestDescription: data.requestDescription,
      sponsorEmail: data.sponsor.email,
      deliverables: "deliverables" in data ? data.deliverables : undefined,
      deadline: data.deadline,
    });

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    logger.debug("Full payload", {
      scope: "FormLoggerService",
      payload: data,
    });

    return { success: true, id: crypto.randomUUID() };
  }
}
