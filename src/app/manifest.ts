import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bigova | Biga Öğrenci Uygulaması",
    short_name: "Bigova",
    description:
      "Biga'da işletmeler, ulaşım, notlar ve arkadaşların tek uygulamada.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0E3A5B",
    lang: "tr",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
