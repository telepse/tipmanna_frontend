import { Clock } from "lucide-react";

interface Props {
  label: string;
  value: number;
  bgColor: string;
  txtColor: string;
  subLabel?: string;
  isMoney?: boolean;
}

export const PayoutSummaryCard = ({
  label,
  value,
  bgColor,
  txtColor,
  subLabel,
  isMoney,
}: Props) => {
  const display = isMoney
    ? `£${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : String(value);

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
          {display}
        </h5>
        {subLabel ? (
          <p
            className="text-xs opacity-90"
            style={{ color: txtColor }}
          >
            {subLabel}
          </p>
        ) : null}
      </div>
    </div>
  );
};
