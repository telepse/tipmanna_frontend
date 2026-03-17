import Link from "next/link";

interface SocialIconProps {
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href: string;
  className?: string;
}

export const SocialIcon = ({ Icon, href, className }: SocialIconProps) => {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center rounded-full bg-black p-1"
    >
      <Icon className={`size-7 text-white ${className}`} />
    </Link>
  );
};
