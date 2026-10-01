import AdaptiveNavigation from "@/components/AdaptiveNavigation";
import ClickSounds from "@/components/ClickSounds";
import Splash from "@/components/Splash";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import type { Metadata, Viewport } from "next";
import "./globals.css";
config.autoAddCss = false;

export const metadata: Metadata = {
  title: "Bigova | Biga Öğrenci Uygulaması",
  description:
    "Biga'da işletmeler, ulaşım, notlar ve arkadaşların tek uygulamada.",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0E3A5B",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito:wght@400;600;700;800&display=swap"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var d=document.documentElement;var t=localStorage.getItem("bigova-theme");if(!t)t=matchMedia("(prefers-color-scheme: dark)").matches?"gece":"sabah";d.dataset.theme=t;var m=localStorage.getItem("bigova-mobile-nav");d.dataset.mobileNav=["bottom","drawer","top"].includes(m)?m:"bottom";var x=localStorage.getItem("bigova-desktop-nav");d.dataset.desktopNav=["sidebar","top","rail"].includes(x)?x:"sidebar"}catch(e){}`,
          }}
        />
      </head>
      <body>
        <ClickSounds />
        <Splash />
        <AdaptiveNavigation />
        <div className="shell pb-28 lg:pb-10">{children}</div>
      </body>
    </html>
  );
}
