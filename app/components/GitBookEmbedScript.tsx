"use client";

import { useEffect } from "react";

const SITE_URL = "https://stage.docs.rodrcastro.dev";
const CDN_SCRIPT_SRC = "https://cdn.jsdelivr.net/npm/@gitbook/embed@0.2.2/dist/script.js";

declare global {
  interface Window {
    __gitBookCloseBridgeListeners?: Set<() => void>;
    __gitBookCloseBridgeOriginalLog?: typeof console.log;
  }
}

function resolveSiteScriptURL(siteURL: string): string {
  const url = new URL(siteURL);
  url.pathname = `${url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`}~gitbook/embed/script.js`;
  url.search = "";
  url.hash = "";
  return url.toString();
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

function hideGitBookScriptFrameNodes() {
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

export default function GitBookEmbedScript() {
  useEffect(() => {
    let isDisposed = false;
    const scriptSources = [resolveSiteScriptURL(SITE_URL), CDN_SCRIPT_SRC];
    let scriptElement: HTMLScriptElement | null = null;

    const initWidget = () => {
      if (isDisposed || !window.GitBook) {
        return;
      }

      window.GitBook("init", { siteURL: SITE_URL });
      window.GitBook("configure", { closeButton: true });
      window.GitBook("show");
    };

    const onFrameMessage = (event: MessageEvent) => {
      if (!isMessageFromGitBookEmbedFrame(event)) {
        return;
      }

      if (resolveMessageType(event.data) !== "close") {
        return;
      }

      if (window.GitBook) {
        window.GitBook("close");
        window.GitBook("hide");
        window.GitBook("unload");
      }

      forceCloseGitBookScriptWidgetUI();
      hideGitBookScriptFrameNodes();
    };

    const loadScript = (src: string) =>
      new Promise<void>((resolve, reject) => {
        scriptElement?.remove();
        scriptElement = document.createElement("script");
        scriptElement.src = src;
        scriptElement.async = true;
        scriptElement.addEventListener("load", () => resolve(), { once: true });
        scriptElement.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
        document.body.appendChild(scriptElement);
      });

    const boot = async () => {
      if (window.GitBook) {
        initWidget();
        return;
      }

      for (const src of scriptSources) {
        try {
          await loadScript(src);
          if (window.GitBook) {
            initWidget();
            return;
          }
        } catch (error) {
          console.error(error);
        }
      }
    };

    const removeCloseBridge = addGitBookCloseBridgeListener(() => {
      if (window.GitBook) {
        window.GitBook("close");
        window.GitBook("hide");
      }
      forceCloseGitBookScriptWidgetUI();
      hideGitBookScriptFrameNodes();
    });

    window.addEventListener("message", onFrameMessage);
    void boot();

    return () => {
      isDisposed = true;
      removeCloseBridge();
      window.removeEventListener("message", onFrameMessage);

      if (scriptElement) {
        scriptElement.removeEventListener("load", initWidget);
      }

      if (window.GitBook) {
        window.GitBook("close");
        window.GitBook("hide");
        window.GitBook("unload");
      }

      if (scriptElement?.parentNode) {
        scriptElement.parentNode.removeChild(scriptElement);
      }
    };
  }, []);

  return null;
}
