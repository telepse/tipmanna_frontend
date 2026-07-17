import { ALL_COUNTRIES } from "@/lib/countries";

const DEFAULT_CONTENT_LANGUAGE = "en-GB";
const DEFAULT_FLAG_CODE = "gb";

/** Legacy DB values before country combobox used world-countries names. */
const LEGACY_COUNTRY_ALIASES: Record<string, string> = {
  England: "gb",
  Nigeria: "ng",
};

export function normalizeContentLanguage(
  contentLanguage?: string | null
): string {
  const trimmed = contentLanguage?.trim();
  if (!trimmed || trimmed === "England") return DEFAULT_CONTENT_LANGUAGE;
  return trimmed;
}

function languageTagToFlagCode(language: string): string | undefined {
  const parts = language.split("-");
  if (parts.length >= 2) {
    const region = parts[parts.length - 1]!.toLowerCase();
    if (/^[a-z]{2}$/.test(region)) return region;
  }
  return undefined;
}

function countryNameToFlagCode(
  contentCountry?: string | null
): string | undefined {
  const country = contentCountry?.trim();
  if (!country || country === "all") return undefined;

  const legacy = LEGACY_COUNTRY_ALIASES[country];
  if (legacy) return legacy;

  const match = ALL_COUNTRIES.find(c => c.name === country);
  return match?.code.toLowerCase();
}

export function resolveContentLocaleDisplay(
  contentLanguage?: string | null,
  contentCountry?: string | null
): { contentLanguage: string; flagCode: string; flagUrl: string } {
  const normalizedLanguage = normalizeContentLanguage(contentLanguage);

  const flagCode =
    countryNameToFlagCode(contentCountry) ??
    languageTagToFlagCode(normalizedLanguage) ??
    DEFAULT_FLAG_CODE;

  return {
    contentLanguage: normalizedLanguage,
    flagCode,
    flagUrl: `https://flagcdn.com/w40/${flagCode}.png`,
  };
}
