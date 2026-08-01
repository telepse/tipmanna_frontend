"use client";

import { useState } from "react";

// Third-party imports
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { useMediaQuery } from "react-responsive";

// Local imports
import { Paragraph } from "@/components/shared/paragraph";

interface Props {
  name: string;
  desc: string;
  price: string;
  discountPrice?: string;
  features: string[];
  btnText: string;
  onButtonClick?: () => void;
}

export const PricingCard = ({
  name,
  desc,
  price,
  discountPrice,
  features,
  btnText,
  onButtonClick,
}: Props) => {
  const isMobile = useMediaQuery({
    query: "(max-width: 500px)",
  });

  const [seeMore, setSeeMore] = useState(false);

  const handleSeeMore = () => {
    setSeeMore(!seeMore);
  };

  return (
    <div className="border-primary flex flex-col items-center gap-2 rounded-2xl border p-6">
      <Paragraph
        size="xl"
        weight="bold"
        className="uppercase"
      >
        {name}
      </Paragraph>
      <Paragraph
        weight="bold"
        color="muted"
        align="center"
      >
        {desc}
      </Paragraph>
      <div className="flex items-center gap-2">
        <Paragraph
          align="center"
          weight="bold"
          className="!text-[36px]"
        >
          {price}
        </Paragraph>{" "}
        {discountPrice && (
          <Paragraph
            align="center"
            weight="bold"
            color="muted"
            className="!text-[18px] line-through"
          >
            ({discountPrice})
          </Paragraph>
        )}{" "}
        <span className="text-sm text-gray-800">{"/ month"}</span>
      </div>

      <button
        type="button"
        className="bg-primary hover:bg-primary/80 w-full cursor-pointer rounded-md px-4 py-2 text-white transition-all"
        onClick={onButtonClick}
      >
        {btnText}
      </button>

      {isMobile && (
        <button
          className="w-full cursor-pointer transition-all"
          onClick={handleSeeMore}
        >
          {seeMore ? (
            <span className="flex items-center gap-2">
              See less <ChevronUp className="size-4" />
            </span>
          ) : (
            <span className="flex items-center gap-2">
              See more <ChevronDown className="size-4" />
            </span>
          )}
        </button>
      )}

      {isMobile && seeMore ? (
        <ul className="space-y-4">
          {features.map((feature, index) => (
            <li
              key={index}
              className="flex items-center gap-2 text-sm"
            >
              <Check className="text-primary size-4 shrink-0" /> {feature}
            </li>
          ))}
        </ul>
      ) : null}

      <ul className="hidden space-y-4 lg:block">
        {features.map((feature, index) => (
          <li
            key={index}
            className="flex items-center gap-2 text-sm"
          >
            <Check className="text-primary size-4 shrink-0" /> {feature}
          </li>
        ))}
      </ul>
    </div>
  );
};
