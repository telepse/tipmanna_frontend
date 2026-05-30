interface TitleProps {
  children: React.ReactNode;
  align?: "left" | "center" | "right";
  size?: "xs" | "sm" | "md" | "lg";
  weight?: "normal" | "medium" | "bold";
  color?: "black" | "white" | "primary";
  className?: string;
}

export const Title = ({
  children,
  align = "left",
  size = "md",
  weight = "medium",
  color = "black",
  className,
}: TitleProps) => {
  // Size map
  const sizeClasses: Record<NonNullable<TitleProps["size"]>, string> = {
    xs: "text-base sm:text-lg",
    sm: "text-xl sm:text-2xl",
    md: "text-3xl sm:text-4xl",
    lg: "text-4xl sm:text-6xl",
  };

  // Weight map
  const weightClasses: Record<NonNullable<TitleProps["weight"]>, string> = {
    normal: "font-normal",
    medium: "font-medium",
    bold: "font-semibold",
  };

  // Alignment map
  const alignClasses: Record<NonNullable<TitleProps["align"]>, string> = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  };

  // Color map
  const colorClasses: Record<NonNullable<TitleProps["color"]>, string> = {
    black: "text-black",
    white: "text-white",
    primary: "text-primary",
  };

  return (
    <h2
      className={`racing_sans_one ${sizeClasses[size]} ${weightClasses[weight]} ${alignClasses[align]} ${colorClasses[color]} ${className}`}
    >
      {children}
    </h2>
  );
};
