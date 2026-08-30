"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";
import {
  useFormDraftAutosave,
  type FormDraftSaveState,
} from "@/hooks/use-form-draft-autosave";
import type { FormDraftKind } from "@/actions/form-drafts";
import type { NewEventFormData } from "@/schemas";
import { useCoOwnerDraftLifecycle } from "@/providers/co-owner-draft-lifecycle-provider";
import { DraftSaveIndicator } from "@/components/events/draft-save-indicator";

type WizardDraftAutosaveContextValue = {
  saveNow: () => Promise<void>;
  saveState: FormDraftSaveState;
};

const WizardDraftAutosaveContext =
  createContext<WizardDraftAutosaveContextValue | null>(null);

type WizardDraftAutosaveProviderProps = {
  form: UseFormReturn<NewEventFormData>;
  kind: FormDraftKind;
  step: number;
  title?: string;
  draftId: string | null;
  onDraftId: (id: string) => void;
  hostEnabled: boolean;
  verifyStatus?: Record<number, string | undefined>;
  children: ReactNode;
};

/** Autosave gated on co-owner hydration lifecycle; exposes saveNow to step components. */
export function WizardDraftAutosaveProvider({
  form,
  kind,
  step,
  title,
  draftId,
  onDraftId,
  hostEnabled,
  verifyStatus,
  children,
}: WizardDraftAutosaveProviderProps) {
  const { lifecycleReady } = useCoOwnerDraftLifecycle();
  const draftSave = useFormDraftAutosave(form.watch(), {
    kind,
    step,
    title,
    enabled: hostEnabled && lifecycleReady,
    draftId,
    onDraftId,
    verifyStatus,
  });

  const value = useMemo(
    () => ({
      saveNow: draftSave.saveNow,
      saveState: {
        saving: draftSave.saving,
        lastSavedAt: draftSave.lastSavedAt,
        saveError: draftSave.saveError,
      },
    }),
    [
      draftSave.saveNow,
      draftSave.saving,
      draftSave.lastSavedAt,
      draftSave.saveError,
    ]
  );

  return (
    <WizardDraftAutosaveContext.Provider value={value}>
      {children}
    </WizardDraftAutosaveContext.Provider>
  );
}

export function useWizardDraftAutosave(): WizardDraftAutosaveContextValue {
  const ctx = useContext(WizardDraftAutosaveContext);
  if (!ctx) {
    return {
      saveNow: async () => {},
      saveState: { saving: false, lastSavedAt: null, saveError: null },
    };
  }
  return ctx;
}

export function WizardDraftSaveIndicator({
  className,
}: {
  className?: string;
}) {
  const { saveNow, saveState } = useWizardDraftAutosave();
  return (
    <DraftSaveIndicator
      className={className}
      saving={saveState.saving}
      lastSavedAt={saveState.lastSavedAt}
      saveError={saveState.saveError}
      onSaveNow={() => void saveNow()}
    />
  );
}
