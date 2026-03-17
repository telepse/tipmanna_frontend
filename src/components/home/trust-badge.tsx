"use client";

import Image from "next/image";

// Third-party imports
import { useMediaQuery } from "react-responsive";

// Local imports
import { Paragraph } from "@/components/shared/paragraph";

interface Props {
  icon: string;
  label: string;
}

export const TrustBadge = ({ icon, label }: Props) => {
  const isDesktopOrLaptop = useMediaQuery({
    query: "(min-width: 1224px)",
  });

  return (
    <div className="flex flex-col items-center gap-2">
      <Image
        src={icon}
        alt={label}
        width={50}
        height={50}
        className="size-12 rounded-full bg-black/10 object-contain grayscale"
      />

      <Paragraph
        align="center"
        size={isDesktopOrLaptop ? "sm" : "xs"}
        weight="medium"
      >
        {label}
      </Paragraph>
    </div>
  );
};
