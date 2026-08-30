import Image from "next/image";

// Local imports
import { Paragraph } from "@/components/shared/paragraph";
import { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  title: string;
  content: string;
}

export const FeatureCard = ({ icon: Icon, title, content }: Props) => {
  return (
    <div className="border-l-primary flex flex-col items-start gap-2 rounded-2xl rounded-md border border-l-2 bg-white p-6">
      <Icon className="size-12" />

      <Paragraph
        size="xl"
        weight="bold"
      >
        {title}
      </Paragraph>
      <Paragraph
        size="sm"
        color="muted"
        className="text-[14px] italic"
      >
        {content}
      </Paragraph>
    </div>
  );
};
