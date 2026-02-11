"use client";

import { useEffect, useMemo } from "react";
import { GITBOOK_SCRIPT_URL } from "../defaults";
import { ScriptOnlyConfiguration, SharedConfiguration } from "../types";
import { buildScriptConfiguration, resolveVisitorJWTToken } from "../utils";

interface ScriptPreviewProps {
  siteURL: string;
  mode: "assistant" | "docs";
  sharedConfiguration: SharedConfiguration;
  scriptOnlyConfiguration: ScriptOnlyConfiguration;
  onStatus: (message: string, level?: "info" | "success" | "error") => void;
}

type GitBookCommand =
  | "init"
  | "show"
  | "hide"
  | "open"
  | "close"
  | "toggle"
  | "navigateToPage"
  | "navigateToAssistant"
  | "postUserMessage"
  | "clearChat"
  | "configure"
  | "unload";

declare global {
  interface Window {
    GitBook?: ((command: GitBookCommand, ...args: unknown[]) => void) & {
      q?: unknown[][];
    };
  }
}

export function cleanupGitBookScriptWidget() {
  if (typeof window === "undefined") {
    return;
  }

  if (typeof window.GitBook === "function") {
    try {
      window.GitBook("close");
      window.GitBook("hide");
      window.GitBook("unload");
    } catch {
      // No-op: best effort cleanup for third-party widget state.
    }
  }

  const existingScript = document.getElementById("gitbook-embed-script");
  existingScript?.remove();

  const floatingEmbedNodes = Array.from(document.querySelectorAll<HTMLElement>("body *")).filter((node) => {
    if (node.closest(".embed-lab") || node.closest(".gitbook-embed")) {
      return false;
    }

    if (!node.querySelector('iframe[src*="/~gitbook/embed"]')) {
      return false;
    }

    const style = window.getComputedStyle(node);
    return style.position === "fixed";
  });

  floatingEmbedNodes.forEach((node) => node.remove());
}

function resolveGitBookScriptURL(siteURL: string): string {
  try {
    const url = new URL(siteURL);
    url.pathname = `${url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`}~gitbook/embed/script.js`;
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return GITBOOK_SCRIPT_URL;
  }
}

export function ScriptPreview({
  siteURL,
  mode,
  sharedConfiguration,
  scriptOnlyConfiguration,
  onStatus,
}: ScriptPreviewProps) {
  const configuration = useMemo(
    () => buildScriptConfiguration(sharedConfiguration, scriptOnlyConfiguration),
    [sharedConfiguration, scriptOnlyConfiguration],
  );

  useEffect(() => {
    let cancelled = false;
    const scriptURL = resolveGitBookScriptURL(siteURL);
    const jwtToken = resolveVisitorJWTToken(sharedConfiguration.visitor);
    const unsignedClaims = configuration.visitor?.user?.unsignedClaims;
    const visitorOptions =
      jwtToken || unsignedClaims
        ? {
            visitor: {
              jwt_token: jwtToken,
              unsignedClaims,
            },
          }
        : undefined;

    const run = () => {
      if (cancelled) {
        return;
      }

      if (typeof window.GitBook !== "function") {
        onStatus("Script API is not available after loading script.", "error");
        return;
      }

      cleanupGitBookScriptWidget();
      window.GitBook(
        "init",
        { siteURL },
        visitorOptions,
      );
      window.GitBook("configure", configuration);
      window.GitBook("show");
      window.GitBook("open");

      if (mode === "assistant") {
        window.GitBook("navigateToAssistant");
      } else {
        window.GitBook("navigateToPage", "/");
      }

      onStatus("Script embed reloaded.", "success");
    };

    const existingScript = document.getElementById("gitbook-embed-script") as HTMLScriptElement | null;
    if (existingScript && existingScript.src === scriptURL) {
      if (typeof window.GitBook === "function") {
        run();
      } else {
        existingScript.addEventListener("load", run, { once: true });
      }
      return () => {
        cancelled = true;
        existingScript.removeEventListener("load", run);
      };
    }

    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement("script");
    script.id = "gitbook-embed-script";
    script.async = true;
    script.src = scriptURL;
    script.onload = () => {
      if (cancelled) {
        return;
      }
      run();
    };
    script.onerror = () => {
      if (cancelled) {
        return;
      }
      onStatus("Script embed failed to load.", "error");
    };

    document.head.appendChild(script);

    return () => {
      cancelled = true;
      cleanupGitBookScriptWidget();
    };
  }, [siteURL, mode, configuration, onStatus, sharedConfiguration.visitor]);

  return <div className="gitbook-embed script-mode" />;
}
