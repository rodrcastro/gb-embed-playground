"use client";

import { EmbedImplementation, ScriptOnlyConfiguration, SharedConfiguration } from "../types";
import { NpmPreview } from "./NpmPreview";
import { ReactPreview } from "./ReactPreview";
import { ScriptPreview } from "./ScriptPreview";

interface EmbedPreviewProps {
  implementation: EmbedImplementation;
  siteURL: string;
  mode: "assistant" | "docs";
  sharedConfiguration: SharedConfiguration;
  scriptOnlyConfiguration: ScriptOnlyConfiguration;
  onStatus: (message: string, level?: "info" | "success" | "error") => void;
}

export function EmbedPreview({
  implementation,
  siteURL,
  mode,
  sharedConfiguration,
  scriptOnlyConfiguration,
  onStatus,
}: EmbedPreviewProps) {
  if (implementation === "react") {
    return <ReactPreview siteURL={siteURL} sharedConfiguration={sharedConfiguration} className="gitbook-embed" />;
  }

  if (implementation === "npm") {
    return (
      <NpmPreview
        siteURL={siteURL}
        mode={mode}
        sharedConfiguration={sharedConfiguration}
        onStatus={onStatus}
      />
    );
  }

  return (
    <ScriptPreview
      siteURL={siteURL}
      mode={mode}
      sharedConfiguration={sharedConfiguration}
      scriptOnlyConfiguration={scriptOnlyConfiguration}
      onStatus={onStatus}
    />
  );
}
