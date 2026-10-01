"use client";

import {
    CLICK_SOUND_ENABLED_KEY,
    CLICK_SOUND_STYLE_KEY,
    playClickSound,
} from "@/lib/clickSound";
import { useEffect } from "react";

export default function ClickSounds() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const control = target.closest<HTMLElement>(
        "button, a[href], [role='button'], input[type='button'], input[type='submit'], input[type='reset']",
      );
      if (!control || control.getAttribute("aria-disabled") === "true") return;
      if (control instanceof HTMLButtonElement && control.disabled) return;

      try {
        if (localStorage.getItem(CLICK_SOUND_ENABLED_KEY) === "false") return;
        const style =
          control.dataset.clickSound ||
          localStorage.getItem(CLICK_SOUND_STYLE_KEY) ||
          "soft";
        playClickSound(style);
      } catch {
        playClickSound("soft");
      }
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
