import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[96px] w-full rounded-md border border-border bg-card px-4 py-3 text-base text-cream",
          "placeholder:text-cream-40",
          "focus-visible:border-gold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-colors resize-none",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
