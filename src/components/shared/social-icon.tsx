import Link from "next/link";

interface SocialIconProps {
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href: string;
  className?: string;
  size?: number;
}

export const SocialIcon = ({
  Icon,
  href,
  className,
  size = 7,
}: SocialIconProps) => {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center rounded-full bg-black p-1"
    >
      <Icon className={`size-[${size}] text-white ${className}`} />
    </Link>
  );
};
