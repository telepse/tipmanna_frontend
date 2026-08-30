import Link from "next/link";

type Link = {
  label: string;
  href: string;
};

interface FooterLinksProps {
  links: Link[];
}

export const FooterLinks = ({ links }: FooterLinksProps) => {
  return (
    <ul className="space-y-2 sm:space-y-4">
      {links.map((link, index) => (
        <li
          key={index}
          className="open_sans text-sm"
        >
          <Link
            className="text-muted-foreground hover:underline"
            href={link.href}
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );
};
