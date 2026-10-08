"use client";

import { useState } from "react";

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

import { ALL_LANGUAGES } from "@/lib/languages";

import {
  CREATE_FORM_COMMAND_CLASS,
  CREATE_FORM_COMMAND_GROUP_CLASS,
  CREATE_FORM_COMMAND_ITEM_CLASS,
  CREATE_FORM_SELECT_CONTENT_CLASS,
} from "@/lib/create-form-theme";

import { cn } from "@/lib/utils";

import type { VideoLinkLocaleAppearance } from "@/components/events/video-link-content-country-combobox";

export interface VideoLinkContentLanguageComboboxProps {
  value: string;
  onChange: (languageCode: string) => void;
  appearance?: VideoLinkLocaleAppearance;
  disabled?: boolean;
}

/**
 * Shared content-language picker used by host create flows and event-room
 * "add video".
 *
 * Stores language names from ALL_LANGUAGES.
 *
 * The popup is rendered through Radix Popover's portal and given a z-index
 * higher than the CreateDialog so the language list always appears above
 * the AddVideoForm/DialogContent.
 */
export function VideoLinkContentLanguageCombobox({
  value,
  onChange,
  appearance = "onDark",
  disabled,
}: VideoLinkContentLanguageComboboxProps) {
  const [open, setOpen] = useState(false);

  const triggerTone =
    appearance === "onDark"
      ? "flex h-12 w-full justify-between border bg-black/25 text-white hover:bg-black/50 hover:text-white"
      : "flex h-12 w-full justify-between border border-input bg-background font-normal hover:bg-accent hover:text-accent-foreground";

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
          {value ? (
            <span className="min-w-0 truncate">{value}</span>
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
           * CreateDialog currently uses z-[1000038].
           *
           * Keep the language popup above the dialog and the AddVideoForm.
           */
          "z-[1000100] w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] min-w-60 p-0",

          /*
           * Prevent the Command content from visually spilling outside
           * the popup container.
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
          <CommandInput placeholder="Search a language..." />

          <CommandEmpty>No language found.</CommandEmpty>

          <CommandGroup
            heading="Languages"
            className={cn(
              appearance === "onDark"
                ? CREATE_FORM_COMMAND_GROUP_CLASS
                : undefined
            )}
          >
            {ALL_LANGUAGES.map(lang => (
              <CommandItem
                key={lang.name}
                value={lang.name}
                onSelect={() => {
                  onChange(lang.name);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center gap-2",
                  appearance === "onDark"
                    ? CREATE_FORM_COMMAND_ITEM_CLASS
                    : undefined
                )}
              >
                <span className="truncate">{lang.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
