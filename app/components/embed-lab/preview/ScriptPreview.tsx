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

const FORCE_HIDDEN_ATTR = "data-gitbook-force-hidden";

function getGitBookEmbedIframes(): HTMLIFrameElement[] {
  return Array.from(document.querySelectorAll<HTMLIFrameElement>("iframe")).filter((frame) => {
    const src = frame.getAttribute("src") || "";
    return src.includes("/~gitbook/embed") || src.includes("gitbook/embed");
  });
}

function resolveLatestGitBookEmbedFrameWindow(): Window | null {
  const frames = getGitBookEmbedIframes();
  return frames[frames.length - 1]?.contentWindow || null;
}

function resolveMessageType(data: unknown): string | undefined {
  if (typeof data === "object" && data !== null) {
    return (data as { type?: string }).type;
  }

  if (typeof data !== "string") {
    return undefined;
  }

  try {
    const parsed = JSON.parse(data) as { type?: string };
    return parsed.type;
  } catch {
    return undefined;
  }
}

function forceCloseGitBookScriptWidgetUI() {
  const windowEl = document.getElementById("gitbook-widget-window");
  const buttonEl = document.getElementById("gitbook-widget-button");
  windowEl?.classList.add("hidden");
  buttonEl?.classList.remove("open");
}

function restoreGitBookScriptWidgetUI() {
  const windowEl = document.getElementById("gitbook-widget-window");
  const buttonEl = document.getElementById("gitbook-widget-button");

  windowEl?.classList.remove("hidden");
  windowEl?.style.removeProperty("display");
  windowEl?.style.removeProperty("visibility");
  windowEl?.style.removeProperty("pointer-events");
  windowEl?.removeAttribute(FORCE_HIDDEN_ATTR);

  buttonEl?.style.removeProperty("display");
  buttonEl?.style.removeProperty("visibility");
  buttonEl?.style.removeProperty("pointer-events");
  buttonEl?.removeAttribute(FORCE_HIDDEN_ATTR);
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

  const nodesToHide = new Set<HTMLElement>();
  for (const frame of getGitBookEmbedIframes()) {
    nodesToHide.add(frame);
    let parent = frame.parentElement;
    let depth = 0;
    while (parent && parent !== document.body && depth < 8) {
      nodesToHide.add(parent);
      parent = parent.parentElement;
      depth += 1;
    }
  }

  const fixedGitBookContainers = Array.from(document.querySelectorAll<HTMLElement>("body > *")).filter((node) => {
    const style = window.getComputedStyle(node);
    if (style.position !== "fixed" && style.position !== "sticky") {
      return false;
    }

    if (node.querySelector('iframe[src*="gitbook/embed"]')) {
      return true;
    }

    const nodeText = `${node.id} ${node.className}`.toLowerCase();
    return nodeText.includes("gitbook");
  });

  for (const node of fixedGitBookContainers) {
    nodesToHide.add(node);
  }

  nodesToHide.forEach((node) => {
    node.setAttribute(FORCE_HIDDEN_ATTR, "1");
    node.style.setProperty("display", "none", "important");
    node.style.setProperty("visibility", "hidden", "important");
    node.style.setProperty("pointer-events", "none", "important");
  });
}

function restoreGitBookScriptFrameNodes() {
  const hiddenNodes = Array.from(document.querySelectorAll<HTMLElement>(`[${FORCE_HIDDEN_ATTR}="1"]`));
  hiddenNodes.forEach((node) => {
    node.style.removeProperty("display");
    node.style.removeProperty("visibility");
    node.style.removeProperty("pointer-events");
    node.removeAttribute(FORCE_HIDDEN_ATTR);
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
    let activeFrameWindow: Window | null = null;
    const scriptURLs = [resolveSiteScriptURL(siteURL), GITBOOK_SCRIPT_URL].filter(Boolean) as string[];
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

      restoreGitBookScriptFrameNodes();
      restoreGitBookScriptWidgetUI();
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

      window.setTimeout(() => {
        activeFrameWindow = resolveLatestGitBookEmbedFrameWindow();
        restoreGitBookScriptFrameNodes();
        restoreGitBookScriptWidgetUI();
      }, 0);

      onStatus("Script embed reloaded.", "success");
    };

    const onFrameMessage = (event: MessageEvent) => {
      if (!event.source) {
        return;
      }

      if (!activeFrameWindow) {
        activeFrameWindow = resolveLatestGitBookEmbedFrameWindow();
      }

      if (activeFrameWindow && event.source !== activeFrameWindow) {
        return;
      }

      if (resolveMessageType(event.data) !== "close") {
        return;
      }

      if (typeof window.GitBook === "function") {
        window.GitBook("close");
        window.GitBook("hide");
        window.GitBook("unload");
      }

      forceCloseGitBookScriptWidgetUI();
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
      activeFrameWindow = null;
      window.removeEventListener("message", onFrameMessage);
      cleanupGitBookScriptWidget();
    };
  }, [siteURL, mode, configuration, onStatus, effectiveJWTToken]);

  return <div className="gitbook-embed script-mode" />;
}
