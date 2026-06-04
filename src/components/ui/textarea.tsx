import * as React from "react";

import { cn } from "@/utils/cn";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-foreground bg-card focus-visible:border-primary focus-visible:ring-primary/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 resize-y rounded-none border-2 px-3 py-3 text-base transition-colors focus-visible:ring-[3px] aria-invalid:ring-[3px] md:text-sm placeholder:text-muted-foreground flex field-sizing-content min-h-24 w-full outline-none disabled:cursor-not-allowed disabled:opacity-50 autofill:bg-transparent! autofill:[transition:background-color_5000s_ease-in-out_0s]! autofill:[-webkit-text-fill-color:var(--color-foreground)]!",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
