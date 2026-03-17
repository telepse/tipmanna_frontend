import { LucideIcon } from "lucide-react";

// Local imports
import { Paragraph } from "@/components/shared/paragraph";

interface Props {
  title: string;
  value: number;
  icon: LucideIcon;
  isMoney?: boolean;
}

export const EventStatCard = ({ title, value, icon: Icon, isMoney }: Props) => {
  return (
    <div className="border-primary bg-secondary/10 flex gap-4 rounded-xl border p-6">
      <Icon className="size-10 rounded-full border p-2" />

      <div className="space-y-2">
        <Paragraph
          size="sm"
          color="muted"
        >
          {title}
        </Paragraph>
        <h2 className="text-3xl font-semibold">
          {isMoney && <>&pound;</>}
          {value}
        </h2>
      </div>
    </div>
  );
};
