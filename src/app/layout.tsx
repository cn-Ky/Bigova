import "./globals.css";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { config } from "@fortawesome/fontawesome-svg-core";
import type { Metadata, Viewport } from "next";
config.autoAddCss = false;

export const metadata: Metadata = { title: "Bigova | Biga Öğrenci Platformu", description: "ÇOMÜ Biga yerleşkesi öğrencileri için işletmeler, ulaşım, notlar ve daha fazlası." };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#0b3d5c" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="tr"><body>{children}</body></html>;
}
