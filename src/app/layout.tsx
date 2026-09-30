import "./globals.css";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { config } from "@fortawesome/fontawesome-svg-core";
import { Baloo_2, Nunito } from "next/font/google";
import type { Metadata, Viewport } from "next";
import BottomNav from "@/components/BottomNav";
import SideNav from "@/components/SideNav";
import Splash from "@/components/Splash";
config.autoAddCss = false;

const display = Baloo_2({ subsets: ["latin", "latin-ext"], variable: "--f-display", weight: ["600", "700", "800"] });
const body = Nunito({ subsets: ["latin", "latin-ext"], variable: "--f-body" });

export const metadata: Metadata = { title: "Bigova | Biga Öğrenci Uygulaması", description: "Biga'da işletmeler, ulaşım, notlar ve arkadaşların tek uygulamada." };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#0E3A5B" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning className={`${display.variable} ${body.variable}`}>
      <head><script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem("bigova-theme");if(!t)t=matchMedia("(prefers-color-scheme: dark)").matches?"gece":"sabah";document.documentElement.dataset.theme=t}catch(e){}` }} /></head>
      <body>
        <Splash />
        <SideNav />
        <div className="shell pb-28 lg:pb-10">{children}</div>
        <BottomNav />
      </body>
    </html>
  );
}
