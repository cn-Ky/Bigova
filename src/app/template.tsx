// Her sayfa geçişinde içerik yumuşakça kayarak gelir.
// Performans: framer-motion yerine saf CSS (bkz. globals.css .page-in). Önceki sürümde sunucu HTML'i
// opacity:0 geliyordu; içerik JS yüklenip hidrate olana kadar görünmüyordu (LCP/CLS kaybı).
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
