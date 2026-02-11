"use client";

import { useProviderAuthBootstrap } from "../auth/useProviderAuthBootstrap";
import { EmbedImplementation, ScriptOnlyConfiguration, SharedConfiguration } from "../types";
import { resolveVisitorAuthMode } from "../utils";
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
  const authMode = resolveVisitorAuthMode(sharedConfiguration.visitor);
  const isProviderMode = authMode === "provider-integration";
  const { effectiveJWTToken, state: authState, message: authMessage, startSignIn } = useProviderAuthBootstrap({
    siteURL,
    visitor: sharedConfiguration.visitor,
    onStatus,
  });

  const providerStatusClass =
    authState === "ready"
      ? "ok"
      : authState === "error"
        ? "error"
        : "";
  const isAuthenticating = authState === "authenticating";
  const canStartSignIn = authState === "needs-signin" || authState === "error";

  let preview: React.ReactNode;
  if (implementation === "react") {
    preview = (
      <ReactPreview
        siteURL={siteURL}
        mode={mode}
        sharedConfiguration={sharedConfiguration}
        effectiveJWTToken={effectiveJWTToken}
        className="gitbook-embed"
        onStatus={onStatus}
      />
    );
  } else if (implementation === "npm") {
    preview = (
      <NpmPreview
        siteURL={siteURL}
        mode={mode}
        sharedConfiguration={sharedConfiguration}
        effectiveJWTToken={effectiveJWTToken}
        onStatus={onStatus}
      />
    );
  } else {
    preview = (
      <ScriptPreview
        siteURL={siteURL}
        mode={mode}
        sharedConfiguration={sharedConfiguration}
        scriptOnlyConfiguration={scriptOnlyConfiguration}
        effectiveJWTToken={effectiveJWTToken}
        onStatus={onStatus}
      />
    );
  }

  return (
    <div className="lab-panel stack-tight">
      {isProviderMode ? (
        <div className="lab-panel stack-tight">
          <p className="lab-panel-title no-margin">Provider authentication</p>
          <p className={`lab-status-inline ${providerStatusClass}`}>
            {authMessage ||
              (authState === "ready"
                ? "Authenticated with provider."
                : authState === "authenticating"
                  ? "Waiting for provider sign-in..."
                  : "Sign in with your provider to access authenticated content.")}
          </p>
          <div className="lab-row">
            {canStartSignIn ? (
              <button type="button" className="lab-button" onClick={startSignIn}>
                Sign in with provider
              </button>
            ) : null}
            {isAuthenticating ? (
              <button type="button" className="lab-button" disabled>
                Waiting for sign-in...
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {preview}
    </div>
  );
}
