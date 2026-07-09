"use client";

import { useCallback, useState } from "react";
import { useProviderAuthBootstrap } from "../auth/useProviderAuthBootstrap";
import {
  EmbedImplementation,
  EmbedRuntimeControls,
  ScriptOnlyConfiguration,
  SharedConfiguration,
} from "../types";
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
  const [manualRefreshRevision, setManualRefreshRevision] = useState(0);
  const [controls, setControls] = useState<EmbedRuntimeControls | null>(null);
  const [runtimeMessage, setRuntimeMessage] = useState("How do I get started?");
  const onControlsReady = useCallback((next: EmbedRuntimeControls | null) => {
    setControls(next);
  }, []);
  const authMode = resolveVisitorAuthMode(sharedConfiguration.visitor);
  const isProviderMode = authMode === "provider-integration";
  const {
    effectiveJWTToken,
    state: authState,
    message: authMessage,
    authRevision,
    startSignIn,
    resetSignInState,
  } = useProviderAuthBootstrap({
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
  const previewRevision = `${authRevision}-${manualRefreshRevision}`;
  const providerStatusMessage =
    authState === "authenticating"
      ? "Waiting for provider sign-in to complete. Once sign-in is done, click Refresh."
      : authMessage ||
        (authState === "ready"
          ? "Authenticated with provider."
          : "Sign in with your provider to access authenticated content.");

  const refreshEmbed = () => {
    resetSignInState();
    setManualRefreshRevision((previous) => previous + 1);
    onStatus("Embed refreshed. Sign in again to continue.", "info");
  };

  let preview: React.ReactNode;
  if (implementation === "react") {
    preview = (
      <ReactPreview
        key={`react-${previewRevision}`}
        siteURL={siteURL}
        mode={mode}
        sharedConfiguration={sharedConfiguration}
        effectiveJWTToken={effectiveJWTToken}
        className="gitbook-embed"
        onStatus={onStatus}
        onControlsReady={onControlsReady}
      />
    );
  } else if (implementation === "npm") {
    preview = (
      <NpmPreview
        key={`npm-${previewRevision}`}
        siteURL={siteURL}
        mode={mode}
        sharedConfiguration={sharedConfiguration}
        effectiveJWTToken={effectiveJWTToken}
        onStatus={onStatus}
        onControlsReady={onControlsReady}
      />
    );
  } else {
    preview = (
      <ScriptPreview
        key={`script-${previewRevision}`}
        siteURL={siteURL}
        mode={mode}
        sharedConfiguration={sharedConfiguration}
        scriptOnlyConfiguration={scriptOnlyConfiguration}
        effectiveJWTToken={effectiveJWTToken}
        onStatus={onStatus}
        onControlsReady={onControlsReady}
      />
    );
  }

  const controlsAvailable = controls !== null;
  const sendRuntimeMessage = () => {
    const message = runtimeMessage.trim();
    if (!message || !controls) {
      return;
    }
    controls.postUserMessage(message);
    onStatus(`Sent message to assistant: "${message}"`, "info");
  };

  return (
    <div className="lab-panel stack-tight">
      {isProviderMode ? (
        <div className="lab-panel stack-tight">
          <p className="lab-panel-title no-margin">Provider authentication</p>
          <p className={`lab-status-inline ${providerStatusClass}`}>{providerStatusMessage}</p>
          <div className="lab-row">
            <button type="button" className="lab-button" onClick={startSignIn} disabled={isAuthenticating}>
              Sign in with provider
            </button>
            <button type="button" className="lab-button ghost" onClick={refreshEmbed}>
              Refresh
            </button>
          </div>
        </div>
      ) : null}
      {preview}
      <div className="lab-panel stack-tight">
        <p className="lab-panel-title no-margin">Programmatic controls</p>
        <p className="lab-status-meta">
          {controlsAvailable
            ? "Drive the live embed through the runtime API."
            : "Waiting for the embed to initialize…"}
        </p>
        <div className="lab-row">
          <input
            className="lab-input"
            value={runtimeMessage}
            onChange={(event) => setRuntimeMessage(event.target.value)}
            placeholder="Message to post to the assistant"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                sendRuntimeMessage();
              }
            }}
          />
          <button
            type="button"
            className="lab-button"
            onClick={sendRuntimeMessage}
            disabled={!controlsAvailable || runtimeMessage.trim().length === 0}
          >
            postUserMessage
          </button>
        </div>
        <div className="lab-row">
          <button
            type="button"
            className="lab-button ghost"
            onClick={() => {
              controls?.clearChat();
              onStatus("Cleared assistant chat.", "info");
            }}
            disabled={!controlsAvailable}
          >
            clearChat
          </button>
          <button
            type="button"
            className="lab-button ghost"
            onClick={() => {
              controls?.toggle();
              onStatus("Toggled embed visibility.", "info");
            }}
            disabled={!controlsAvailable}
          >
            toggle
          </button>
        </div>
      </div>
    </div>
  );
}
