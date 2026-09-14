import Link from "next/link";

type Props = {
  className?: string;
};

/** Checkbox label with linked terms (cookie policy) and privacy policy. */
export function TermsPrivacyLabel({ className }: Props) {
  return (
    <span className={className}>
      I agree to the{" "}
      <Link
        href="/cookie-policy"
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2"
        onClick={e => e.stopPropagation()}
      >
        terms
      </Link>{" "}
      and{" "}
      <Link
        href="/privacy-policy"
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
