import Image from "next/image";

// Local imports
import { Paragraph } from "@/components/shared/paragraph";

interface Props {
  icon: string;
  title: string;
  content: string;
}

export const FeatureCard = ({ icon, title, content }: Props) => {
  return (
    <div className="border-primary flex flex-col items-center gap-2 rounded-2xl border p-6">
      <Image
        src={icon}
        alt={title}
        width={50}
        height={50}
        className="bg-secondary/20 size-12 rounded-md object-contain p-2"
      />

      <Paragraph
        size="lg"
        weight="bold"
      >
        {title}
      </Paragraph>
      <Paragraph
        align="center"
        size="sm"
        color="muted"
        className="text-[14px]"
      >
        {content}
      </Paragraph>
    </div>
  );
};
