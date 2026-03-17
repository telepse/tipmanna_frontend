interface Props {
  eventName: string;
  totalContribution: number;
  numOfTips: number;
  recentTips: [];
}

export const EventBreakdownCard = ({
  eventName,
  totalContribution,
  numOfTips,
  recentTips,
}: Props) => {
  return (
    <div className="border-primary flex items-center justify-between rounded-md border p-6">
      <div className="space-y-2">
        <h6 className="font-medium">{eventName}</h6>
        <p className="text-primary text-sm font-medium">
          {numOfTips} tips:{" "}
          <span>{recentTips.map(item => `£${item}`).join(", ")}</span>
        </p>
      </div>

      <p className="text-primary text-sm font-medium">
        &pound;{totalContribution}
      </p>
    </div>
  );
};
