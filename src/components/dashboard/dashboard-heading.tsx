interface Props {
  title: string;
  subtitle?: string;
}

export const DashboardHeading = ({ title, subtitle }: Props) => {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl sm:text-4xl">{title}</h1>
      <p className="text-muted-foreground text-sm">{subtitle}</p>
    </div>
  );
};
