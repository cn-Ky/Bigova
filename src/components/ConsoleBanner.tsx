"use client";

import { useEffect } from "react";

/**
 * Tarayıcı konsolu açıldığında görünen Bigova imzası.
 */
const CONTACT_EMAIL = "cnkybs@gmail.com";
const SITE_URL = "https://bigova.vercel.app";

const LETTERS = {"B": [" ____  ", "|  _ \\ ", "| |_) |", "|  _ < ", "| |_) |", "|____/ "], "I": [" _____ ", "|_   _|", "  | |  ", "  | |  ", " _| |_ ", "|_____|"], "G": ["  _____ ", " / ____|", "| |  __ ", "| | |_ |", "| |__| |", " \\_____|"], "O": ["  ____  ", " / __ \\ ", "| |  | |", "| |  | |", "| |__| |", " \\____/ "], "V": ["__      __", "\\ \\    / /", " \\ \\  / / ", "  \\ \\/ /  ", "   \\  /   ", "    \\/    "], "A": ["          ", "    /\\    ", "   /  \\   ", "  / /\\ \\  ", " / ____ \\ ", "/_/    \\_\\"]} as const;
const COLORS: Record<string, string> = {"B": "#1d6a93", "I": "#2cc4b5", "G": "#ffb84d", "O": "#ff6b57", "V": "#2f7fb8", "A": "#2cc4b5"};
const WORD = "BIGOVA";

let printed = false;

export default function ConsoleBanner() {
  useEffect(() => {
    if (printed || typeof console === "undefined") return;
    printed = true;
    try {
      const rows: string[] = [];
      const styles: string[] = [];
      for (let row = 0; row < 6; row++) {
        let line = "";
        for (const letter of WORD) {
          line += "%c" + LETTERS[letter as keyof typeof LETTERS][row] + " ";
          styles.push(
            `color:${COLORS[letter]};font-family:monospace;font-weight:700;font-size:13px;line-height:1.1`,
          );
        }
        rows.push(line);
      }
      console.log("\n" + rows.join("\n"), ...styles);

      console.log(
        "%cBiga'da öğrenci olmak kolay.",
        "color:#1d6a93;font-size:15px;font-weight:800;font-family:system-ui,sans-serif",
      );
      console.log(
        "%c👨‍💻 Geliştirici olarak Bigova'da çalışmak isterseniz bizimle iletişime geçin!",
        "color:#fff;background:#ff6b57;padding:4px 10px;border-radius:6px;font-size:13px;font-weight:700;font-family:system-ui,sans-serif",
      );
      const contact = [
        CONTACT_EMAIL ? `✉️  ${CONTACT_EMAIL}` : "",
        `🌐 ${SITE_URL}`,
      ]
        .filter(Boolean)
        .join("\n");
      console.log(
        "%c" + contact,
        "color:#2cc4b5;font-size:12px;font-weight:700;font-family:system-ui,sans-serif;line-height:1.6",
      );
    } catch {
      // konsol imzası isteğe bağlıdır; hata sayfayı etkilemesin
    }
  }, []);
  return null;
}
