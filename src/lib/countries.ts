/* eslint-disable @typescript-eslint/no-explicit-any */
import countriesData from "world-countries";

export const ALL_COUNTRIES = countriesData.map(
  (country: { name: { common: any }; cca2: string }) => ({
    name: country.name.common,
    flag: `https://flagcdn.com/w40/${country.cca2.toLowerCase()}.png`, // ✅ SVG flags
    code: country.cca2,
  })
);
