"use client";

import Image from "next/image";

// Third-party imports
import { useMediaQuery } from "react-responsive";

// Local imports
import { Paragraph } from "@/components/shared/paragraph";

interface Props {
  label: string;
}

export const NewTrustBadge = ({ label }: Props) => {
  const isDesktopOrLaptop = useMediaQuery({
    query: "(min-width: 1224px)",
  });

  return (
    <Paragraph
      align="center"
      size={isDesktopOrLaptop ? "sm" : "xs"}
      weight="medium"
      className="bg-secondary/50 rounded-md px-2 py-1"
    >
      {label}
    </Paragraph>
  );
};
