/** Bigcoin simgesi: altın para üzerinde "B". */
export default function Coin({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="#E3AE2A" />
      <circle cx="16" cy="16" r="12.5" fill="#FFC94D" stroke="#FFE08A" strokeWidth="1.5" />
      <path d="M9 9.5c4 -1.4 8 -1.4 12 0" stroke="#fff" strokeOpacity=".5" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <text x="16" y="21.6" textAnchor="middle" fontSize="15" fontWeight="800" fill="#8A5A00" fontFamily="'Baloo 2', sans-serif">B</text>
    </svg>
  );
}
