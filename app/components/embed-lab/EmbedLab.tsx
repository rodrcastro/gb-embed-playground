"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_PLAYGROUND_STATE } from "./defaults";
import { CodeSnippets } from "./controls/CodeSnippets";
import { ConfigEditor } from "./controls/ConfigEditor";
import { ImplementationSwitcher } from "./controls/ImplementationSwitcher";
import { ModeSwitcher } from "./controls/ModeSwitcher";
import { EmbedPreview } from "./preview/EmbedPreview";
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
  const [state, setState] = useState<PlaygroundState>(() => resolveInitialState());
  const [rawConfiguration, setRawConfiguration] = useState(() => {
    const initialState = resolveInitialState();
    return formatConfigurationJson(
      initialState.sharedConfiguration,
      initialState.scriptOnlyConfiguration,
    );
  });
  const [status, setStatus] = useState<EmbedLabStatus>({
    level: "info",
    message: "Ready for live testing.",
  });

  const validation = useMemo(
    () => validateConfiguration(state.sharedConfiguration, state.scriptOnlyConfiguration),
    [state.sharedConfiguration, state.scriptOnlyConfiguration],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      writeStateToUrl(state);
      writeStateToLocalStorage(state);
    }, 380);

    return () => window.clearTimeout(timeout);
  }, [state]);

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

      setState((prev) => ({
        ...prev,
        sharedConfiguration: parsed.sharedConfiguration,
        scriptOnlyConfiguration: parsed.scriptOnlyConfiguration,
      }));
      setStatus({ level: "success", message: "JSON applied." });
    } catch {
      setStatus({ level: "error", message: "Invalid JSON. Last valid config is still running." });
    }
  };

  const inactiveMessage = useMemo(() => {
    if (state.implementation === "script") {
      return "All controls are active in Script mode.";
    }

    return "Script button settings are preserved but inactive in this mode.";
  }, [state.implementation]);

  const resetToDefaults = () => {
    setState(DEFAULT_PLAYGROUND_STATE);
    setRawConfiguration(
      formatConfigurationJson(
        DEFAULT_PLAYGROUND_STATE.sharedConfiguration,
        DEFAULT_PLAYGROUND_STATE.scriptOnlyConfiguration,
      ),
    );
    setStatus({ level: "info", message: "Reset to defaults." });
    clearPersistedState();
  };

  const setSharedConfiguration = (next: PlaygroundState["sharedConfiguration"]) => {
    setState((prev) => {
      setRawConfiguration(formatConfigurationJson(next, prev.scriptOnlyConfiguration));
      return { ...prev, sharedConfiguration: next };
    });
  };

  const setScriptOnlyConfiguration = (next: PlaygroundState["scriptOnlyConfiguration"]) => {
    setState((prev) => {
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
            Switch implementation modes and test configuration changes instantly on deployed builds.
          </p>
        </div>
        <button type="button" className="lab-button ghost" onClick={resetToDefaults}>
          Reset defaults
        </button>
      </div>

      <div className="lab-top-controls">
        <div>
          <p className="lab-label">Implementation</p>
          <ImplementationSwitcher
            value={state.implementation}
            onChange={(implementation) =>
              setState((prev) => ({
                ...prev,
                implementation,
                ui: {
                  ...prev.ui,
                  codeTab: implementation,
                },
              }))
            }
          />
        </div>
        <div>
          <p className="lab-label">Initial mode</p>
          <ModeSwitcher
            value={state.mode}
            onChange={(mode) =>
              setState((prev) => ({
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
            implementation={state.implementation}
            siteURL={state.siteURL}
            onSiteURLChange={(siteURL) => setState((prev) => ({ ...prev, siteURL }))}
            sharedConfiguration={state.sharedConfiguration}
            scriptOnlyConfiguration={state.scriptOnlyConfiguration}
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
                siteURL={state.siteURL}
                mode={state.mode}
                sharedConfiguration={state.sharedConfiguration}
                scriptOnlyConfiguration={state.scriptOnlyConfiguration}
              />
            </div>
          </details>
        </div>

        <div className="lab-right-col">
          <div className="lab-preview-header">
            <p className="lab-label">Live preview</p>
            <span className="lab-chip">{state.implementation.toUpperCase()}</span>
          </div>
          <EmbedPreview
            implementation={state.implementation}
            siteURL={state.siteURL}
            mode={state.mode}
            sharedConfiguration={state.sharedConfiguration}
            scriptOnlyConfiguration={state.scriptOnlyConfiguration}
            onStatus={updateStatus}
          />
        </div>
      </div>
    </section>
  );
}
