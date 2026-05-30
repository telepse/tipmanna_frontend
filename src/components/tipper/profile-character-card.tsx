import Image from "next/image";
import { Paragraph } from "../shared/paragraph";
import { formatDate } from "@/lib/utils";

interface ProfileCharacterCardProps {
  name: string;
  icon: string;
  time: string;
  price: string;
  purchasedAt: string;
}

export const ProfileCharacterCard = ({
  name,
  icon,
  time,
  price,
  purchasedAt,
}: ProfileCharacterCardProps) => {
  return (
    <div className="flex justify-between rounded-md bg-white p-4">
      <div className="flex gap-4">
        <Image
          src={icon}
          alt={name}
          width={50}
          height={50}
          className="border-primary size-10 shrink-0 rounded-full border object-contain p-1"
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

      <span className="bg-primary inline-block size-fit rounded-md px-2 py-1 text-white">
        &pound;{price}
      </span>
    </div>
  );
};
