"use client";

import { Check } from "lucide-react";

// Local imports
import { Paragraph } from "@/components/shared/paragraph";

interface Props {
  name: string;
  price: string;
  discountPrice?: string;
  hasAnnualPrice?: boolean;
  features: string[];
  btnText: string;
}

export const PricingCard = ({
  name,
  price,
  discountPrice,
  hasAnnualPrice,
  features,
  btnText,
}: Props) => {
  return (
    <div className="border-primary flex flex-col items-center gap-2 rounded-2xl border p-6">
      <Paragraph
        size="lg"
        weight="bold"
        className="uppercase"
      >
        {name}
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
        <span className="text-sm text-gray-800">
          {hasAnnualPrice ? "" : "/ month"}
        </span>
      </div>

      <button className="bg-primary hover:bg-primary/80 w-full cursor-pointer rounded-md px-4 py-2 text-white transition-all">
        {btnText}
      </button>

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
    </div>
  );
};
