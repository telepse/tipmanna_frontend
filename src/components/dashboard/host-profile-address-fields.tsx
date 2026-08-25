"use client";

import { useCallback } from "react";

import type { Control, FieldPath, FieldValues } from "react-hook-form";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ALL_COUNTRIES } from "@/lib/countries";
import { usePostcodeLookup } from "@/hooks/use-postcode-lookup";

type AddressFieldNames<T extends FieldValues> = {
  address: FieldPath<T>;
  city: FieldPath<T>;
  state: FieldPath<T>;
  postalCode: FieldPath<T>;
  country: FieldPath<T>;
};

type Props<T extends FieldValues> = {
  control: Control<T>;
  setValue: (name: FieldPath<T>, value: string) => void;
  watch: (name: FieldPath<T>) => string;
  fields: AddressFieldNames<T>;
  addressLabel: string;
};

export function HostProfileAddressFields<T extends FieldValues>({
  control,
  setValue,
  watch,
  fields,
  addressLabel,
}: Props<T>) {
  const postalCode = watch(fields.postalCode) ?? "";
  const country = watch(fields.country) ?? "";

  const onCityChange = useCallback(
    (value: string) => setValue(fields.city, value),
    [fields.city, setValue]
  );

  const onStateChange = useCallback(
    (value: string) => setValue(fields.state, value),
    [fields.state, setValue]
  );

  const onCountryChange = useCallback(
    (value: string) => setValue(fields.country, value),
    [fields.country, setValue]
  );

  const onAddressChange = useCallback(
    (value: string) => setValue(fields.address, value),
    [fields.address, setValue]
  );

  const { addresses, loading, isUk, findAddresses, clearAddresses } =
    usePostcodeLookup({
      postalCode,
      country,
      onCityChange,
      onStateChange,
      onCountryChange,
      onAddressChange,
    });

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* Registered address */}
      <FormField
        control={control}
        name={fields.address}
        render={({ field }) => (
          <FormItem className="w-full min-w-0">
            <FormLabel>{addressLabel}</FormLabel>

            <FormControl>
              {isUk && addresses.length > 0 ? (
                <Select
                  onValueChange={value => {
                    field.onChange(value);
                    clearAddresses();
                  }}
                  value={field.value || ""}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue placeholder="Select address..." />
                  </SelectTrigger>

                  <SelectContent>
                    {addresses.map((addr, idx) => (
                      <SelectItem
                        key={idx}
                        value={addr}
                      >
                        {addr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type="text"
                  autoComplete="off"
                  className="w-full min-w-0"
                  {...field}
                />
              )}
            </FormControl>

            <FormMessage />
          </FormItem>
        )}
      />

      {/* Postal code */}
      <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:gap-2">
        <div className="w-full min-w-0 flex-1">
          <FormField
            control={control}
            name={fields.postalCode}
            render={({ field }) => (
              <FormItem className="w-full min-w-0">
                <FormLabel>Postal code</FormLabel>

                <FormControl>
                  <Input
                    type="text"
                    placeholder="Enter postal code"
                    autoComplete="off"
                    className="w-full min-w-0"
                    {...field}
                  />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {isUk ? (
          <Button
            type="button"
            size="sm"
            className="w-full shrink-0 sm:mb-0.5 sm:w-auto"
            disabled={loading || !postalCode}
            onClick={() => void findAddresses()}
          >
            {loading ? "Finding address..." : "Find address"}
          </Button>
        ) : null}
      </div>

      {/* City / State / Country */}
      <div className="grid w-full min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
        {/* City */}
        <FormField
          control={control}
          name={fields.city}
          render={({ field }) => (
            <FormItem className="w-full min-w-0">
              <FormLabel>City</FormLabel>

              <FormControl>
                <Input
                  type="text"
                  autoComplete="off"
                  className="w-full min-w-0"
                  {...field}
                />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        {/* State / County */}
        <FormField
          control={control}
          name={fields.state}
          render={({ field }) => (
            <FormItem className="w-full min-w-0">
              <FormLabel>State / County</FormLabel>

              <FormControl>
                <Input
                  type="text"
                  autoComplete="off"
                  className="w-full min-w-0"
                  {...field}
                />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        {/* Country */}
        <FormField
          control={control}
          name={fields.country}
          render={({ field }) => (
            <FormItem className="w-full min-w-0">
              <FormLabel>Country</FormLabel>

              <FormControl>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || ""}
                >
                  <SelectTrigger className="h-12 w-full min-w-0">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>

                  <SelectContent>
                    {ALL_COUNTRIES.map(countryOption => (
                      <SelectItem
                        key={countryOption.code}
                        value={countryOption.name}
                      >
                        {countryOption.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
