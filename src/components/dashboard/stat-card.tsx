import { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: number;
  icon: LucideIcon;
  subLabel?: string;
  isMoney?: boolean;
  hasColor?: boolean;
}

export const StatCard = ({
  label,
  value,
  icon: Icon,
  subLabel,
  isMoney,
  hasColor,
}: Props) => {
  return (
    <div className="bg-card rounded-md border p-6">
      <p className="text-muted-foreground text-sm font-medium">{label}</p>

      <div className="flex justify-between">
        <h2 className="flex items-center gap-1 text-xl font-semibold">
          {isMoney && <>&pound;</>}
          {value}
        </h2>

        <div className="rounded-full border p-2">
          <Icon className="size-5" />
        </div>
      </div>

      <p
        className={`${hasColor ? "text-primary" : "text-muted-foreground"} text-xs font-medium`}
      >
        {subLabel}
      </p>
    </div>
  );
};
