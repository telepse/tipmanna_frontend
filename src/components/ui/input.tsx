import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input open_sans flex h-13 w-full min-w-0 rounded border bg-transparent px-3 py-1 text-sm outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus:ring-primary focus-visible:ring-2",
        "aria-invalid:ring-destructive dark:aria-invalid:ring-destructive aria-invalid:ring-2",
        className
      )}
      {...props}
    />
  );
}

export { Input };
