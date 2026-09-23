import type { ReactNode } from "react";

const URL_RE = /(https?:\/\/[^\s]+)/g;

function isSafeHttpUrl(href: string): boolean {
  try {
    const u = new URL(href);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Renders plain text with http(s) URLs as external links. No HTML injection. */
export function linkifyText(text: string): ReactNode[] {
  const parts = text.split(URL_RE);
  const nodes: ReactNode[] = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;
    if (i % 2 === 1 && isSafeHttpUrl(part)) {
      nodes.push(
        <a
          key={`link-${i}-${part.slice(0, 24)}`}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2"
        >
          {part}
        </a>
      );
    } else {
      nodes.push(part);
    }
  }
  return nodes;
}
