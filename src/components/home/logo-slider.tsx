"use client";

import { useState } from "react";
import Image from "next/image";

// Third-party imports
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Local imports
import { Cause } from "@/types/cause.types";

interface Props {
  causes: Cause[];
}

export const LogoSlider = ({ causes = [] }: Props) => {
  const [current, setCurrent] = useState(0);

  if (causes.length === 0) {
    return null;
  }

  const prev = () => setCurrent(i => (i === 0 ? causes.length - 1 : i - 1));

  const next = () => setCurrent(i => (i === causes.length - 1 ? 0 : i + 1));

  // Calculate the 3 visible CHARITY_LOGOS: prev, current, next
  const prevIndex = (current - 1 + causes.length) % causes.length;
  const nextIndex = (current + 1) % causes.length;

  const visibleCauses = [causes[prevIndex], causes[current], causes[nextIndex]];

  return (
    <div className="mt-12 flex items-center justify-center gap-4 sm:gap-6">
      <Button
        variant="outline"
        size="icon"
        className="border-none"
        onClick={prev}
      >
        <ChevronLeft className="size-6" />
      </Button>

      <div className="flex items-center gap-4 sm:gap-6">
        {visibleCauses.map((cause: Cause, index) => (
          <Image
            key={cause?.id}
            src={cause?.logoUrl}
            alt="Cause"
            width={100}
            height={100}
            className={`rounded-full transition duration-300 ${
              index === 1 ? "scale-110 opacity-100" : "scale-90 opacity-20"
            } size-12 object-cover sm:size-18 lg:size-24`}
          />
        ))}
      </div>

      <Button
        variant="outline"
        size="icon"
        className="border-none"
        onClick={next}
      >
        <ChevronRight className="size-6" />
      </Button>
    </div>
  );
};
