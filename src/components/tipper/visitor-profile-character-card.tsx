import Image from "next/image";
import { Paragraph } from "../shared/paragraph";
import { formatDate } from "@/lib/utils";

interface VisitorProfileCharacterCardProps {
  name: string;
  icon: string;
  time: string;
  price: string;
  purchasedAt: string;
}

export const VisitorProfileCharacterCard = ({
  name,
  icon,
  time,
  price,
  purchasedAt,
}: VisitorProfileCharacterCardProps) => {
  return (
    <div className="flex justify-between rounded-md bg-white p-4">
      <div className="flex gap-4">
        <Image
          src={icon}
          alt={name}
          width={50}
          height={50}
          className="size-10 shrink-0 rounded-full border border-[#321801] object-contain p-1"
        />

        <div>
          <Paragraph
            size="sm"
            weight="bold"
          >
            {name}
          </Paragraph>
          <Paragraph
            size="xs"
            color="muted"
          >
            {formatDate(purchasedAt)} - {time}
          </Paragraph>
        </div>
      </div>

      <span className="inline-block size-fit rounded-md bg-[#321801] px-2 py-1 text-white">
        &pound;{price}
      </span>
    </div>
  );
};
