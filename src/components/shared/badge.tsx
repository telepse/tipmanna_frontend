interface Props {
  title: string;
  isWhite?: boolean;
}

export const Badge = ({ title, isWhite }: Props) => {
  return (
    <span
      className={`border-primary open_sans inline-flex w-fit items-center gap-2 rounded-full border px-4 py-3 text-xs font-medium sm:text-sm ${isWhite ? "bg-white" : "bg-secondary/30"}`}
    >
      <span className="bg-primary size-5 rounded-full"></span> {title}
    </span>
  );
};
