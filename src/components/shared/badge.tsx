interface Props {
  title: string;
}

export const Badge = ({ title }: Props) => {
  return (
    <span
      className="border-primary open_sans inline-flex w-fit items-center gap-2 rounded-full border px-4 py-3 text-xs font-medium sm:text-sm"
      style={{ backgroundImage: `linear-gradient(to left, #FFF, #FFF8F1)` }}
    >
      <span className="bg-primary size-5 rounded-full"></span> {title}
    </span>
  );
};
