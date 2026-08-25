"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { Paragraph } from "@/components/shared/paragraph";

interface Props {
  name: string;
  desc: string;
  price: string;
  discountPrice?: string;
  features: string[];
  btnText: string;
  onButtonClick?: () => void;
  onSeeMoreChange?: (open: boolean) => void;
}

export const PricingCard = ({
  name,
  price,
  discountPrice,
  features,
  btnText,
  onButtonClick,
  onSeeMoreChange,
}: Props) => {
  const [seeMore, setSeeMore] = useState(false);

  const handleSeeMore = () => {
    setSeeMore(previous => {
      const next = !previous;
      onSeeMoreChange?.(next);
      return next;
    });
  };

  return (
    <div className="border-primary flex flex-col items-center gap-2 rounded-2xl border p-6">
      <Paragraph
        size="xl"
        weight="bold"
      >
        {name}
      </Paragraph>

      <div className="-mt-6 flex items-center gap-2">
        <Paragraph
          align="center"
          weight="bold"
          className="!text-[36px]"
        >
          {price}
        </Paragraph>

        {discountPrice && (
          <Paragraph
            align="center"
            weight="bold"
            color="muted"
            className="!text-[18px] line-through"
          >
            ({discountPrice})
          </Paragraph>
        )}

        <span className="text-sm text-gray-800">/ month</span>
      </div>

      <Paragraph
        weight="bold"
        color="muted"
        align="center"
        className="leading-relaxed"
      >
        {name === "Free" && (
          <span>
            Start creating and building <br />
            your audience
          </span>
        )}

        {name === "Growth" && (
          <span>Grow engagement and build recurring relationships</span>
        )}

        {name === "Community" && (
          <span>
            Run your own community <br />
            media network
          </span>
        )}
      </Paragraph>

      <button
        type="button"
        className="bg-primary hover:bg-primary/80 w-full cursor-pointer rounded-md px-4 py-2 text-white transition-all"
        onClick={onButtonClick}
      >
        {btnText}
      </button>

      <button
        type="button"
        className="w-full cursor-pointer transition-all lg:hidden"
        onClick={handleSeeMore}
      >
        {seeMore ? (
          <span className="flex items-center gap-2">
            See less
            <ChevronUp className="size-4" />
          </span>
        ) : (
          <span className="flex items-center gap-2">
            See more
            <ChevronDown className="size-4" />
          </span>
        )}
      </button>

      {seeMore ? (
        <ul className="w-full space-y-4 lg:hidden">
          {features.map((feature, index) => (
            <li
              key={index}
              className="flex items-center gap-2 text-sm"
            >
              <Check className="text-primary size-4 shrink-0" />
              {feature}
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
            <Check className="text-primary size-4 shrink-0" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
};
