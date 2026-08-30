import { Paragraph } from "./shared/paragraph";

interface Props {
  title: string;
  subtitle: string;
}

export const DashboardHeading = ({ title, subtitle }: Props) => {
  return (
    <div className="space-y-2">
      <h2 className="text-3xl font-semibold sm:text-4xl">{title}</h2>
      <Paragraph
        size="sm"
        color="muted"
      >
        {subtitle}
      </Paragraph>
    </div>
  );
};
