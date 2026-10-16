import {
  hideProgressBarAmountFromShowToggle,
  showAmountOnProgressBarToggleChecked,
} from "@/lib/screen-display-progress-toggle";

/** Reconcile venue/dashboard toggle state from persisted hide flag. */
export function venueProgressToggleFromPersisted(
  hideProgressBarAmount: boolean
): {
  hideProgressAmount: boolean;
  showAmountChecked: boolean;
} {
  return {
    hideProgressAmount: hideProgressBarAmount,
    showAmountChecked: showAmountOnProgressBarToggleChecked(
      hideProgressBarAmount
    ),
  };
}

/** Map host "show amount" switch to API hideProgressBarAmount. */
export function venueProgressToggleForSave(showAmountOnBar: boolean): boolean {
  return hideProgressBarAmountFromShowToggle(showAmountOnBar);
}

export type PersistedScreenSettingsPatch = {
  hideProgressBarAmount?: boolean;
  showLatestAmount?: boolean;
  eventBackground?: string;
};

/** Apply PATCH/GET fields when present; never invent defaults for omitted keys. */
export function reconcileVenueScreenSettingsFromPersisted<
  T extends PersistedScreenSettingsPatch,
>(current: T, persisted: PersistedScreenSettingsPatch): T {
  return {
    ...current,
    ...(typeof persisted.hideProgressBarAmount === "boolean"
      ? { hideProgressBarAmount: persisted.hideProgressBarAmount }
      : {}),
    ...(typeof persisted.showLatestAmount === "boolean"
      ? { showLatestAmount: persisted.showLatestAmount }
      : {}),
    ...(typeof persisted.eventBackground === "string"
      ? { eventBackground: persisted.eventBackground }
      : {}),
  };
}
