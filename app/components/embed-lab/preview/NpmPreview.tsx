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
  navigateToPage?: (path: string) => void;
  navigateToAssistant?: () => void;
}

interface GitBookClientRuntime {
  getFrameURL: (options: {
    visitor?: {
      token?: string;
      unsignedClaims?: Record<string, unknown>;
    };
  }) => string;
  createFrame: (frame: HTMLIFrameElement) => GitBookRuntime;
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
          mod as unknown as {
            createGitBook: (options: { siteURL: string }) => GitBookClientRuntime;
          }
        ).createGitBook;
        const gitbookClient = createGitBook({ siteURL });
        iframe.src = gitbookClient.getFrameURL({
          visitor: {
            token: configuration.visitor.token,
            unsignedClaims: configuration.visitor.user?.unsignedClaims,
          },
        });

        const gitbook = gitbookClient.createFrame(iframe);

        gitbook.configure({
          tabs: configuration.tabs,
          actions: configuration.actions,
          greeting: configuration.greeting,
          suggestions: configuration.suggestions,
          tools: configuration.tools,
        });

        if (mode === "assistant") {
          gitbook.navigateToAssistant?.();
        } else {
          gitbook.navigateToPage?.("/");
        }

        onStatus("NPM embed applied.", "success");
        cleanup = () => {
          iframe.remove();
        };
      } catch (error) {
        console.error(error);
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
