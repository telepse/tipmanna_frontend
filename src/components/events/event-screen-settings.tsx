"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

// UI Components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";

// Local imports
import { SCREEN_BACKGROUNDS } from "@/lib/backgrounds";

// Types matching your Prisma schema
type TipUsageType =
  | "PERFORMER_WELFARE"
  | "HOST_WELFARE"
  | "COHOST_WELFARE"
  | "CUSTOM";

interface TipUsageDisclosure {
  id?: string;
  usageType: TipUsageType;
  percentage: number;
  customLabel?: string | null; // Allow null
  enabled?: boolean;
}

interface EventScreenSettingsValues {
  background: string;
  moneyFor: string;
  showLatest: boolean;
  hideProgressAmount: boolean;
  tipUsageDisclosure: Array<{
    id?: string;
    usageType: "PERFORMER_WELFARE" | "HOST_WELFARE" | "COHOST_WELFARE";
    percentage: number;
    customLabel?: string | null;
  }>;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (values: EventScreenSettingsValues) => void;
  initialBackground?: string;
  initialMoneyFor: string;
  initialShowLatest?: boolean;
  initialHideProgressAmount?: boolean;
  loading: boolean;
  tipUsageDisclosure: TipUsageDisclosure[];
}

// Default labels for each enum value
const DEFAULT_LABELS: Record<
  "PERFORMER_WELFARE" | "HOST_WELFARE" | "COHOST_WELFARE",
  string
> = {
  PERFORMER_WELFARE: "Performer Welfare",
  HOST_WELFARE: "Host Welfare",
  COHOST_WELFARE: "Co-host Welfare",
};

