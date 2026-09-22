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
    <div className="border-primary bg-primary/10 flex flex-col items-center justify-center gap-2 rounded-md border p-4 sm:gap-4 sm:p-6">
      <h2 className="text-base font-semibold sm:text-3xl">
        {isMoney && <>&pound;</>}
        {value}
      </h2>

      <div className="-mt-2 space-y-2">
        <p className="text-muted-foreground line-clamp-2 text-center text-xs leading-normal font-medium">
          {title}
        </p>
      </div>
    </div>
  );
};
