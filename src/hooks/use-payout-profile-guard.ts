"use client";

import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { getHostProfileAction } from "@/actions/auth";

export function usePayoutProfileGuard() {
  const token = useSelector((state: RootState) => state.auth.token);
  const [profileComplete, setProfileComplete] = useState(true);
  const [profileLabel, setProfileLabel] = useState("profile");
  const [profileAccountType, setProfileAccountType] = useState<
    "INDIVIDUAL" | "ORGANIZATION"
  >("INDIVIDUAL");
  const [modalOpen, setModalOpen] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!token) return;

    void getHostProfileAction(token).then(response => {
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
  }, [token]);

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