export const EventScreenSettings = ({
  open,
  onClose,
  onSave,
  initialBackground,
  initialMoneyFor = "",
  initialShowLatest = false,
  initialHideProgressAmount = false,
  loading,
  tipUsageDisclosure: initialTipDisclosures,
}: Props) => {
  const [background, setBackground] = useState(initialBackground || "");
  const [moneyFor, setMoneyFor] = useState(initialMoneyFor);
  const [showLatest, setShowLatest] = useState(initialShowLatest);
  const [hideProgressAmount, setHideProgressAmount] = useState(
    initialHideProgressAmount
  );
  const [tipDisclosures, setTipDisclosures] = useState<TipUsageDisclosure[]>(
    []
  );

  const router = useRouter();

  // Initialize state when modal opens
  useEffect(() => {
    setBackground(initialBackground || "");
    setMoneyFor(initialMoneyFor);
    setShowLatest(initialShowLatest);
    setHideProgressAmount(initialHideProgressAmount);

    if (initialTipDisclosures && initialTipDisclosures.length > 0) {
      // Map backend disclosures to our internal format
      const mappedDisclosures = initialTipDisclosures.map(disclosure => {
        // For disclosures without customLabel, use the default label
        let customLabel = disclosure.customLabel;
        if (!customLabel && disclosure.usageType !== "CUSTOM") {
          customLabel =
            DEFAULT_LABELS[
              disclosure.usageType as
                | "PERFORMER_WELFARE"
                | "HOST_WELFARE"
                | "COHOST_WELFARE"
            ];
        }

        return {
          ...disclosure,
          customLabel,
          enabled: true, // All backend disclosures are enabled
        };
      });

      setTipDisclosures(mappedDisclosures);
    } else {
      // Default: all three default types with default labels, all enabled
      const defaultDisclosures: TipUsageDisclosure[] = [
        {
          usageType: "PERFORMER_WELFARE",
          percentage: 50,
          customLabel: "Performer Welfare",
          enabled: true,
        },
        {
          usageType: "HOST_WELFARE",
          percentage: 20,
          customLabel: "Host Welfare",
          enabled: true,
        },
        {
          usageType: "COHOST_WELFARE",
          percentage: 30,
          customLabel: "Co-host Welfare",
          enabled: true,
        },
      ];

      setTipDisclosures(defaultDisclosures);
    }
  }, [
    open,
    initialBackground,
    initialMoneyFor,
    initialShowLatest,
    initialHideProgressAmount,
    initialTipDisclosures,
  ]);

  const handleLabelChange = (index: number, value: string) => {
    const newDisclosures = [...tipDisclosures];
    newDisclosures[index] = {
      ...newDisclosures[index],
      customLabel: value,
    };
    setTipDisclosures(newDisclosures);
  };

  const handlePercentageChange = (index: number, value: string) => {
    const newDisclosures = [...tipDisclosures];
    newDisclosures[index] = {
      ...newDisclosures[index],
      percentage: value === "" ? 0 : parseFloat(value) || 0,
    };
    setTipDisclosures(newDisclosures);
  };

  const handlePercentageBlur = (index: number) => {
    const newDisclosures = [...tipDisclosures];
    const currentValue = newDisclosures[index].percentage;
    if (isNaN(currentValue) || currentValue < 0) {
      newDisclosures[index] = {
        ...newDisclosures[index],
        percentage: 0,
      };
      setTipDisclosures(newDisclosures);
    }
  };

  const handleCheckboxChange = (index: number, checked: boolean) => {
    const newDisclosures = [...tipDisclosures];
    const currentDisclosure = newDisclosures[index];

    newDisclosures[index] = {
      ...currentDisclosure,
      enabled: checked,
      percentage:
        checked && currentDisclosure.percentage === 0
          ? getDefaultPercentage(currentDisclosure.usageType)
          : currentDisclosure.percentage,
    };

    setTipDisclosures(newDisclosures);
  };

  const getDefaultPercentage = (usageType: TipUsageType): number => {
    switch (usageType) {
      case "PERFORMER_WELFARE":
        return 50;
      case "HOST_WELFARE":
        return 20;
      case "COHOST_WELFARE":
        return 30;
      default:
        return 0;
    }
  };

  const addCustomDisclosure = () => {
    const customLabel = `Custom Item`;
    const newDisclosure: TipUsageDisclosure = {
      usageType: "CUSTOM",
      percentage: 0,
      customLabel,
      enabled: true,
    };

    setTipDisclosures([...tipDisclosures, newDisclosure]);
  };

  const removeDisclosure = (index: number) => {
    const enabledDisclosures = tipDisclosures.filter(d => d.enabled);
    if (enabledDisclosures.length <= 1 && tipDisclosures[index].enabled) {
      alert("You must have at least one enabled tip allocation.");
      return;
    }

    const newDisclosures = tipDisclosures.filter((_, i) => i !== index);
    setTipDisclosures(newDisclosures);
  };

  const handleSave = () => {
    // Only include enabled disclosures
    const enabledDisclosures = tipDisclosures.filter(d => d.enabled);

    // Validate at least one disclosure is enabled
    if (enabledDisclosures.length === 0) {
      alert("Please enable at least one tip allocation.");
      return;
    }

    // Validate percentages sum to 100%
    const totalPercentage = enabledDisclosures.reduce(
      (sum, item) => sum + item.percentage,
      0
    );

    if (Math.abs(totalPercentage - 100) > 0.01) {
      alert(
        `Tip percentages must sum to 100%. Currently: ${totalPercentage.toFixed(1)}%`
      );
      return;
    }

    // Prepare data for backend - map CUSTOM items to HOST_WELFARE
    const backendDisclosures = enabledDisclosures.map(
      ({ enabled, usageType, percentage, customLabel, id }) => {
        // Map CUSTOM items to HOST_WELFARE for backend
        const backendUsageType =
          usageType === "CUSTOM"
            ? "HOST_WELFARE"
            : (usageType as
                | "PERFORMER_WELFARE"
                | "HOST_WELFARE"
                | "COHOST_WELFARE");

        // For custom labels that are just the default label, send null
        const finalCustomLabel =
          customLabel === DEFAULT_LABELS[backendUsageType]
            ? null
            : customLabel || null;

        return {
          id: id || undefined,
          usageType: backendUsageType,
          percentage,
          customLabel: finalCustomLabel,
        };
      }
    );

    // Call onSave with properly formatted data
    onSave({
      background,
      moneyFor,
      showLatest,
      hideProgressAmount,
      tipUsageDisclosure: backendDisclosures,
    });
  };

  // Calculate total percentage for enabled disclosures only
  const enabledDisclosures = tipDisclosures.filter(d => d.enabled);
  const totalPercentage = enabledDisclosures.reduce(
    (sum, item) => sum + item.percentage,
    0
  );

  const copyOverlay = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onClose}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Screen Display Settings</DialogTitle>
        </DialogHeader>

        {/* Background Selection */}
        <div className="space-y-3">
          <Label>Background</Label>
          <div className="grid grid-cols-3 gap-3">
            {SCREEN_BACKGROUNDS.map(bg => (
              <button
                key={bg.url}
                type="button"
                onClick={() => setBackground(bg.url)}
                className={`relative overflow-hidden rounded-md transition-all ${
                  background === bg.url
                    ? "ring-primary ring-2 ring-offset-2"
                    : "hover:opacity-90"
                }`}
              >
                <Image
                  src={bg.url}
                  alt="Background option"
                  width={120}
                  height={80}
                  className="h-20 w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Money For */}
        {/* <div className="space-y-3">
          <Label htmlFor="moneyFor">Money For (Description)</Label>
          <Input
            id="moneyFor"
            type="text"
            value={moneyFor}
            onChange={e => setMoneyFor(e.target.value)}
            placeholder="E.g., Performer welfare, Venue expenses"
          />
        </div> */}

        {/* Tip Usage Disclosure */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Money For</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCustomDisclosure}
              className="h-8"
            >
              + Add Item
            </Button>
          </div>

          <div className="space-y-3 rounded-md border p-3">
            {tipDisclosures.map((disclosure, index) => (
              <div
                key={index}
                className="flex items-center gap-2"
              >
                <Checkbox
                  checked={disclosure.enabled}
                  onCheckedChange={checked =>
                    handleCheckboxChange(index, checked as boolean)
                  }
                  className="h-5 w-5 shrink-0"
                />

                <Input
                  type="text"
                  value={disclosure.customLabel || ""}
                  onChange={e => handleLabelChange(index, e.target.value)}
                  placeholder={
                    disclosure.usageType === "CUSTOM"
                      ? "Enter custom label"
                      : DEFAULT_LABELS[
                          disclosure.usageType as
                            | "PERFORMER_WELFARE"
                            | "HOST_WELFARE"
                            | "COHOST_WELFARE"
                        ] || "Enter label"
                  }
                  className={`min-w-0 flex-1 ${!disclosure.enabled ? "opacity-50" : ""}`}
                  disabled={!disclosure.enabled}
                  onFocus={e => e.target.select()}
                />

                <div className="flex w-28 shrink-0 items-center gap-1">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={
                      disclosure.percentage === 0 ? "" : disclosure.percentage
                    }
                    onChange={e =>
                      handlePercentageChange(index, e.target.value)
                    }
                    onBlur={() => handlePercentageBlur(index)}
                    className={`text-center ${!disclosure.enabled ? "opacity-50" : ""}`}
                    disabled={!disclosure.enabled}
                    onFocus={e => e.target.select()}
                    placeholder="0"
                  />
                  <span
                    className={`w-6 text-sm ${!disclosure.enabled ? "opacity-50" : ""}`}
                  >
                    %
                  </span>
                </div>

                {/* Show remove button for all items except when there's only one enabled disclosure */}
                {tipDisclosures.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDisclosure(index)}
                    className="h-8 w-8 shrink-0 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            {/* Total Percentage Display */}
            <div
              className={`flex items-center justify-between border-t pt-3 text-sm font-medium ${
                Math.abs(totalPercentage - 100) < 0.01
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              <span>
                Total: {totalPercentage.toFixed(1)}%
                {Math.abs(totalPercentage - 100) > 0.01 && " (Must equal 100%)"}
              </span>

              {/* {enabledDisclosures.length > 0 &&
                Math.abs(totalPercentage - 100) > 0.01 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newDisclosures = [...tipDisclosures];
                      const enabledIndices = newDisclosures
                        .map((d, idx) => (d.enabled ? idx : -1))
                        .filter(idx => idx !== -1);

                      if (enabledIndices.length > 0) {
                        const equalShare = 100 / enabledIndices.length;
                        enabledIndices.forEach(idx => {
                          newDisclosures[idx].percentage = parseFloat(
                            equalShare.toFixed(1)
                          );
                        });
                        setTipDisclosures(newDisclosures);
                      }
                    }}
                  >
                    Distribute Equally
                  </Button>
                )} */}
            </div>
          </div>
        </div>

        {/* Show latest tip only */}
        <div className="flex items-center justify-between">
          <Label htmlFor="showLatest">Show latest amount only</Label>
          <Switch
            id="showLatest"
            checked={showLatest}
            onCheckedChange={setShowLatest}
          />
        </div>

        {/* Hide progress bar amount */}
        <div className="flex items-center justify-between">
          <Label htmlFor="hideProgressAmount">
            Show amount on progress bar
          </Label>
          <Switch
            id="hideProgressAmount"
            checked={hideProgressAmount}
            onCheckedChange={setHideProgressAmount}
          />
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-4">
          <Button
            variant="outline"
            size="lg"
            onClick={copyOverlay}
            className="w-full"
          >
            Copy Overlay Link
          </Button>

          <Button
            size="lg"
            className="w-full"
            disabled={loading || Math.abs(totalPercentage - 100) > 0.01}
            onClick={handleSave}
          >
            {loading ? "Saving changes..." : "Save changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
