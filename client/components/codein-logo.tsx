import { cn } from "@/lib/utils";

interface CodeInLogoProps {
  className?: string;
  height?: number;
}

// Geometry of the wordmark inside /public/code.in-logo.svg.
// The SVG viewBox is 375x375 but the actual letters live in a 319x84
// region offset at (28, 145) — the rest is whitespace padding.
const SVG_W = 375;
const SVG_H = 375;
const MARK_X = 28;
const MARK_Y = 145;
const MARK_W = 319;
const MARK_H = 84;

/**
 * code.in wordmark — the source SVG has heavy padding around the letters,
 * so we render it large and crop the wrapper to just the wordmark area.
 */
export function CodeInLogo({ className, height = 40 }: CodeInLogoProps) {
  const scale = height / MARK_H;
  return (
    <span
      className={cn("relative inline-block overflow-hidden align-middle", className)}
      style={{ width: MARK_W * scale, height }}
    >
      <img
        src="/code.in-logo.svg"
        alt="code.in"
        style={{
          position: "absolute",
          width: SVG_W * scale,
          height: SVG_H * scale,
          left: -MARK_X * scale,
          top: -MARK_Y * scale,
          maxWidth: "none",
        }}
      />
    </span>
  );
}
