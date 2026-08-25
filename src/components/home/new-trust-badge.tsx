import { Paragraph } from "@/components/shared/paragraph";

interface Props {
  label: string;
}

export const NewTrustBadge = ({ label }: Props) => {
  return (
    <Paragraph
      align="center"
      size="xs"
      weight="medium"
      className="bg-secondary rounded-md px-2 py-1 sm:text-sm"
    >
      {label}
    </Paragraph>
  );
};
