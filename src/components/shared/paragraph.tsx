interface ParagraphProps {
  children: React.ReactNode;
  align?: "left" | "center" | "right";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  weight?: "normal" | "medium" | "bold";
  color?: "black" | "white" | "muted";
  className?: string;
  style?: React.CSSProperties;
}

export const Paragraph = ({
  children,
  align = "left",
  size = "md",
  weight = "normal",
  color = "black",
  className,
  style,
}: ParagraphProps) => {
  // Size map
  const sizeClasses: Record<NonNullable<ParagraphProps["size"]>, string> = {
    xs: "text-xs sm:text-sm",
    sm: "text-sm sm:text-base",
    md: "text-base sm:text-lg",
    lg: "text-lg sm:text-xl",
    xl: "text-xl sm:text-2xl",
  };

  // Weight map
  const weightClasses: Record<NonNullable<ParagraphProps["weight"]>, string> = {
    normal: "font-normal",
    medium: "font-medium",
    bold: "font-semibold",
  };

  // Alignment map
  const alignClasses: Record<NonNullable<ParagraphProps["align"]>, string> = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  };

  // Color map
  const colorClasses: Record<NonNullable<ParagraphProps["color"]>, string> = {
    black: "text-black",
    white: "text-white",
    muted: "text-muted-foreground",
  };

  return (
    <p
      style={style}
      className={`open_sans leading-loose break-words whitespace-normal ${sizeClasses[size]} ${weightClasses[weight]} ${alignClasses[align]} ${colorClasses[color]} ${className}`}
    >
      {children}
    </p>
  );
};
