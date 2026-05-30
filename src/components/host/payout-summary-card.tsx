import { Clock } from "lucide-react";

interface Props {
  label: string;
  value: number;
  bgColor: string;
  txtColor: string;
}

export const PayoutSummaryCard = ({
  label,
  value,
  bgColor,
  txtColor,
}: Props) => {
  return (
    <div
      className="flex items-center gap-4 rounded-xl p-6"
      style={{ background: bgColor }}
    >
      <Clock
        className="size-8"
        style={{ color: txtColor }}
      />

      <div className="space-y-2">
        <span
          className="font-medium"
          style={{ color: txtColor }}
        >
          {label}
        </span>
        <h5
          className="text-3xl font-semibold"
          style={{ color: txtColor }}
        >
          {value}
        </h5>
      </div>
    </div>
  );
};
