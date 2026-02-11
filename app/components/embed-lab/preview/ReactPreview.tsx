"use client";

import { GitBookProvider, useGitBook } from "@gitbook/embed/react";
import { memo, useEffect, useMemo, useRef } from "react";
import { SharedConfiguration } from "../types";
import { buildSharedConfiguration, withJWTTokenQueryParameter } from "../utils";

type BuiltConfiguration = ReturnType<typeof buildSharedConfiguration>;

interface ReactPreviewProps {
  siteURL: string;
  mode: "assistant" | "docs";
  sharedConfiguration: SharedConfiguration;
  effectiveJWTToken?: string;
  className?: string;
  onStatus?: (message: string, level?: "info" | "success" | "error") => void;
}

interface ReactPreviewFrameProps {
  mode: "assistant" | "docs";
  configuration: BuiltConfiguration;
  effectiveJWTToken?: string;
  className?: string;
  onStatus?: (message: string, level?: "info" | "success" | "error") => void;
}

function ReactPreviewFrame({
  mode,
  configuration,
  effectiveJWTToken,
  className,
  onStatus,
}: ReactPreviewFrameProps) {
  const gitbook = useGitBook();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const frameRef = useRef<ReturnType<typeof gitbook.createFrame> | null>(null);

  const frameURL = useMemo(
    () => {
      const url = gitbook.getFrameURL({
        visitor: {
          unsignedClaims: configuration.visitor.user?.unsignedClaims,
        },
      });
      return withJWTTokenQueryParameter(url, effectiveJWTToken);
    },
    [gitbook, effectiveJWTToken, configuration.visitor.user?.unsignedClaims],
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

    frame.configure({
      tabs: configuration.tabs,
      actions: configuration.actions as never,
      greeting: {
        title: configuration.greeting?.title ?? "",
        subtitle: configuration.greeting?.subtitle ?? "",
      },
      suggestions: configuration.suggestions,
      tools: configuration.tools as never,
    });

    if (mode === "assistant") {
      frame.navigateToAssistant();
    } else {
      frame.navigateToPage("/");
    }

    onStatus?.("React embed applied.", "success");
  }, [mode, configuration, onStatus]);

  return <iframe ref={iframeRef} title="GitBook" src={frameURL} width="100%" height="100%" className={className} />;
}

function ReactPreviewComponent({
  siteURL,
  mode,
  sharedConfiguration,
  effectiveJWTToken,
  className,
  onStatus,
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
      />
    </GitBookProvider>
  );
}

export const ReactPreview = memo(ReactPreviewComponent);
