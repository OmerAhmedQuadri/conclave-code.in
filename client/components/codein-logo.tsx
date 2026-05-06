import { cn } from "@/lib/utils";

interface CodeInLogoProps {
  className?: string;
  height?: number;
}

/**
 * code.in wordmark — geometric, monospace-style block letters in brand gold.
 * Reproduced as inline SVG so it scales cleanly and stays a single asset.
 */
export function CodeInLogo({ className, height = 40 }: CodeInLogoProps) {
  const ratio = 540 / 140;
  return (
    <svg
      width={height * ratio}
      height={height}
      viewBox="0 0 540 140"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("inline-block", className)}
      aria-label="code.in"
      role="img"
    >
      <g fill="#D4A843">
        {/* c */}
        <rect x="0" y="20" width="18" height="100" />
        <rect x="0" y="20" width="70" height="18" />
        <rect x="0" y="102" width="70" height="18" />

        {/* o */}
        <rect x="90" y="20" width="18" height="100" />
        <rect x="148" y="20" width="18" height="100" />
        <rect x="90" y="20" width="76" height="18" />
        <rect x="90" y="102" width="76" height="18" />

        {/* d */}
        <rect x="186" y="20" width="18" height="100" />
        <rect x="244" y="0" width="18" height="120" />
        <rect x="186" y="20" width="76" height="18" />
        <rect x="186" y="102" width="76" height="18" />

        {/* e */}
        <rect x="282" y="20" width="18" height="100" />
        <rect x="282" y="20" width="76" height="18" />
        <rect x="282" y="61" width="60" height="18" />
        <rect x="282" y="102" width="76" height="18" />

        {/* . */}
        <rect x="378" y="102" width="18" height="18" />

        {/* i */}
        <rect x="416" y="0" width="18" height="22" />
        <rect x="416" y="40" width="18" height="80" />

        {/* n */}
        <rect x="454" y="40" width="18" height="80" />
        <rect x="512" y="40" width="18" height="80" />
        <rect x="454" y="40" width="76" height="18" />
      </g>
    </svg>
  );
}
