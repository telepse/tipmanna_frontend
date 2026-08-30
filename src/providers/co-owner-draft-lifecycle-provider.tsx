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
  /** True when draft restore finished and co-owner hydration is not in flight. */
  lifecycleReady: boolean;
  /** True when draft/modal restore finished (ignores hydration). Safe for co-owner effects. */
  restoreReady: boolean;
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

  const restoreReady = useMemo(
    () => !draftRestoring && !modalRestoring,
    [draftRestoring, modalRestoring]
  );

  const lifecycleReady = useMemo(
    () => restoreReady && !coOwnerHydrating,
    [restoreReady, coOwnerHydrating]
  );

  const value = useMemo(
    () => ({ lifecycleReady, restoreReady, setCoOwnerHydrating }),
    [lifecycleReady, restoreReady, setCoOwnerHydrating]
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
      restoreReady: true,
      setCoOwnerHydrating: () => {},
    };
  }
  return ctx;
}
