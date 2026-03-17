"use client";

import { useState, useEffect } from "react";
import { LocationPrompt } from "@/components/shared/location-prompt"; // your existing component

export default function PageLoaderWithLocation({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showPrompt, setShowPrompt] = useState(true);
  const [locationAllowed, setLocationAllowed] = useState(false);

  const handleAllow = (country: string) => {
    console.log("User allowed location:", country);
    setLocationAllowed(true);
    setShowPrompt(false);
  };

  const handleDeny = () => {
    console.log("User denied location access");
    setLocationAllowed(false);
    setShowPrompt(false);
  };

  return (
    <>
      {/* Location prompt mounted first */}
      {showPrompt && (
        <LocationPrompt
          open={showPrompt}
          onAllow={handleAllow}
          onDeny={handleDeny}
          onClose={() => setShowPrompt(false)}
        />
      )}

      {/* Page content loads in the background */}
      <div className={showPrompt ? "pointer-events-none" : ""}>{children}</div>
    </>
  );
}
