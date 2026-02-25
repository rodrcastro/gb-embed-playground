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
    __gitBookCloseBridgeListeners?: Set<() => void>;
    __gitBookCloseBridgeOriginalLog?: typeof console.log;
  }
}

function getGitBookEmbedIframes(): HTMLIFrameElement[] {
  return Array.from(document.querySelectorAll<HTMLIFrameElement>("iframe")).filter((frame) => {
    const src = frame.getAttribute("src") || "";
    return src.includes("/~gitbook/embed") || src.includes("gitbook/embed");
  });
}

function isMessageFromGitBookEmbedFrame(event: MessageEvent): boolean {
  if (!event.source) {
    return false;
  }

  return getGitBookEmbedIframes().some((frame) => frame.contentWindow === event.source);
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

function addGitBookCloseBridgeListener(listener: () => void): () => void {
  if (!window.__gitBookCloseBridgeListeners) {
    window.__gitBookCloseBridgeListeners = new Set();
  }

  if (!window.__gitBookCloseBridgeOriginalLog) {
    window.__gitBookCloseBridgeOriginalLog = console.log;
    console.log = (...args: unknown[]) => {
      window.__gitBookCloseBridgeOriginalLog?.(...args);

      const first = args[0];
      const payload = args[1] as { type?: string } | undefined;
      const isGitBookLog =
        typeof first === "string" && first.includes("[gitbook:embed] received message");

      if (isGitBookLog && payload?.type === "close") {
        for (const cb of window.__gitBookCloseBridgeListeners || []) {
          cb();
        }
      }
    };
  }

  window.__gitBookCloseBridgeListeners.add(listener);

  return () => {
    window.__gitBookCloseBridgeListeners?.delete(listener);
    if ((window.__gitBookCloseBridgeListeners?.size || 0) > 0) {
      return;
    }

    if (window.__gitBookCloseBridgeOriginalLog) {
      console.log = window.__gitBookCloseBridgeOriginalLog;
      window.__gitBookCloseBridgeOriginalLog = undefined;
    }
  };
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
      if (!isMessageFromGitBookEmbedFrame(event)) {
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

    const removeCloseBridge = addGitBookCloseBridgeListener(() => {
      if (typeof window.GitBook === "function") {
        window.GitBook("close");
        window.GitBook("hide");
      }
      forceCloseGitBookScriptWidgetUI();
      hideGitBookScriptFrameNodes();
      onStatus("Script embed close event received. Widget hidden.", "info");
    });

    window.addEventListener("message", onFrameMessage);
    void boot();

    return () => {
      cancelled = true;
      removeCloseBridge();
      window.removeEventListener("message", onFrameMessage);
      cleanupGitBookScriptWidget();
    };
  }, [siteURL, mode, configuration, onStatus, effectiveJWTToken]);

  return <div className="gitbook-embed script-mode" />;
}
