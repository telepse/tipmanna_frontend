const UK_COUNTRY_VALUES = new Set([
  "united kingdom",
  "uk",
  "gb",
  "great britain",
  "england",
  "scotland",
  "wales",
  "northern ireland",
]);

export function isUkCountry(country?: string | null): boolean {
  if (!country) return false;
  return UK_COUNTRY_VALUES.has(country.trim().toLowerCase());
}
