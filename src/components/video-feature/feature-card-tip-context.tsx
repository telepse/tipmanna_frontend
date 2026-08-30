"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type Ctx = {
  activeVideoFeatureCardId: string | null;
  setActiveVideoFeatureCardId: (id: string | null) => void;
};

const FeatureCardTipContext = createContext<Ctx | null>(null);

export function FeatureCardTipProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [activeVideoFeatureCardId, setActiveVideoFeatureCardId] = useState<
    string | null
  >(null);
  const stable = useCallback((id: string | null) => {
    setActiveVideoFeatureCardId(id);
  }, []);
  const v = useMemo(
    () =>
      ({
        activeVideoFeatureCardId,
        setActiveVideoFeatureCardId: stable,
      }) satisfies Ctx,
    [activeVideoFeatureCardId, stable]
  );
  return (
    <FeatureCardTipContext.Provider value={v}>
      {children}
    </FeatureCardTipContext.Provider>
  );
}

export function useFeatureCardTipContext(): Ctx {
  const c = useContext(FeatureCardTipContext);
  if (!c) {
    return {
      activeVideoFeatureCardId: null,
      setActiveVideoFeatureCardId: () => {},
    };
  }
  return c;
}
