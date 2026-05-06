import { cn } from "@/lib/utils";

interface FELogoProps {
  className?: string;
  size?: number;
}

export function FELogo({ className, size = 64 }: FELogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 600 600"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("inline-block", className)}
      aria-label="Future Engineers Conclave"
      role="img"
    >
      <rect
        x="30"
        y="30"
        width="540"
        height="540"
        rx="130"
        ry="130"
        fill="#1A1A1A"
        stroke="#D4A843"
        strokeWidth="8"
      />
      {/* F */}
      <g fill="#F5F5F0">
        <rect x="125" y="175" width="46" height="250" />
        <rect x="125" y="175" width="180" height="46" />
        <rect x="125" y="270" width="125" height="42" />
      </g>
      {/* gold dot */}
      <circle cx="310" cy="425" r="22" fill="#D4A843" />
      {/* E */}
      <g fill="#F5F5F0">
        <rect x="355" y="175" width="46" height="250" />
        <rect x="355" y="175" width="125" height="46" />
        <rect x="355" y="270" width="105" height="42" />
        <rect x="355" y="379" width="145" height="46" />
      </g>
    </svg>
  );
}
