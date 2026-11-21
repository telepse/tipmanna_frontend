"use client";

import { useState } from "react";

import Image from "next/image";

import { ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";

import { ALL_COUNTRIES } from "@/lib/countries";

import {
  CREATE_FORM_COMMAND_CLASS,
  CREATE_FORM_COMMAND_GROUP_CLASS,
  CREATE_FORM_COMMAND_ITEM_CLASS,
  CREATE_FORM_SELECT_CONTENT_CLASS,
} from "@/lib/create-form-theme";

import { cn } from "@/lib/utils";

export type VideoLinkLocaleAppearance = "onDark" | "onLight";

export interface VideoLinkContentCountryComboboxProps {
  value: string;
  onChange: (countryValue: string) => void;
  appearance?: VideoLinkLocaleAppearance;
  disabled?: boolean;
}

/**
 * Shared content-country picker used by host create flows and event-room
 * "add video".
 *
 * Stores `country.name` from ALL_COUNTRIES, or `"all"` for worldwide
 * (matches schema defaults).
 *
 * The popup is rendered through Radix Popover's portal and given a z-index
 * higher than the CreateDialog so the country list always appears above
 * the AddVideoForm/DialogContent.
 */
export function VideoLinkContentCountryCombobox({
  value,
  onChange,
  appearance = "onDark",
  disabled,
}: VideoLinkContentCountryComboboxProps) {
  const [open, setOpen] = useState(false);

  const triggerTone =
    appearance === "onDark"
      ? "flex h-12 w-full justify-between border bg-black/25 text-white hover:bg-black/50 hover:text-white"
      : "flex h-12 w-full justify-between border border-input bg-background font-normal hover:bg-accent hover:text-accent-foreground";

  const flagMeta =
    value && value !== "all"
      ? ALL_COUNTRIES.find(country => country.name === value)
      : undefined;

  const triggerLabel =
    value === "all" ? "" : value && flagMeta ? value : value || null;

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          aria-expanded={open}
          className={cn(triggerTone)}
        >
          {triggerLabel ? (
            <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
              {value !== "all" && flagMeta?.flag ? (
                <Image
                  src={flagMeta.flag}
                  alt={flagMeta.name}
                  width={20}
                  height={20}
                  className="size-5 shrink-0 rounded"
                />
              ) : null}

              <span className="truncate">{triggerLabel}</span>
            </span>
          ) : (
            <span
              className={cn(
                "truncate",
                appearance === "onDark"
                  ? "text-white/60"
                  : "text-muted-foreground"
              )}
            >
              Select a region...
            </span>
          )}

          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={4}
        avoidCollisions={false}
        className={cn(
          /*
           * IMPORTANT:
           *
           * CreateDialog currently uses z-[1000038].
           * This popup therefore needs to be above that stacking level.
           *
           * Radix PopoverContent is portalled, so this prevents the
           * country list from being trapped underneath the AddVideoForm.
           */
          "z-[1000100] w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] min-w-60 p-0",

          /*
           * Keep the popup visually consistent with the existing
           * create-form styling.
           */
          "overflow-hidden",

          appearance === "onDark" ? CREATE_FORM_SELECT_CONTENT_CLASS : undefined
        )}
      >
        <Command
          className={cn(
            "w-full",
            appearance === "onDark" ? CREATE_FORM_COMMAND_CLASS : undefined
          )}
        >
          <CommandInput placeholder="Search a country..." />

          <CommandEmpty>No country found.</CommandEmpty>

          <CommandGroup
            heading="Countries"
            className={cn(
              appearance === "onDark"
                ? CREATE_FORM_COMMAND_GROUP_CLASS
                : undefined
            )}
          >
            {ALL_COUNTRIES.map(country => (
              <CommandItem
                key={country.code}
                value={country.name}
                onSelect={() => {
                  onChange(country.name);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center gap-2",
                  appearance === "onDark"
                    ? CREATE_FORM_COMMAND_ITEM_CLASS
                    : undefined
                )}
              >
                <Image
                  src={country.flag}
                  alt={country.name}
                  width={20}
                  height={20}
                  className="size-5 shrink-0 rounded"
                />

                <span className="truncate">{country.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
