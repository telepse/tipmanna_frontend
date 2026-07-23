"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Local imports
import { AutoDetectLocationPrompt } from "@/components/shared/autodetect-location-prompt";
import { Logo } from "@/components/shared/logo";

export default function AutoDetectLocation() {
  const [showPrompt, setShowPrompt] = useState(true);
  const router = useRouter();

  const handleAllowOrDeny = () => {
    setShowPrompt(false);
    router.push("/join"); // Redirect to join page
  };

  return (
    <div className="relative">
      {showPrompt && (
        <>
          <div className="absolute top-4 left-4">
            <Logo />
          </div>

          <AutoDetectLocationPrompt
            open={showPrompt}
            onAllow={handleAllowOrDeny}
            onDeny={handleAllowOrDeny}
          />
        </>
      )}
    </div>
  );
}
