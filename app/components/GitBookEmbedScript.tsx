"use client";

import { useEffect } from "react";

const SITE_URL = "https://stage.docs.rodrcastro.dev";
const SCRIPT_SRC = "https://cdn.jsdelivr.net/npm/@gitbook/embed@0.2.2/dist/script.js";

export default function GitBookEmbedScript() {
  useEffect(() => {
    let isDisposed = false;
    let ownsScript = false;
    let scriptElement = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`,
    );

    const initWidget = () => {
      if (isDisposed || !window.GitBook) {
        return;
      }

      window.GitBook("init", { siteURL: SITE_URL });
      window.GitBook("configure", { closeButton: true });
      window.GitBook("show");
    };

    if (window.GitBook) {
      initWidget();
    } else if (scriptElement) {
      scriptElement.addEventListener("load", initWidget, { once: true });
    } else {
      scriptElement = document.createElement("script");
      scriptElement.src = SCRIPT_SRC;
      scriptElement.async = true;
      scriptElement.addEventListener("load", initWidget, { once: true });
      document.body.appendChild(scriptElement);
      ownsScript = true;
    }

    return () => {
      isDisposed = true;

      if (scriptElement) {
        scriptElement.removeEventListener("load", initWidget);
      }

      if (window.GitBook) {
        window.GitBook("close");
        window.GitBook("hide");
        window.GitBook("unload");
      }

      if (ownsScript && scriptElement?.parentNode) {
        scriptElement.parentNode.removeChild(scriptElement);
      }
    };
  }, []);

  return null;
}
