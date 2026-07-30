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
    <>
      <FormField
        control={control}
        name={fields.address}
        render={({ field }) => (
          <FormItem>
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
                  <SelectTrigger className="w-full">
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
                  {...field}
                />
              )}
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <FormField
            control={control}
            name={fields.postalCode}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Postal code</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="Enter postal code"
                    autoComplete="off"
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
            className="mb-0.5"
            disabled={loading || !postalCode}
            onClick={() => void findAddresses()}
          >
            {loading ? "Finding address..." : "Find address"}
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <FormField
          control={control}
          name={fields.city}
          render={({ field }) => (
            <FormItem>
              <FormLabel>City</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  autoComplete="off"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={fields.state}
          render={({ field }) => (
            <FormItem>
              <FormLabel>State / County</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  autoComplete="off"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={fields.country}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Country</FormLabel>
              <FormControl>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <SelectTrigger className="h-12 !w-full">
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
    </>
  );
}
