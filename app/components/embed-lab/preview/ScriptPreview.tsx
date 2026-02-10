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

interface ScriptApi {
  unload?: () => void;
  configure: (config: Record<string, unknown>) => void;
}

type ScriptCallback = (api: ScriptApi) => void;

declare global {
  interface Window {
    GitBook?:
      | ((callback: ScriptCallback) => void)
      | ScriptCallback[]
      | {
          q?: ScriptCallback[];
          call?: (callback: ScriptCallback) => void;
        };
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

    const setup = () => {
      const run = (fn: ScriptCallback) => {
        if (typeof window.GitBook === "function") {
          (window.GitBook as (callback: ScriptCallback) => void)(fn);
          return;
        }

        if (Array.isArray(window.GitBook)) {
          window.GitBook.push(fn);
          return;
        }

        if (window.GitBook && typeof window.GitBook === "object" && "q" in window.GitBook) {
          window.GitBook.q = window.GitBook.q || [];
          window.GitBook.q.push(fn);
          return;
        }

        window.GitBook = [fn];
      };

      run((api: ScriptApi) => {
        if (cancelled) {
          return;
        }

        api.unload?.();
        api.configure({
          siteURL,
          mode,
          ...configuration,
        });
        onStatus("Script embed reloaded.", "success");
      });
    };

    const existingScript = document.getElementById("gitbook-embed-script") as HTMLScriptElement | null;
    if (existingScript) {
      setup();
      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement("script");
    script.id = "gitbook-embed-script";
    script.async = true;

    const token = sharedConfiguration.visitor.token?.trim();
    const scriptURL = token
      ? `${GITBOOK_SCRIPT_URL}?jwt_token=${encodeURIComponent(token)}`
      : GITBOOK_SCRIPT_URL;

    script.src = scriptURL;
    script.onload = () => {
      if (cancelled) {
        return;
      }
      setup();
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
    };
  }, [siteURL, mode, configuration, onStatus, sharedConfiguration.visitor.token]);

  return <div className="gitbook-embed script-mode" />;
}
