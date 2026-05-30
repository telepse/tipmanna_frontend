"use client";

import { useState, useEffect } from "react";
import { LocationPrompt } from "@/components/shared/location-prompt";
import { OVERLAY_Z_INDEX } from "@/lib/drawer-z-index";

export default function LocationPromptWrapper() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const permission = localStorage.getItem("location_permission");
    if (permission) {
      setShow(false); // already allowed/denied before
    }
  }, []);

  const handleAllow = (country: string) => {
    localStorage.setItem("country", country);
    setShow(false);
  };

  const handleDeny = () => {
    localStorage.setItem("location_permission", "deny");
    setShow(false);
  };

  return (
    <>
      {show && (
        <div
          className={`fixed inset-0 ${OVERLAY_Z_INDEX} flex items-center justify-center`}
        >
          <LocationPrompt
            open={true}
            onAllow={handleAllow}
            onDeny={handleDeny}
            onClose={() => setShow(false)}
          />
        </div>
      )}
    </>
  );
}
