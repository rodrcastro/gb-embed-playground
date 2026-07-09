"use client";

import { useEffect, useMemo, useRef } from "react";
import { EmbedRuntimeControls, SharedConfiguration } from "../types";
import { buildSharedConfiguration, withJWTTokenQueryParameter } from "../utils";

interface NpmPreviewProps {
  siteURL: string;
  mode: "assistant" | "docs";
  sharedConfiguration: SharedConfiguration;
  effectiveJWTToken?: string;
  onStatus: (message: string, level?: "info" | "success" | "error") => void;
  onControlsReady?: (controls: EmbedRuntimeControls | null) => void;
}

interface GitBookRuntime {
  configure: (config: Record<string, unknown>) => void;
  navigateToPage?: (path: string) => void;
  navigateToAssistant?: () => void;
  postUserMessage?: (message: string) => void;
  clearChat?: () => void;
  on?: (event: string, listener: () => void) => () => void;
}

interface GitBookClientRuntime {
  getFrameURL: (options: {
    colorScheme?: "light" | "dark";
    visitor?: {
      unsignedClaims?: Record<string, unknown>;
    };
  }) => string;
  createFrame: (frame: HTMLIFrameElement) => GitBookRuntime;
}

export function NpmPreview({
  siteURL,
  mode,
  sharedConfiguration,
  effectiveJWTToken,
  onStatus,
  onControlsReady,
}: NpmPreviewProps) {
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
      iframe.className = "gitbook-embed-frame gitbook-embed-frame-light";
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
        const frameURL = gitbookClient.getFrameURL({
          colorScheme: configuration.colorScheme,
          visitor: {
            unsignedClaims: configuration.visitor.user?.unsignedClaims,
          },
        });
        iframe.src = withJWTTokenQueryParameter(frameURL, effectiveJWTToken);

        const gitbook = gitbookClient.createFrame(iframe);

        gitbook.configure({
          tabs: configuration.tabs,
          closeButton: configuration.closeButton,
          trademark: configuration.trademark,
          ...(configuration.assistantName ? { assistantName: configuration.assistantName } : {}),
          actions: configuration.actions,
          greeting: configuration.greeting,
          suggestions: configuration.suggestions,
          tools: configuration.tools,
        });

        const unsubscribeClose = gitbook.on?.("close", () => {
          iframe.style.display = "none";
          onStatus("NPM embed close event received. Frame hidden.", "info");
        });

        if (mode === "assistant") {
          gitbook.navigateToAssistant?.();
        } else {
          gitbook.navigateToPage?.("/");
        }

        onControlsReady?.({
          postUserMessage: (message: string) => gitbook.postUserMessage?.(message),
          clearChat: () => gitbook.clearChat?.(),
          toggle: () => {
            iframe.style.display = iframe.style.display === "none" ? "" : "none";
          },
        });

        onStatus("NPM embed applied.", "success");
        cleanup = () => {
          unsubscribeClose?.();
          onControlsReady?.(null);
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
  }, [siteURL, configuration, mode, onStatus, effectiveJWTToken, onControlsReady]);

  return <div ref={containerRef} className="gitbook-embed gitbook-embed-light-surface" />;
}
