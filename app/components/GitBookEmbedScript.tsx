"use client";

import { useEffect } from "react";

const SITE_URL = "https://stage.docs.rodrcastro.dev";
const CDN_SCRIPT_SRC = "https://cdn.jsdelivr.net/npm/@gitbook/embed@0.2.2/dist/script.js";

function resolveSiteScriptURL(siteURL: string): string {
  const url = new URL(siteURL);
  url.pathname = `${url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`}~gitbook/embed/script.js`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

function hideGitBookScriptFrameNodes() {
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

export default function GitBookEmbedScript() {
  useEffect(() => {
    let isDisposed = false;
    const scriptSources = [resolveSiteScriptURL(SITE_URL), CDN_SCRIPT_SRC];
    let scriptElement: HTMLScriptElement | null = null;
    const siteOrigin = new URL(SITE_URL).origin;

    const initWidget = () => {
      if (isDisposed || !window.GitBook) {
        return;
      }

      window.GitBook("init", { siteURL: SITE_URL });
      window.GitBook("configure", { closeButton: true });
      window.GitBook("show");
    };

    const onFrameMessage = (event: MessageEvent) => {
      if (event.origin !== siteOrigin) {
        return;
      }

      if (typeof event.data !== "object" || event.data === null) {
        return;
      }

      const message = event.data as { type?: string };
      if (message.type !== "close" || !window.GitBook) {
        return;
      }

      window.GitBook("close");
      window.GitBook("hide");
      window.GitBook("unload");
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

    window.addEventListener("message", onFrameMessage);
    void boot();

    return () => {
      isDisposed = true;
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
