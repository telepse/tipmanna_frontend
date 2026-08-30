import { Trophy } from "lucide-react";

// Local imports
import { Paragraph } from "../shared/paragraph";

interface ProfileAwardCardProps {
  id: string;
  label: string;
  desc: string;
  isActive: boolean;
}

export const ProfileAwardCard = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  id,
  label,
  desc,
  isActive,
}: ProfileAwardCardProps) => {
  return (
    <div
      className={`border-primary bg-secondary/20 flex h-36 w-full flex-col items-center justify-center rounded-md border backdrop-blur-md ${isActive ? "" : "opacity-50"} `}
    >
      <div className="bg-primary flex size-10 items-center justify-center rounded-full text-white">
        <Trophy className="size-6" />
      </div>

      <Paragraph
        size="xs"
        weight="bold"
        color="muted"
      >
        {label}
      </Paragraph>
      <Paragraph
        size="xs"
        weight="bold"
        color="muted"
      >
        {desc}
      </Paragraph>
    </div>
  );
};
