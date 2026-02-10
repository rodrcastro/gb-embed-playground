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
    const token = sharedConfiguration.visitor.token?.trim();
    const unsignedClaims = configuration.visitor?.user?.unsignedClaims;
    const visitorOptions =
      token || unsignedClaims
        ? {
            visitor: {
              token: token || undefined,
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

      window.GitBook("unload");
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
      if (typeof window.GitBook === "function") {
        window.GitBook("unload");
      }
    };
  }, [siteURL, mode, configuration, onStatus, sharedConfiguration.visitor.token]);

  return <div className="gitbook-embed script-mode" />;
}
