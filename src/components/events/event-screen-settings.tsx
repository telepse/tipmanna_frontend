"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "react-toastify";
import { incrementEventTargetAmountAction } from "@/actions/events";

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
import {
  SCREEN_FUNNEL_POSITIONS,
  normalizeScreenFunnelPosition,
  type ScreenFunnelPosition,
} from "@/lib/screen-funnel-position";
import {
  hideProgressBarAmountFromShowToggle,
  showAmountOnProgressBarToggleChecked,
} from "@/lib/screen-display-progress-toggle";

// Local imports
import { SCREEN_BACKGROUNDS } from "@/lib/backgrounds";
import { PerformersModal } from "@/components/events/performers-modal";
import { ProjectsModal } from "@/components/events/projects-modal";
import { ViewPerformersModal } from "./view-performer-modal";
import { SessionsModal } from "./sessions-modal";

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
    customLabel: string | null;
  }>;
  performers: { id?: string; name: string; amountReceived?: string }[];
  projects: { id?: string; name: string; amountReceived?: string }[];
  showPinnedOnScreen: boolean;
  funnelPosition: ScreenFunnelPosition;
}

type Session = {
  id: string;
  title: string;
  amountToRaise: number;
  isActive: boolean;
};

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
  initialPerformers: { id?: string; name: string; amountReceived?: string }[];
  initialProjects: { id?: string; name: string; amountReceived?: string }[];
  eventId: string;
  sessions: Session[];
  activeSession: Session | null;
  refetchSessions: () => void;
  initialAmountToRaise?: number;
  onTargetAmountUpdated?: (amount: number) => void;
  initialShowPinnedOnScreen?: boolean;
  initialFunnelPosition?: ScreenFunnelPosition;
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
  initialPerformers,
  initialProjects,
  eventId,
  sessions,
  activeSession,
  refetchSessions,
  initialAmountToRaise = 0,
  onTargetAmountUpdated,
  initialShowPinnedOnScreen = true,
  initialFunnelPosition = "bottom_left",
}: Props) => {
  const [background, setBackground] = useState(initialBackground || "");
  const [moneyFor, setMoneyFor] = useState(initialMoneyFor);
  const [performers, setPerformers] = useState(initialPerformers || []);
  const [projects, setProjects] = useState(initialProjects || []);
  const [showLatest, setShowLatest] = useState(initialShowLatest);
  const [hideProgressAmount, setHideProgressAmount] = useState(
    initialHideProgressAmount
  );
  const [showPinnedOnScreen, setShowPinnedOnScreen] = useState(
    initialShowPinnedOnScreen
  );
  const [funnelPosition, setFunnelPosition] = useState<ScreenFunnelPosition>(
    normalizeScreenFunnelPosition(initialFunnelPosition)
  );
  const [tipDisclosures, setTipDisclosures] = useState<TipUsageDisclosure[]>(
    []
  );

  console.log("initialPerformers", initialPerformers);
  console.log("initialProjects", initialProjects);

  const [currentTargetAmount, setCurrentTargetAmount] =
    useState(initialAmountToRaise);
  const [targetIncrement, setTargetIncrement] = useState("");
  const [targetIncrementBusy, setTargetIncrementBusy] = useState(false);

  // Initialize state when modal opens
  useEffect(() => {
    setCurrentTargetAmount(initialAmountToRaise);
  }, [initialAmountToRaise, open]);

  const handleAddToTarget = async () => {
    const increment = Number(targetIncrement);
    if (!Number.isFinite(increment) || increment <= 0) {
      toast.error("Enter a positive amount to add.");
      return;
    }
    setTargetIncrementBusy(true);
    try {
      const res = await incrementEventTargetAmountAction(eventId, increment);
      if (!res.success) {
        toast.error(res.message ?? "Could not update target amount.");
        return;
      }
      const next =
        typeof (res.data as { amountToRaise?: number })?.amountToRaise ===
        "number"
          ? (res.data as { amountToRaise: number }).amountToRaise
          : currentTargetAmount + increment;
      setCurrentTargetAmount(next);
      onTargetAmountUpdated?.(next);
      setTargetIncrement("");
      toast.success("Target amount updated.");
    } finally {
      setTargetIncrementBusy(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setBackground(initialBackground || "");
    setMoneyFor(initialMoneyFor);
    setShowLatest(initialShowLatest);
    setHideProgressAmount(initialHideProgressAmount);
    setShowPinnedOnScreen(initialShowPinnedOnScreen);
    setFunnelPosition(normalizeScreenFunnelPosition(initialFunnelPosition));

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
    initialShowPinnedOnScreen,
    initialFunnelPosition,
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
      performers: performers.map(performer => ({
        id: performer.id || "",
        name: performer.name || "",
        amountReceived: performer.amountReceived || "",
      })),
      projects: projects.map(project => ({
        id: project.id || "",
        name: project.name || "",
        amountReceived: project.amountReceived || "",
      })),
      showPinnedOnScreen,
      funnelPosition,
    });

    console.log("performers", performers);
  };

  // Calculate total percentage for enabled disclosures only
  const enabledDisclosures = tipDisclosures.filter(d => d.enabled);
  const totalPercentage = enabledDisclosures.reduce(
    (sum, item) => sum + item.percentage,
    0
  );

  const copyOverlay = async () => {
    const url = `${window.location.origin}/room/${eventId}/overlay`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Transparent overlay link copied.");
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Could not copy overlay link.");
    }
  };

  const copyWatchScreenLink = async () => {
    const url = `${window.location.origin}/watch/screen/${eventId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("TV Screen Link copied.");
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Could not copy TV Screen Link.");
    }
  };

  const [showViewPerformerModal, setShowViewPerformerModal] = useState(false);

  const [selection, setSelection] = useState<"performer" | "project" | null>(
    null
  );
  const [showPerformerModal, setShowPerformerModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showSessionsModal, setShowSessionsModal] = useState(false);

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

        {/* hideProgressBarAmount in API: true = hide amounts. UI label is "show". */}
        <div className="flex items-center justify-between">
          <Label htmlFor="hideProgressAmount">
            Show amount on progress bar
          </Label>
          <Switch
            id="hideProgressAmount"
            checked={showAmountOnProgressBarToggleChecked(hideProgressAmount)}
            onCheckedChange={show =>
              setHideProgressAmount(hideProgressBarAmountFromShowToggle(show))
            }
            disabled={loading}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="showPinnedOnScreen">
            Show pinned roster on screen and overlay
          </Label>
          <Switch
            id="showPinnedOnScreen"
            checked={showPinnedOnScreen}
            onCheckedChange={setShowPinnedOnScreen}
          />
        </div>

        <div className="space-y-2">
          <Label>Funnel position (screen &amp; overlay)</Label>
          <div className="grid grid-cols-2 gap-2">
            {SCREEN_FUNNEL_POSITIONS.map(option => (
              <Button
                key={option.value}
                type="button"
                variant={
                  funnelPosition === option.value ? "default" : "outline"
                }
                size="sm"
                onClick={() => setFunnelPosition(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 space-y-2 text-sm">
              <Label>Add</Label>

              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selection === "performer"}
                  onCheckedChange={checked => {
                    if (checked) {
                      setSelection("performer");
                      setShowPerformerModal(true);
                    } else {
                      setSelection(null);
                    }
                  }}
                />{" "}
                Performers
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selection === "project"}
                  onCheckedChange={checked => {
                    if (checked) {
                      setSelection("project");
                      setShowProjectModal(true);
                    } else {
                      setSelection(null);
                    }
                  }}
                />{" "}
                Projects
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowViewPerformerModal(true);
                console.log("show view performer modal");
              }}
              className="rounded-md bg-black p-1 text-sm text-white hover:bg-black/80"
            >
              View
            </button>
          </div>

          {/* <PerformersModal
            open={showPerformerModal}
            onClose={() => {
              setShowPerformerModal(false);
              setSelection(null);
            }}
            isHost={true}
            eventId={eventId}
            performers={performers}
            setPerformers={setPerformers}
          /> */}

          <PerformersModal
            open={showPerformerModal}
            onClose={() => {
              setShowPerformerModal(false);
              setSelection(null);
            }}
            isHost={true}
            eventId={eventId}
            performers={performers}
            setPerformers={setPerformers}
          />

          <ProjectsModal
            open={showProjectModal}
            onClose={() => {
              setShowProjectModal(false);
              setSelection(null);
            }}
            isHost={true}
            eventId={eventId}
            projects={projects}
            setProjects={setProjects}
          />

          <ViewPerformersModal
            open={showViewPerformerModal}
            onClose={() => setShowViewPerformerModal(false)}
            performers={performers}
          />
        </div>

        <div className="space-y-3">
          <Label>Fundraising target</Label>
          <p className="text-muted-foreground text-sm">
            Current target: £{currentTargetAmount.toLocaleString()}
          </p>
          <div className="flex gap-2">
            <Input
              type="number"
              min={0}
              step="0.01"
              placeholder="Add amount"
              value={targetIncrement}
              onChange={e => setTargetIncrement(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              disabled={targetIncrementBusy}
              onClick={() => void handleAddToTarget()}
            >
              {targetIncrementBusy ? "Adding…" : "Add to target"}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Sessions (Progress Bars)</Label>
            <Button
              size="sm"
              onClick={() => setShowSessionsModal(true)}
            >
              View / Add
            </Button>
          </div>

          <SessionsModal
            open={showSessionsModal}
            onClose={() => setShowSessionsModal(false)}
            sessions={sessions}
            eventId={eventId}
            refetchSessions={refetchSessions}
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
            variant="outline"
            size="lg"
            onClick={copyWatchScreenLink}
            className="w-full"
          >
            Copy TV Screen Link
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
