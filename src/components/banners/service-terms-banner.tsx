import Link from "next/link";

// Third-party imports
import { ArrowRight, ScrollText } from "lucide-react";

// Local imports
import { LEGAL_ROUTES } from "@/lib/legal-routes";

interface Props {
  className?: string;
}

export const ServiceTermsBanner = ({ className }: Props) => {
  return (
    <aside
      aria-label="Tipmanna Service Terms and Conditions"
      className={`border-primary/30 bg-primary/5 flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6 ${className ?? ""}`}
    >
      <div className="flex items-start gap-3">
        <ScrollText
          aria-hidden
          className="text-primary mt-1 size-6 shrink-0"
        />
        <div className="space-y-1">
          <p className="open_sans text-base font-semibold sm:text-lg">
            Looking for the Tipmanna Service Terms and Conditions?
          </p>
          <p className="open_sans text-muted-foreground text-sm sm:text-base">
            This page only covers cookies. The rules for using Tipmanna,
            including the Tipmanna TV app for Android TV, are in our Service
            Terms and Conditions.
          </p>
        </div>
      </div>

      <Link
        href={LEGAL_ROUTES.serviceTerms}
        className="bg-primary open_sans inline-flex shrink-0 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
      >
        Read the Service Terms and Conditions
        <ArrowRight
          aria-hidden
          className="size-4"
        />
      </Link>
    </aside>
  );
};
