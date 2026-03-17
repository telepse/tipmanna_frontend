import { LucideIcon, Trophy } from "lucide-react";

interface Props {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  iconColor: string;
  met?: boolean;
}

export const AchievementCard = ({
  title,
  subtitle,
  icon: Icon,
  iconColor,
  met,
}: Props) => {
  return (
    <div
      className={`bg-card flex items-center justify-between gap-4 rounded border p-6 shadow-sm ${!met ? "opacity-50" : ""}`}
    >
      <div className="flex items-center gap-4">
        <Icon style={{ color: iconColor }} />

        <div className="space-y-1">
          <h5 className="font-medium">{title}</h5>
          <p className="text-muted-foreground text-sm">{subtitle}</p>
        </div>
      </div>

      <Trophy className="text-primary" />
    </div>
  );
};
