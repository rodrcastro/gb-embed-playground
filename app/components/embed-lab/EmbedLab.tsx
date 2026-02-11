"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_PLAYGROUND_STATE } from "./defaults";
import { CodeSnippets } from "./controls/CodeSnippets";
import { ConfigEditor } from "./controls/ConfigEditor";
import { ImplementationSwitcher } from "./controls/ImplementationSwitcher";
import { ModeSwitcher } from "./controls/ModeSwitcher";
import { EmbedPreview } from "./preview/EmbedPreview";
import { cleanupGitBookScriptWidget } from "./preview/ScriptPreview";
import {
  clearPersistedState,
  readStateFromLocalStorage,
  readStateFromUrl,
  writeStateToLocalStorage,
  writeStateToUrl,
} from "./state/persistence";
import { EmbedLabStatus, PlaygroundState } from "./types";
import {
  formatConfigurationJson,
  parseConfigurationJson,
  sanitizeState,
  validateConfiguration,
} from "./utils";

function resolveInitialState(): PlaygroundState {
  const fromUrl = readStateFromUrl();
  if (fromUrl) {
    return sanitizeState(fromUrl);
  }

  const fromStorage = readStateFromLocalStorage();
  if (fromStorage) {
    return sanitizeState(fromStorage);
  }

  return DEFAULT_PLAYGROUND_STATE;
}

