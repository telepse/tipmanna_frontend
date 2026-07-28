"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type CoOwnerDraftLifecycleContextValue = {
  lifecycleReady: boolean;
  setCoOwnerHydrating: (active: boolean) => void;
};

const CoOwnerDraftLifecycleContext =
  createContext<CoOwnerDraftLifecycleContextValue | null>(null);

type ProviderProps = {
  draftRestoring?: boolean;
  modalRestoring?: boolean;
  children: ReactNode;
};

export function CoOwnerDraftLifecycleProvider({
  draftRestoring = false,
  modalRestoring = false,
  children,
}: ProviderProps) {
  const hydratingCountRef = useRef(0);
  const [coOwnerHydrating, setCoOwnerHydratingState] = useState(false);

  const setCoOwnerHydrating = useCallback((active: boolean) => {
    hydratingCountRef.current = Math.max(
      0,
      hydratingCountRef.current + (active ? 1 : -1)
    );
    setCoOwnerHydratingState(hydratingCountRef.current > 0);
  }, []);

  const lifecycleReady = useMemo(
    () => !draftRestoring && !modalRestoring && !coOwnerHydrating,
    [draftRestoring, modalRestoring, coOwnerHydrating]
  );

  const value = useMemo(
    () => ({ lifecycleReady, setCoOwnerHydrating }),
    [lifecycleReady, setCoOwnerHydrating]
  );

  return (
    <CoOwnerDraftLifecycleContext.Provider value={value}>
      {children}
    </CoOwnerDraftLifecycleContext.Provider>
  );
}

export function useCoOwnerDraftLifecycle(): CoOwnerDraftLifecycleContextValue {
  const ctx = useContext(CoOwnerDraftLifecycleContext);
  if (!ctx) {
    return {
      lifecycleReady: true,
      setCoOwnerHydrating: () => {},
    };
  }
  return ctx;
}
