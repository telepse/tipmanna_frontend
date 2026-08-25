import type { ElementType } from "react";

interface TitleProps {
  children: React.ReactNode;
  align?: "left" | "center" | "right";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  weight?: "normal" | "medium" | "bold";
  color?: "black" | "white" | "primary";
  className?: string;
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span" | "div";
  id?: string;
}

export const Title = ({
  children,
  align = "left",
  size = "md",
  weight = "medium",
  color = "black",
  className,
  as: Tag = "h2",
  id,
}: TitleProps) => {
  const sizeClasses: Record<NonNullable<TitleProps["size"]>, string> = {
    xs: "text-base sm:text-lg",
    sm: "text-xl sm:text-2xl",
    md: "text-3xl sm:text-4xl",
    lg: "text-4xl sm:text-6xl",
    xl: "text-5xl sm:text-[67px]",
  };

  const weightClasses: Record<NonNullable<TitleProps["weight"]>, string> = {
    normal: "font-normal",
    medium: "font-medium",
    bold: "font-semibold",
  };

  const alignClasses: Record<NonNullable<TitleProps["align"]>, string> = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  };

  const colorClasses: Record<NonNullable<TitleProps["color"]>, string> = {
    black: "text-black",
    white: "text-white",
    primary: "text-primary",
  };

  const Component = Tag as ElementType;

  return (
    <Component
      id={id}
      className={`racing_sans_one ${sizeClasses[size]} ${weightClasses[weight]} ${alignClasses[align]} ${colorClasses[color]} ${className ?? ""}`}
    >
      {children}
    </Component>
  );
};
