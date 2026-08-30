import { Paragraph } from "../shared/paragraph";

interface FooterSectionProps {
  title: string;
  children: React.ReactNode;
}

export const FooterSection = ({ title, children }: FooterSectionProps) => {
  return (
    <div className="space-y-[1px] sm:space-y-2">
      <Paragraph
        weight="bold"
        className="leading-relaxed sm:leading-loose"
      >
        {title}
      </Paragraph>
      {children}
    </div>
  );
};
