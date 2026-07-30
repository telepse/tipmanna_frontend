const NOMINATIM_API_URL = "https://nominatim.openstreetmap.org/search";

type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state?: string;
  country?: string;
};

type NominatimResult = {
  display_name: string;
  address?: NominatimAddress;
};

async function fetchNominatim(
  postalCode: string,
  limit: number
): Promise<NominatimResult[]> {
  const res = await fetch(
    `${NOMINATIM_API_URL}?q=${encodeURIComponent(postalCode)}&format=json&addressdetails=1&limit=${limit}&countrycodes=gb`,
    {
      headers: { "User-Agent": "TipmannaHostProfile/1.0" },
    }
  );

  if (!res.ok) {
    throw new Error("Postcode lookup failed");
  }

  const data = (await res.json()) as NominatimResult[];
  return Array.isArray(data) ? data : [];
}

export async function lookupUkPostcodeCityCountry(postalCode: string) {
  if (!postalCode || postalCode.length < 3) {
    return null;
  }

  const results = await fetchNominatim(postalCode, 1);
  const first = results[0];
  if (!first?.address) {
    return null;
  }

  const { address } = first;
  return {
    city: address.city || address.town || address.village || "",
    state: address.county || address.state || "",
    country: address.country || "United Kingdom",
  };
}

export async function lookupUkPostcodeAddresses(postalCode: string) {
  if (!postalCode) {
    return [];
  }

  const results = await fetchNominatim(postalCode, 50);
  return results.map(item => item.display_name);
}
