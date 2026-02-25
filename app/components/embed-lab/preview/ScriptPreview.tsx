"use client";

import { useEffect, useMemo } from "react";
import { GITBOOK_SCRIPT_URL } from "../defaults";
import { ScriptOnlyConfiguration, SharedConfiguration } from "../types";
import { buildScriptConfiguration } from "../utils";

interface ScriptPreviewProps {
  siteURL: string;
  mode: "assistant" | "docs";
  sharedConfiguration: SharedConfiguration;
  scriptOnlyConfiguration: ScriptOnlyConfiguration;
  effectiveJWTToken?: string;
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

function hideGitBookScriptFrameNodes() {
  if (typeof window === "undefined") {
    return;
  }

  const floatingEmbedNodes = Array.from(document.querySelectorAll<HTMLElement>("body *")).filter((node) => {
    if (!node.querySelector('iframe[src*="/~gitbook/embed"]')) {
      return false;
    }

    const style = window.getComputedStyle(node);
    return style.position === "fixed";
  });

  floatingEmbedNodes.forEach((node) => {
    node.style.setProperty("display", "none", "important");
    node.style.setProperty("visibility", "hidden", "important");
    node.style.setProperty("pointer-events", "none", "important");
  });
}

function resolveSiteScriptURL(siteURL: string): string | undefined {
  try {
    const url = new URL(siteURL);
    url.pathname = `${url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`}~gitbook/embed/script.js`;
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return undefined;
  }
}

export function ScriptPreview({
  siteURL,
  mode,
  sharedConfiguration,
  scriptOnlyConfiguration,
  effectiveJWTToken,
  onStatus,
}: ScriptPreviewProps) {
  const configuration = useMemo(
    () => buildScriptConfiguration(sharedConfiguration, scriptOnlyConfiguration),
    [sharedConfiguration, scriptOnlyConfiguration],
  );

  useEffect(() => {
    let cancelled = false;
    const scriptURLs = [resolveSiteScriptURL(siteURL), GITBOOK_SCRIPT_URL].filter(Boolean) as string[];
    const siteOrigin = (() => {
      try {
        return new URL(siteURL).origin;
      } catch {
        return undefined;
      }
    })();
    const jwtToken = effectiveJWTToken;
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

    const onFrameMessage = (event: MessageEvent) => {
      if (siteOrigin && event.origin !== siteOrigin) {
        return;
      }

      if (typeof event.data !== "object" || event.data === null) {
        return;
      }

      const message = event.data as { type?: string };
      if (message.type !== "close" || typeof window.GitBook !== "function") {
        return;
      }

      window.GitBook("close");
      window.GitBook("hide");
      window.GitBook("unload");
      hideGitBookScriptFrameNodes();
      onStatus("Script embed close event received. Widget hidden.", "info");
    };

    const loadScript = (src: string): Promise<void> =>
      new Promise((resolve, reject) => {
        const existingScript = document.getElementById("gitbook-embed-script");
        existingScript?.remove();

        const script = document.createElement("script");
        script.id = "gitbook-embed-script";
        script.async = true;
        script.src = src;

        const timeout = window.setTimeout(() => {
          script.remove();
          reject(new Error(`timeout: ${src}`));
        }, 10000);

        script.onload = () => {
          window.clearTimeout(timeout);
          resolve();
        };
        script.onerror = () => {
          window.clearTimeout(timeout);
          script.remove();
          reject(new Error(`error: ${src}`));
        };

        document.head.appendChild(script);
      });

    const boot = async () => {
      if (typeof window.GitBook === "function") {
        run();
        return;
      }

      for (const src of scriptURLs) {
        try {
          await loadScript(src);
          if (cancelled) {
            return;
          }

          if (typeof window.GitBook === "function") {
            run();
            return;
          }
        } catch (error) {
          console.error("GitBook script load failed", error);
        }
      }

      if (!cancelled) {
        onStatus("Script embed failed to load from siteURL and CDN script sources.", "error");
      }
    };

    window.addEventListener("message", onFrameMessage);
    void boot();

    return () => {
      cancelled = true;
      window.removeEventListener("message", onFrameMessage);
      cleanupGitBookScriptWidget();
    };
  }, [siteURL, mode, configuration, onStatus, effectiveJWTToken]);

  return <div className="gitbook-embed script-mode" />;
}
