import Link from "next/link";

import { LEGAL_ROUTES } from "@/lib/legal-routes";

type Props = {
  className?: string;
};

/** Checkbox label with linked service terms and conditions and privacy policy. */
export function TermsPrivacyLabel({ className }: Props) {
  return (
    <span className={className}>
      I agree to the{" "}
      <Link
        href={LEGAL_ROUTES.serviceTerms}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2"
        onClick={e => e.stopPropagation()}
      >
        terms and conditions
      </Link>{" "}
      and{" "}
      <Link
        href={LEGAL_ROUTES.privacyPolicy}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2"
        onClick={e => e.stopPropagation()}
      >
        privacy policy
      </Link>
    </span>
  );
}
