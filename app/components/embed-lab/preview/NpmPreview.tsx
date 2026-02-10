"use client";

import { useEffect, useMemo, useRef } from "react";
import { SharedConfiguration } from "../types";
import { buildSharedConfiguration } from "../utils";

interface NpmPreviewProps {
  siteURL: string;
  mode: "assistant" | "docs";
  sharedConfiguration: SharedConfiguration;
  onStatus: (message: string, level?: "info" | "success" | "error") => void;
}

interface GitBookRuntime {
  configure: (config: Record<string, unknown>) => void;
  navigateToAssistant?: () => void;
  destroy?: () => void;
}

export function NpmPreview({ siteURL, mode, sharedConfiguration, onStatus }: NpmPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const configuration = useMemo(() => buildSharedConfiguration(sharedConfiguration), [sharedConfiguration]);

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    const timer = window.setTimeout(async () => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      container.innerHTML = "";
      const iframe = document.createElement("iframe");
      iframe.className = "gitbook-embed-frame";
      container.appendChild(iframe);

      try {
        const mod = await import("@gitbook/embed");
        if (cancelled) {
          return;
        }

        const createGitBook = (
          mod as { createGitBook: (frame: HTMLIFrameElement, url: string) => GitBookRuntime }
        ).createGitBook;
        const gitbook = createGitBook(iframe, siteURL);

        gitbook.configure({
          ...configuration,
          mode,
        });

        if (mode === "assistant") {
          gitbook.navigateToAssistant?.();
        }

        onStatus("NPM embed applied.", "success");
        cleanup = () => {
          gitbook.destroy?.();
          iframe.remove();
        };
      } catch {
        onStatus("NPM embed failed to initialize.", "error");
      }
    }, 320);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      cleanup?.();
    };
  }, [siteURL, configuration, mode, onStatus]);

  return <div ref={containerRef} className="gitbook-embed" />;
}
