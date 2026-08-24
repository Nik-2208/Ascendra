"use client";

import { useUIStore } from "@/stores/ui-store";
import { useEffect } from "react";

export function ClientSettingsProvider({ children }: { children: React.ReactNode }) {
  const ui = useUIStore();

  useEffect(() => {
    const body = document.body;
    if (!body) return;

    if (ui.accessibilityFont) {
      body.classList.add("accessibility-mode");
    } else {
      body.classList.remove("accessibility-mode");
    }

    if (!ui.animationsEnabled) {
      body.classList.add("disable-animations");
    } else {
      body.classList.remove("disable-animations");
    }
  }, [ui.accessibilityFont, ui.animationsEnabled]);

  return <>{children}</>;
}