export default function EmbedLab() {
  const [draftState, setDraftState] = useState<PlaygroundState>(() => resolveInitialState());
  const [appliedState, setAppliedState] = useState<PlaygroundState>(() => resolveInitialState());
  const [previewRevision, setPreviewRevision] = useState(0);
  const [rawConfiguration, setRawConfiguration] = useState(() => {
    const initialState = resolveInitialState();
    return formatConfigurationJson(
      initialState.sharedConfiguration,
      initialState.scriptOnlyConfiguration,
    );
  });
  const [status, setStatus] = useState<EmbedLabStatus>({
    level: "info",
    message: "Ready. Edit settings, then save to refresh preview.",
  });

  const validation = useMemo(
    () => validateConfiguration(draftState.sharedConfiguration, draftState.scriptOnlyConfiguration),
    [draftState.sharedConfiguration, draftState.scriptOnlyConfiguration],
  );

  const isDirty = useMemo(
    () => JSON.stringify(draftState) !== JSON.stringify(appliedState),
    [draftState, appliedState],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      writeStateToUrl(appliedState);
      writeStateToLocalStorage(appliedState);
    }, 380);

    return () => window.clearTimeout(timeout);
  }, [appliedState]);

  useEffect(() => {
    if (appliedState.implementation !== "script") {
      cleanupGitBookScriptWidget();
    }
  }, [appliedState.implementation, previewRevision]);

  const updateStatus = useCallback((message: string, level: "info" | "success" | "error" = "info") => {
    setStatus({ message, level });
  }, []);

  const applyRawConfiguration = () => {
    try {
      const parsed = parseConfigurationJson(rawConfiguration);
      const nextValidation = validateConfiguration(
        parsed.sharedConfiguration,
        parsed.scriptOnlyConfiguration,
      );

      if (!nextValidation.valid) {
        setStatus({
          level: "error",
          message: nextValidation.message || "Invalid configuration JSON.",
        });
        return;
      }

      setDraftState((prev) => ({
        ...prev,
        sharedConfiguration: parsed.sharedConfiguration,
        scriptOnlyConfiguration: parsed.scriptOnlyConfiguration,
      }));
      setStatus({ level: "info", message: "JSON loaded into editor. Save changes to refresh preview." });
    } catch {
      setStatus({ level: "error", message: "Invalid JSON. Last valid config is still running." });
    }
  };

  const saveChanges = () => {
    if (!isDirty) {
      setPreviewRevision((prev) => prev + 1);
      setStatus({ level: "info", message: "Preview refreshed from current saved configuration." });
      return;
    }

    if (!validation.valid) {
      setStatus({
        level: "error",
        message: validation.message || "Configuration is invalid.",
      });
      return;
    }

    setAppliedState(draftState);
    setPreviewRevision((prev) => prev + 1);
    setStatus({ level: "success", message: "Changes saved. Live preview refreshed." });
  };

  const inactiveMessage = useMemo(() => {
    if (isDirty) {
      return "Unsaved changes. Click Save changes to refresh preview.";
    }

    if (draftState.implementation === "script") {
      return "All controls are active in Script mode.";
    }

    return "Script button settings are preserved but inactive in this mode.";
  }, [draftState.implementation, isDirty]);

  const resetToDefaults = () => {
    setDraftState(DEFAULT_PLAYGROUND_STATE);
    setAppliedState(DEFAULT_PLAYGROUND_STATE);
    setPreviewRevision((prev) => prev + 1);
    setRawConfiguration(
      formatConfigurationJson(
        DEFAULT_PLAYGROUND_STATE.sharedConfiguration,
        DEFAULT_PLAYGROUND_STATE.scriptOnlyConfiguration,
      ),
    );
    setStatus({ level: "info", message: "Reset to defaults and refreshed preview." });
    clearPersistedState();
  };

  const setSharedConfiguration = (next: PlaygroundState["sharedConfiguration"]) => {
    setDraftState((prev) => {
      setRawConfiguration(formatConfigurationJson(next, prev.scriptOnlyConfiguration));
      return { ...prev, sharedConfiguration: next };
    });
  };

  const setScriptOnlyConfiguration = (next: PlaygroundState["scriptOnlyConfiguration"]) => {
    setDraftState((prev) => {
      setRawConfiguration(formatConfigurationJson(prev.sharedConfiguration, next));
      return { ...prev, scriptOnlyConfiguration: next };
    });
  };

  const visibleStatus = validation.valid
    ? status
    : {
        level: "error" as const,
        message: validation.message || "Configuration is invalid.",
      };

  return (
    <section className="embed-lab glass-card rounded-3xl p-5 lg:p-6">
      <div className="lab-header-row">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/55">Embed Lab</p>
          <h3 className="mt-2 font-display text-2xl text-white">Live GitBook playground</h3>
          <p className="mt-1 text-sm nebula-muted">
            Edit configuration and save to refresh preview against deployed builds.
          </p>
        </div>
        <div className="lab-row">
          <button
            type="button"
            className="lab-button"
            onClick={saveChanges}
            title={
              isDirty
                ? "Apply editor changes and refresh preview"
                : "No unsaved changes. Click to refresh preview."
            }
          >
            Save changes
          </button>
          <button type="button" className="lab-button ghost" onClick={resetToDefaults}>
            Reset defaults
          </button>
        </div>
      </div>

      <div className="lab-top-controls">
        <div>
          <p className="lab-label">Implementation</p>
          <ImplementationSwitcher
            value={draftState.implementation}
            onChange={(implementation) => {
              setDraftState((prev) => ({
                ...prev,
                implementation,
                ui: {
                  ...prev.ui,
                  codeTab: implementation,
                },
              }));
              setAppliedState((prev) => ({
                ...prev,
                implementation,
                ui: {
                  ...prev.ui,
                  codeTab: implementation,
                },
              }));
              setPreviewRevision((prev) => prev + 1);
              setStatus({ level: "info", message: "Implementation changed. Preview refreshed." });
            }}
          />
        </div>
        <div>
          <p className="lab-label">Initial mode</p>
          <ModeSwitcher
            value={draftState.mode}
            onChange={(mode) =>
              setDraftState((prev) => ({
                ...prev,
                mode,
              }))
            }
          />
        </div>
      </div>

      <div className={`lab-status ${visibleStatus.level}`}>
        <span>{visibleStatus.message}</span>
        <span className="lab-status-meta">{inactiveMessage}</span>
      </div>

      <div className="lab-main-grid">
        <div className="lab-left-col">
          <ConfigEditor
            implementation={draftState.implementation}
            siteURL={draftState.siteURL}
            onSiteURLChange={(siteURL) => setDraftState((prev) => ({ ...prev, siteURL }))}
            sharedConfiguration={draftState.sharedConfiguration}
            scriptOnlyConfiguration={draftState.scriptOnlyConfiguration}
            onSharedConfigurationChange={setSharedConfiguration}
            onScriptOnlyConfigurationChange={setScriptOnlyConfiguration}
            rawConfiguration={rawConfiguration}
            onRawConfigurationChange={setRawConfiguration}
            onApplyRawConfiguration={applyRawConfiguration}
            lastValidation={validation}
          />

          <details className="lab-panel lab-toggle-panel">
            <summary className="lab-toggle-summary">
              <span className="lab-panel-title no-margin">Generated code</span>
              <span className="lab-accordion-icon">+</span>
            </summary>
            <div className="lab-toggle-content">
              <CodeSnippets
                siteURL={appliedState.siteURL}
                mode={appliedState.mode}
                sharedConfiguration={appliedState.sharedConfiguration}
                scriptOnlyConfiguration={appliedState.scriptOnlyConfiguration}
              />
            </div>
          </details>
        </div>

        <div className="lab-right-col">
          <div className="lab-preview-header">
            <p className="lab-label">Live preview</p>
            <span className="lab-chip">{appliedState.implementation.toUpperCase()}</span>
          </div>
          <EmbedPreview
            key={`${appliedState.implementation}-${previewRevision}`}
            implementation={appliedState.implementation}
            siteURL={appliedState.siteURL}
            mode={appliedState.mode}
            sharedConfiguration={appliedState.sharedConfiguration}
            scriptOnlyConfiguration={appliedState.scriptOnlyConfiguration}
            onStatus={updateStatus}
          />
        </div>
      </div>
    </section>
  );
}
