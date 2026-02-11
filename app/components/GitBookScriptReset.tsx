"use client";

import { useEffect } from "react";

type EmbedMode = "react" | "npm" | "script";

export default function GitBookScriptReset({ mode }: { mode: EmbedMode }) {
  useEffect(() => {
    if (mode === "script" || !window.GitBook) {
      return;
    }

    window.GitBook("close");
    window.GitBook("hide");
    window.GitBook("unload");
  }, [mode]);

  return null;
}
