type LogoProps = {
  size?: number;
  /** Show the small accent dot in the corner */
  withDot?: boolean;
  className?: string;
  title?: string;
};

export default function Logo({
  size = 40,
  withDot = true,
  className,
  title = "Brain Trainer",
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
        <linearGradient id="bt-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#292524" />
          <stop offset="1" stopColor="#0c0a09" />
        </linearGradient>
        <linearGradient id="bt-dot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#bt-bg)" />
      <text
        x="32"
        y="46"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight={700}
        fontSize={40}
        fill="#fafaf9"
        letterSpacing={-1}
      >
        B
      </text>
      {withDot && (
        <>
          <circle cx="48" cy="18" r="5" fill="url(#bt-dot)" />
          <circle
            cx="48"
            cy="18"
            r="5"
            fill="none"
            stroke="#0c0a09"
            strokeWidth="1"
            strokeOpacity="0.3"
          />
        </>
      )}
    </svg>
  );
}
