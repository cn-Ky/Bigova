export default function Mascot({ size = 120, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={className} role="img" aria-label="Bigova martısı">
      <g className="m-bob">
        <path d="M44 100v12M62 100v12" stroke="#FF9A3C" strokeWidth="4" strokeLinecap="round" />
        <path d="M38 113h12M56 113h12" stroke="#FF9A3C" strokeWidth="4" strokeLinecap="round" />
        <path d="M26 72 6 60c14-2 26 2 34 8z" fill="#9DB7C4" />
        <ellipse cx="56" cy="76" rx="34" ry="27" fill="#fff" />
        <circle cx="80" cy="46" r="21" fill="#fff" />
        <path d="M98 44l20 6-20 8z" fill="#FFB84D" />
        <g className="m-eye"><circle cx="85" cy="42" r="3.6" fill="#072638" /><circle cx="86.2" cy="40.8" r="1.1" fill="#fff" /></g>
        <circle cx="90" cy="53" r="4" fill="#FF6B57" opacity=".35" />
        <path d="M74 30c4-4 10-5 14-3" stroke="#9DB7C4" strokeWidth="3" strokeLinecap="round" fill="none" />
        <g className="m-wing"><path d="M52 66c-16 2-28 12-32 28 18 2 34-6 42-22z" fill="#CFE2EB" /><path d="M20 94c4-4 8-6 12-8" stroke="#0E3A5B" strokeWidth="3" strokeLinecap="round" fill="none" /></g>
      </g>
    </svg>
  );
}
