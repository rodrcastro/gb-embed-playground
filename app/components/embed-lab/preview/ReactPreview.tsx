"use client";

import { GitBookProvider, useGitBook } from "@gitbook/embed/react";
import { memo, useEffect, useMemo, useRef } from "react";
import { EmbedRuntimeControls, SharedConfiguration } from "../types";
import { buildSharedConfiguration, withJWTTokenQueryParameter } from "../utils";

type BuiltConfiguration = ReturnType<typeof buildSharedConfiguration>;

interface ReactPreviewProps {
  siteURL: string;
  mode: "assistant" | "docs";
  sharedConfiguration: SharedConfiguration;
  effectiveJWTToken?: string;
  className?: string;
  onStatus?: (message: string, level?: "info" | "success" | "error") => void;
  onControlsReady?: (controls: EmbedRuntimeControls | null) => void;
}

interface ReactPreviewFrameProps {
  mode: "assistant" | "docs";
  configuration: BuiltConfiguration;
  effectiveJWTToken?: string;
  className?: string;
  onStatus?: (message: string, level?: "info" | "success" | "error") => void;
  onControlsReady?: (controls: EmbedRuntimeControls | null) => void;
}

function ReactPreviewFrame({
  mode,
  configuration,
  effectiveJWTToken,
  className,
  onStatus,
  onControlsReady,
}: ReactPreviewFrameProps) {
  const gitbook = useGitBook();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const frameRef = useRef<ReturnType<typeof gitbook.createFrame> | null>(null);

  const frameURL = useMemo(
    () => {
      const url = gitbook.getFrameURL({
        colorScheme: configuration.colorScheme,
        visitor: {
          unsignedClaims: configuration.visitor.user?.unsignedClaims,
        },
      });
      return withJWTTokenQueryParameter(url, effectiveJWTToken);
    },
    [gitbook, effectiveJWTToken, configuration.colorScheme, configuration.visitor.user?.unsignedClaims],
  );

  useEffect(() => {
    if (!iframeRef.current) {
      return;
    }

    frameRef.current = gitbook.createFrame(iframeRef.current);
  }, [gitbook, frameURL]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) {
      return;
    }

    if (iframeRef.current) {
      iframeRef.current.style.removeProperty("display");
    }

    const settings = {
      tabs: configuration.tabs,
      closeButton: configuration.closeButton,
      trademark: configuration.trademark,
      ...(configuration.assistantName ? { assistantName: configuration.assistantName } : {}),
      actions: configuration.actions as never,
      greeting: {
        title: configuration.greeting?.title ?? "",
        subtitle: configuration.greeting?.subtitle ?? "",
      },
      suggestions: configuration.suggestions,
      tools: configuration.tools as never,
    };

    frame.configure(settings as never);

    if (mode === "assistant") {
      frame.navigateToAssistant();
    } else {
      frame.navigateToPage("/");
    }

    onStatus?.("React embed applied.", "success");
  }, [mode, configuration, onStatus]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !onControlsReady) {
      return;
    }

    onControlsReady({
      toggle: () => {
        const iframe = iframeRef.current;
        if (!iframe) {
          return;
        }
        iframe.style.display = iframe.style.display === "none" ? "" : "none";
      },
    });

    return () => onControlsReady(null);
  }, [onControlsReady, frameURL]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame?.on) {
      return;
    }

    return frame.on("close", () => {
      if (iframeRef.current) {
        iframeRef.current.style.display = "none";
      }
      onStatus?.("React embed close event received. Frame hidden.", "info");
    });
  }, [onStatus, frameURL]);

  return (
    <iframe
      ref={iframeRef}
      title="GitBook"
      src={frameURL}
      width="100%"
      height="100%"
      allow="clipboard-write"
      className={className}
    />
  );
}

function ReactPreviewComponent({
  siteURL,
  mode,
  sharedConfiguration,
  effectiveJWTToken,
  className,
  onStatus,
  onControlsReady,
}: ReactPreviewProps) {
  const configuration = useMemo(() => buildSharedConfiguration(sharedConfiguration), [sharedConfiguration]);
  const frameClassName = [className, "gitbook-embed-light-surface"].filter(Boolean).join(" ");

  return (
    <GitBookProvider siteURL={siteURL}>
      <ReactPreviewFrame
        mode={mode}
        configuration={configuration}
        effectiveJWTToken={effectiveJWTToken}
        className={frameClassName}
        onStatus={onStatus}
        onControlsReady={onControlsReady}
      />
    </GitBookProvider>
  );
}

export const ReactPreview = memo(ReactPreviewComponent);
