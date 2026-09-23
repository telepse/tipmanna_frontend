"use client";

import dynamic from "next/dynamic";
import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { ClientErrorBoundary } from "@/components/client-error-boundary";
import type { CreateDialogEntry } from "@/components/home/create-dialog";
import {
  CreateDialogResumeListener,
  type CreateDialogResumeSeed,
} from "@/components/home/create-dialog-resume-listener";

const CreateDialog = dynamic(
  () =>
    import("@/components/home/create-dialog").then(m => ({
      default: m.CreateDialog,
    })),
  { ssr: false }
);

type CreateDialogHostContextValue = {
  openCreate: (entry?: CreateDialogEntry) => void;
  closeCreate: () => void;
  isCreateOpen: boolean;
};

const CreateDialogHostContext =
  createContext<CreateDialogHostContextValue | null>(null);

/** Single site-chrome Create dialog (footer, marketing CTAs, TV chrome). */
export function CreateDialogHost({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [entry, setEntry] = useState<CreateDialogEntry>("default");
  const [resumeSeed, setResumeSeed] = useState<CreateDialogResumeSeed | null>(
    null
  );

  const clearHostCreateState = useCallback(() => {
    setEntry("default");
    setResumeSeed(null);
  }, []);

  const openCreate = useCallback((nextEntry: CreateDialogEntry = "default") => {
    setResumeSeed(null);
    setEntry(nextEntry);
    setOpen(true);
  }, []);

  const closeCreate = useCallback(() => {
    setOpen(false);
    clearHostCreateState();
  }, [clearHostCreateState]);

  const setOpenPopup = useCallback(
    (value: boolean) => {
      setOpen(value);
      if (!value) clearHostCreateState();
    },
    [clearHostCreateState]
  );

  const handleResume = useCallback((seed: CreateDialogResumeSeed) => {
    setResumeSeed(seed);
    setEntry("default");
    setOpen(true);
  }, []);

  const value = useMemo(
    () => ({ openCreate, closeCreate, isCreateOpen: open }),
    [openCreate, closeCreate, open]
  );

  return (
    <CreateDialogHostContext.Provider value={value}>
      <ClientErrorBoundary>{children}</ClientErrorBoundary>
      <ClientErrorBoundary>
        <Suspense fallback={null}>
          <CreateDialogResumeListener onResume={handleResume} />
        </Suspense>
        {open ? (
          <CreateDialog
            openPopup={open}
            setOpenPopup={setOpenPopup}
            entry={entry}
            initialResume={resumeSeed}
          />
        ) : null}
      </ClientErrorBoundary>
    </CreateDialogHostContext.Provider>
  );
}

export function useCreateDialogHost(): CreateDialogHostContextValue {
  const ctx = useContext(CreateDialogHostContext);
  if (!ctx) {
    throw new Error("useCreateDialogHost must be used within CreateDialogHost");
  }
  return ctx;
}
