"use client";

import { useCallback, useEffect, useState } from "react";
import { useHostSession } from "@/hooks/use-host-session";
import { getHostProfileAction } from "@/actions/auth";

export function usePayoutProfileGuard() {
  const { isActive: hostSessionActive } = useHostSession();
  const [profileComplete, setProfileComplete] = useState(true);
  const [profileLabel, setProfileLabel] = useState("profile");
  const [profileAccountType, setProfileAccountType] = useState<
    "INDIVIDUAL" | "ORGANIZATION"
  >("INDIVIDUAL");
  const [modalOpen, setModalOpen] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!hostSessionActive) return;

    void getHostProfileAction().then(response => {
      if (!response.success || !response.data) {
        setChecked(true);
        return;
      }

      const data = response.data as {
        profileComplete?: boolean;
        profileAccountType?: "INDIVIDUAL" | "ORGANIZATION";
      };

      setProfileComplete(data.profileComplete ?? true);
      setProfileLabel(
        data.profileAccountType === "ORGANIZATION"
          ? "organisation profile"
          : "individual profile"
      );
      setProfileAccountType(data.profileAccountType ?? "INDIVIDUAL");
      setChecked(true);
    });
  }, [hostSessionActive]);

  const guardPayoutNavigation = useCallback(
    (event?: { preventDefault: () => void }) => {
      if (!checked || profileComplete) {
        return true;
      }

      event?.preventDefault();
      setModalOpen(true);
      return false;
    },
    [checked, profileComplete]
  );

  return {
    profileComplete,
    profileLabel,
    profileAccountType,
    modalOpen,
    setModalOpen,
    guardPayoutNavigation,
    checked,
  };
}
