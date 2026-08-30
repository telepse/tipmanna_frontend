"use client";

import { useEffect, useState } from "react";
import {
  lookupUkPostcodeAddresses,
  lookupUkPostcodeCityCountry,
} from "@/lib/postcode-lookup";
import { isUkCountry } from "@/lib/is-uk-country";

type UsePostcodeLookupOptions = {
  postalCode: string;
  country: string;
  onCityChange: (value: string) => void;
  onStateChange: (value: string) => void;
  onCountryChange: (value: string) => void;
  onAddressChange?: (value: string) => void;
};

export function usePostcodeLookup({
  postalCode,
  country,
  onCityChange,
  onStateChange,
  onCountryChange,
  onAddressChange,
}: UsePostcodeLookupOptions) {
  const [addresses, setAddresses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const isUk = isUkCountry(country);

  useEffect(() => {
    if (!isUk) return;

    const fetchPostalData = async () => {
      if (!postalCode || postalCode.length < 3) return;

      try {
        const result = await lookupUkPostcodeCityCountry(postalCode);
        if (!result) return;

        if (result.city) onCityChange(result.city);
        if (result.state) onStateChange(result.state);
        if (result.country) onCountryChange(result.country);
      } catch (error) {
        console.error("Postcode lookup failed:", error);
      }
    };

    void fetchPostalData();
  }, [postalCode, isUk, onCityChange, onStateChange, onCountryChange]);

  const findAddresses = async () => {
    if (!postalCode || !isUk) return;

    setLoading(true);
    try {
      const list = await lookupUkPostcodeAddresses(postalCode);
      setAddresses(list);
      if (list.length > 0 && onAddressChange) {
        onAddressChange(list[0]);
      }
    } catch (error) {
      console.error("Address fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const clearAddresses = () => setAddresses([]);

  return {
    addresses,
    loading,
    isUk,
    findAddresses,
    clearAddresses,
  };
}
