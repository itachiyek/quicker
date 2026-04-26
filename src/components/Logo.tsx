type LogoProps = {
  size?: number;
  className?: string;
  title?: string;
};

/** Square monogram — the "Q" in a dark rounded tile with a speedometer
 *  accent. Used in header chips and the splash. */
export default function Logo({
  size = 40,
  className,
  title = "Quicker",
}: LogoProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <defs>
        <linearGradient id="qbg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#292524" />
          <stop offset="1" stopColor="#0c0a09" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#qbg)" />
      <path
        d="M 36 18 A 14 14 0 0 1 56 30"
        stroke="#fde68a"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <line
        x1="48"
        y1="24"
        x2="55"
        y2="20"
        stroke="#fde68a"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="48" cy="24" r="2" fill="#fde68a" />
      <text
        x="32"
        y="56"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontStyle="italic"
        fontWeight={900}
        fontSize={44}
        fill="#fafaf9"
      >
        Q
      </text>
    </svg>
  );
}

/** Full italic wordmark with speedometer + motion lines. Used as the
 *  hero on the login page. */
export function LogoWordmark({
  height = 96,
  className,
}: {
  height?: number;
  className?: string;
}) {
  // Aspect ~ 1.6 : 1
  const w = Math.round(height * 1.6);
  return (
    <svg
      viewBox="0 0 320 200"
      width={w}
      height={height}
      className={className}
      role="img"
      aria-label="Quicker"
    >
      <title>Quicker</title>
      {/* motion lines */}
      <g stroke="currentColor" strokeWidth="6" strokeLinecap="round">
        <line x1="10" y1="58" x2="60" y2="58" />
        <line x1="0" y1="80" x2="55" y2="80" />
      </g>
      {/* speedometer arc */}
      <path
        d="M 90 90 A 70 70 0 0 1 230 90"
        stroke="currentColor"
        strokeWidth="7"
        fill="none"
        strokeLinecap="round"
      />
      {/* tick marks along arc */}
      <g stroke="currentColor" strokeWidth="4" strokeLinecap="round">
        <line x1="105" y1="55" x2="111" y2="65" />
        <line x1="130" y1="36" x2="133" y2="48" />
        <line x1="160" y1="28" x2="160" y2="40" />
        <line x1="190" y1="36" x2="187" y2="48" />
        <line x1="215" y1="55" x2="209" y2="65" />
      </g>
      {/* needle */}
      <line
        x1="160"
        y1="90"
        x2="205"
        y2="55"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle cx="160" cy="90" r="6" fill="currentColor" />
      {/* wordmark */}
      <text
        x="160"
        y="170"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontStyle="italic"
        fontWeight={900}
        fontSize={64}
        fill="currentColor"
        letterSpacing="-2"
      >
        QUICKER
      </text>
      {/* underline swoosh */}
      <path
        d="M 50 192 L 290 188"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
