import { isUkCountry } from "@/lib/is-uk-country";

/**
 * Returns true when a profile field has a meaningful value.
 */
function hasProfileValue(value: unknown): boolean {
  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (typeof value === "boolean") {
    return true;
  }

  if (value instanceof Date) {
    return !Number.isNaN(value.getTime());
  }

  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Calculates profile completeness using only the profile belonging to the
 * selected profile account type. Field lists mirror backend isHostProfileComplete.
 */
export function getProfileCompleteness(
  accountType: "INDIVIDUAL" | "ORGANIZATION" | null,
  profile: Record<string, unknown> | null | undefined
): number | null {
  if (!accountType || !profile) {
    return null;
  }

  const isUk = isUkCountry(String(profile.country ?? ""));

  const requiredFields: unknown[] =
    accountType === "INDIVIDUAL"
      ? [
          profile.firstName,
          profile.lastName,
          profile.homeAddress,
          profile.city,
          profile.state,
          profile.postalCode,
          profile.country,
          isUk ? profile.niNumber : profile.passportNumber,
          ...(isUk ? [] : [profile.additionalTaxIdentification]),
          profile.dateOfBirth,
          profile.gender,
          profile.accountName,
          profile.accountNumber,
          profile.sortCode,
        ]
      : [
          profile.registeredCompanyName,
          profile.companyRegistrationNumber,
          profile.registeredAddress,
          profile.city,
          profile.state,
          profile.postalCode,
          profile.country,
          profile.dateOfBirth,
          profile.gender,
          profile.invoice,
          profile.accountName,
          profile.uniqueTaxpayerReference,
          ...(isUk ? [] : [profile.additionalTaxIdentification]),
          profile.accountNumber,
          profile.sortCode,
        ];

  const completedFields = requiredFields.filter(hasProfileValue).length;

  const completionRatio =
    requiredFields.length > 0 ? completedFields / requiredFields.length : 0;

  if (completionRatio >= 1) {
    return 100;
  }

  if (completionRatio >= 0.9) {
    return 90;
  }

  if (completionRatio >= 0.7) {
    return 70;
  }

  return 50;
}
