import type { ReactNode } from "react";

const URL_RE = /((?:https?:\/\/|www\.)[^\s<>"']+)/gi;

/** Plain text with web addresses made clickable. Nothing else is interpreted, so posts can't inject markup. */
export function Linked({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  text.split(URL_RE).forEach((chunk, i) => {
    if (i % 2 === 0) {
      if (chunk) parts.push(chunk);
      return;
    }
    const trailing = /[.,;:!?)\]]+$/.exec(chunk)?.[0] ?? "";
    const address = trailing ? chunk.slice(0, -trailing.length) : chunk;
    const href = address.startsWith("www.") ? `https://${address}` : address;
    parts.push(
      <a key={i} href={href} target="_blank" rel="noopener noreferrer nofollow ugc">
        {address}
      </a>,
    );
    if (trailing) parts.push(trailing);
  });
  return <>{parts}</>;
}
