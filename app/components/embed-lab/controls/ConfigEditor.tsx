"use client";

import { useState } from "react";
import {
  ScriptOnlyConfiguration,
  SharedConfiguration,
  ValidationResult,
} from "../types";
import { EDITABLE_ROOT_CSS_REFERENCE } from "../utils";
import { MonacoJsonEditor } from "./MonacoJsonEditor";

interface ConfigEditorProps {
  implementation: "react" | "npm" | "script";
  siteURL: string;
  onSiteURLChange: (value: string) => void;
  rootCssOverrides: string;
  onRootCssOverridesChange: (value: string) => void;
  rootCssValidation: ValidationResult;
  sharedConfiguration: SharedConfiguration;
  scriptOnlyConfiguration: ScriptOnlyConfiguration;
  onSharedConfigurationChange: (value: SharedConfiguration) => void;
  onScriptOnlyConfigurationChange: (value: ScriptOnlyConfiguration) => void;
  rawConfiguration: string;
  onRawConfigurationChange: (value: string) => void;
  onApplyRawConfiguration: () => void;
  lastValidation: ValidationResult;
}

type SectionId =
  | "core"
  | "greeting"
  | "actions"
  | "tools"
  | "visitor"
  | "script"
  | "css"
  | "json";

function splitLines(value: string): string[] {
  if (!value.length) {
    return [];
  }

  return value.split("\n");
}

function joinLines(value: string[]): string {
  return value.join("\n");
}

interface SectionProps {
  id: SectionId;
  title: string;
  isOpen: boolean;
  onToggle: (id: SectionId) => void;
  children: React.ReactNode;
  badge?: string;
  disabled?: boolean;
}

function AccordionSection({
  id,
  title,
  isOpen,
  onToggle,
  children,
  badge,
  disabled,
}: SectionProps) {
  return (
    <div className={`lab-panel lab-accordion ${disabled ? "is-disabled" : ""}`}>
      <button
        type="button"
        className="lab-accordion-toggle"
        onClick={() => {
          if (disabled) {
            return;
          }
          onToggle(id);
        }}
        aria-expanded={isOpen}
        disabled={disabled}
      >
        <span className="lab-panel-title no-margin">{title}</span>
        <span className="lab-accordion-right">
          {badge ? <span className="lab-accordion-badge">{badge}</span> : null}
          <span className="lab-accordion-icon">{isOpen ? "−" : "+"}</span>
        </span>
      </button>
      {isOpen ? <div className="lab-accordion-content">{children}</div> : null}
    </div>
  );
}

export function ConfigEditor({
  implementation,
  siteURL,
  onSiteURLChange,
  rootCssOverrides,
  onRootCssOverridesChange,
  rootCssValidation,
  sharedConfiguration,
  scriptOnlyConfiguration,
  onSharedConfigurationChange,
  onScriptOnlyConfigurationChange,
  rawConfiguration,
  onRawConfigurationChange,
  onApplyRawConfiguration,
  lastValidation,
}: ConfigEditorProps) {
  const [openSections, setOpenSections] = useState<Record<SectionId, boolean>>({
    core: true,
    greeting: false,
    actions: false,
    tools: false,
    visitor: false,
    script: false,
    css: false,
    json: false,
  });

  const toggleSection = (id: SectionId) => {
    setOpenSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const updateSuggestions = (value: string) => {
    onSharedConfigurationChange({
      ...sharedConfiguration,
      suggestions: splitLines(value),
    });
  };

  const updateTabs = (tab: "assistant" | "docs", checked: boolean) => {
    const current = new Set(sharedConfiguration.tabs);
    if (checked) {
      current.add(tab);
    } else {
      current.delete(tab);
    }

    const next = Array.from(current) as Array<"assistant" | "docs">;
    onSharedConfigurationChange({
      ...sharedConfiguration,
      tabs: next.length > 0 ? next : ["assistant"],
    });
  };

  return (
    <div className="lab-editor-grid">
      <div className="lab-panel-stack">
        <AccordionSection
          id="core"
          title="Core"
          isOpen={openSections.core}
          onToggle={toggleSection}
        >
          <label className="lab-field">
            <span>siteURL</span>
            <input
              className="lab-input"
              type="url"
              value={siteURL}
              onChange={(event) => onSiteURLChange(event.target.value)}
              placeholder="https://docs.example.com"
            />
          </label>
          <div className="lab-field">
            <span>tabs</span>
            <div className="lab-check-row">
              <label>
                <input
                  type="checkbox"
                  checked={sharedConfiguration.tabs.includes("assistant")}
                  onChange={(event) => updateTabs("assistant", event.target.checked)}
                />
                Assistant
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={sharedConfiguration.tabs.includes("docs")}
                  onChange={(event) => updateTabs("docs", event.target.checked)}
                />
                Docs
              </label>
            </div>
          </div>
          <div className="lab-field">
            <span>closeButton</span>
            <label className="lab-check-row">
              <input
                type="checkbox"
                checked={sharedConfiguration.closeButton}
                onChange={(event) =>
                  onSharedConfigurationChange({
                    ...sharedConfiguration,
                    closeButton: event.target.checked,
                  })
                }
              />
              Show close button
            </label>
          </div>
        </AccordionSection>

        <AccordionSection
          id="greeting"
          title="Greeting"
          isOpen={openSections.greeting}
          onToggle={toggleSection}
        >
          <label className="lab-field">
            <span>title</span>
            <input
              className="lab-input"
              value={sharedConfiguration.greeting.title || ""}
              onChange={(event) =>
                onSharedConfigurationChange({
                  ...sharedConfiguration,
                  greeting: {
                    ...sharedConfiguration.greeting,
                    title: event.target.value,
                  },
                })
              }
            />
          </label>
          <label className="lab-field">
            <span>subtitle</span>
            <input
              className="lab-input"
              value={sharedConfiguration.greeting.subtitle || ""}
              onChange={(event) =>
                onSharedConfigurationChange({
                  ...sharedConfiguration,
                  greeting: {
                    ...sharedConfiguration.greeting,
                    subtitle: event.target.value,
                  },
                })
              }
            />
          </label>
          <label className="lab-field">
            <span>suggestions (one per line)</span>
            <textarea
              className="lab-textarea"
              rows={4}
              value={joinLines(sharedConfiguration.suggestions)}
              onChange={(event) => updateSuggestions(event.target.value)}
            />
          </label>
        </AccordionSection>

        <AccordionSection
          id="actions"
          title="Actions"
          isOpen={openSections.actions}
          onToggle={toggleSection}
          badge={`${sharedConfiguration.actions.length}`}
        >
          {sharedConfiguration.actions.map((action, index) => (
            <div key={action.id} className="lab-inline-card">
              <div className="mb-2 flex items-center justify-between">
                <span className="lab-status-meta">Action {index + 1}</span>
                <button
                  type="button"
                  className="lab-button ghost"
                  onClick={() => {
                    onSharedConfigurationChange({
                      ...sharedConfiguration,
                      actions: sharedConfiguration.actions.filter((_, actionIndex) => actionIndex !== index),
                    });
                  }}
                >
                  Remove
                </button>
              </div>
              <label className="lab-field">
                <span>Label</span>
                <input
                  className="lab-input"
                  value={action.label}
                  onChange={(event) => {
                    const nextActions = [...sharedConfiguration.actions];
                    nextActions[index] = { ...action, label: event.target.value };
                    onSharedConfigurationChange({
                      ...sharedConfiguration,
                      actions: nextActions,
                    });
                  }}
                />
              </label>
              <label className="lab-field">
                <span>Icon (Font Awesome)</span>
                <input
                  className="lab-input"
                  value={action.icon || ""}
                  placeholder="circle-question"
                  onChange={(event) => {
                    const nextActions = [...sharedConfiguration.actions];
                    nextActions[index] = {
                      ...action,
                      icon: event.target.value,
                    };
                    onSharedConfigurationChange({
                      ...sharedConfiguration,
                      actions: nextActions,
                    });
                  }}
                />
              </label>
              <label className="lab-field">
                <span>Variant</span>
                <select
                  className="lab-input"
                  value={action.variant}
                  onChange={(event) => {
                    const nextActions = [...sharedConfiguration.actions];
                    nextActions[index] = {
                      ...action,
                      variant: event.target.value as typeof action.variant,
                    };
                    onSharedConfigurationChange({
                      ...sharedConfiguration,
                      actions: nextActions,
                    });
                  }}
                >
                  <option value="navigateToAssistant">navigateToAssistant</option>
                  <option value="navigateToPage">navigateToPage</option>
                  <option value="openUrl">openUrl</option>
                </select>
              </label>
              <label className="lab-field">
                <span>Value (path/url)</span>
                <input
                  className="lab-input"
                  value={action.value || ""}
                  onChange={(event) => {
                    const nextActions = [...sharedConfiguration.actions];
                    nextActions[index] = {
                      ...action,
                      value: event.target.value,
                    };
                    onSharedConfigurationChange({
                      ...sharedConfiguration,
                      actions: nextActions,
                    });
                  }}
                />
              </label>
            </div>
          ))}
          <button
            type="button"
            className="lab-button"
            onClick={() =>
              onSharedConfigurationChange({
                ...sharedConfiguration,
                actions: [
                  ...sharedConfiguration.actions,
                  {
                    id: `a-${Date.now()}`,
                    label: "New action",
                    icon: "circle-question",
                    variant: "navigateToPage",
                    value: "/",
                  },
                ],
              })
            }
          >
            Add action
          </button>
        </AccordionSection>

        <AccordionSection
          id="tools"
          title="Tools"
          isOpen={openSections.tools}
          onToggle={toggleSection}
          badge={`${sharedConfiguration.tools.length}`}
        >
          {sharedConfiguration.tools.map((tool, index) => (
            <div key={tool.id} className="lab-inline-card">
              <div className="mb-2 flex items-center justify-between">
                <span className="lab-status-meta">Tool {index + 1}</span>
                <button
                  type="button"
                  className="lab-button ghost"
                  onClick={() => {
                    onSharedConfigurationChange({
                      ...sharedConfiguration,
                      tools: sharedConfiguration.tools.filter((_, toolIndex) => toolIndex !== index),
                    });
                  }}
                >
                  Remove
                </button>
              </div>
              <label className="lab-field">
                <span>Name</span>
                <input
                  className="lab-input"
                  value={tool.name}
                  onChange={(event) => {
                    const nextTools = [...sharedConfiguration.tools];
                    nextTools[index] = { ...tool, name: event.target.value };
                    onSharedConfigurationChange({
                      ...sharedConfiguration,
                      tools: nextTools,
                    });
                  }}
                />
              </label>
              <label className="lab-field">
                <span>Description</span>
                <input
                  className="lab-input"
                  value={tool.description || ""}
                  onChange={(event) => {
                    const nextTools = [...sharedConfiguration.tools];
                    nextTools[index] = { ...tool, description: event.target.value };
                    onSharedConfigurationChange({
                      ...sharedConfiguration,
                      tools: nextTools,
                    });
                  }}
                />
              </label>
              <label className="lab-field">
                <span>Input schema JSON</span>
                <textarea
                  className="lab-textarea"
                  rows={3}
                  value={tool.inputSchemaJson || ""}
                  onChange={(event) => {
                    const nextTools = [...sharedConfiguration.tools];
                    nextTools[index] = { ...tool, inputSchemaJson: event.target.value };
                    onSharedConfigurationChange({
                      ...sharedConfiguration,
                      tools: nextTools,
                    });
                  }}
                />
              </label>
              <label className="lab-field">
                <span>Mock response</span>
                <textarea
                  className="lab-textarea"
                  rows={2}
                  value={tool.response || ""}
                  onChange={(event) => {
                    const nextTools = [...sharedConfiguration.tools];
                    nextTools[index] = { ...tool, response: event.target.value };
                    onSharedConfigurationChange({
                      ...sharedConfiguration,
                      tools: nextTools,
                    });
                  }}
                />
              </label>
            </div>
          ))}
          <button
            type="button"
            className="lab-button"
            onClick={() =>
              onSharedConfigurationChange({
                ...sharedConfiguration,
                tools: [
                  ...sharedConfiguration.tools,
                  {
                    id: `t-${Date.now()}`,
                    name: "new_tool",
                    description: "",
                    inputSchemaJson: '{"type":"object"}',
                    response: "{}",
                  },
                ],
              })
            }
          >
            Add tool
          </button>
        </AccordionSection>

        <AccordionSection
          id="visitor"
          title="Visitor"
          isOpen={openSections.visitor}
          onToggle={toggleSection}
        >
          <label className="lab-field">
            <span>authMode</span>
            <select
              className="lab-input"
              value={sharedConfiguration.visitor.authMode || "manual-jwt"}
              onChange={(event) =>
                onSharedConfigurationChange({
                  ...sharedConfiguration,
                  visitor: {
                    ...sharedConfiguration.visitor,
                    authMode: event.target.value as "manual-jwt" | "provider-integration",
                  },
                })
              }
            >
              <option value="manual-jwt">manual-jwt</option>
              <option value="provider-integration">provider-integration</option>
            </select>
          </label>
          {(sharedConfiguration.visitor.authMode || "manual-jwt") === "manual-jwt" ? (
            <label className="lab-field">
              <span>jwt_token</span>
              <input
                className="lab-input"
                value={sharedConfiguration.visitor.jwt_token || sharedConfiguration.visitor.token || ""}
                onChange={(event) =>
                  onSharedConfigurationChange({
                    ...sharedConfiguration,
                    visitor: {
                      ...sharedConfiguration.visitor,
                      jwt_token: event.target.value,
                      token: undefined,
                    },
                  })
                }
              />
            </label>
          ) : (
            <p className="lab-muted-note">
              Token is obtained from GitBook auth cookie after sign-in popup.
            </p>
          )}
          <label className="lab-field">
            <span>uuid</span>
            <input
              className="lab-input"
              value={sharedConfiguration.visitor.uuid || ""}
              onChange={(event) =>
                onSharedConfigurationChange({
                  ...sharedConfiguration,
                  visitor: {
                    ...sharedConfiguration.visitor,
                    uuid: event.target.value,
                  },
                })
              }
            />
          </label>
          <label className="lab-field">
            <span>traits JSON</span>
            <textarea
              className="lab-textarea"
              rows={3}
              value={sharedConfiguration.visitor.traitsJson || ""}
              onChange={(event) =>
                onSharedConfigurationChange({
                  ...sharedConfiguration,
                  visitor: {
                    ...sharedConfiguration.visitor,
                    traitsJson: event.target.value,
                  },
                })
              }
            />
          </label>
          <label className="lab-field">
            <span>unsignedClaims JSON</span>
            <textarea
              className="lab-textarea"
              rows={3}
              value={sharedConfiguration.visitor.unsignedClaimsJson || ""}
              onChange={(event) =>
                onSharedConfigurationChange({
                  ...sharedConfiguration,
                  visitor: {
                    ...sharedConfiguration.visitor,
                    unsignedClaimsJson: event.target.value,
                  },
                })
              }
            />
          </label>
        </AccordionSection>

        <AccordionSection
          id="script"
          title="Script-only: button"
          isOpen={openSections.script}
          onToggle={toggleSection}
          badge={implementation === "script" ? "active" : "inactive"}
          disabled={implementation !== "script"}
        >
          <label className="lab-field">
            <span>icon</span>
            <select
              className="lab-input"
              value={scriptOnlyConfiguration.button?.icon || ""}
              onChange={(event) =>
                onScriptOnlyConfigurationChange({
                  ...scriptOnlyConfiguration,
                  button: {
                    ...scriptOnlyConfiguration.button,
                    icon: (event.target.value || undefined) as "question" | "sparkles" | undefined,
                  },
                })
              }
            >
              <option value="">(unset)</option>
              <option value="question">question</option>
              <option value="sparkles">sparkles</option>
            </select>
          </label>
          <label className="lab-field">
            <span>label</span>
            <input
              className="lab-input"
              value={scriptOnlyConfiguration.button?.label || ""}
              onChange={(event) =>
                onScriptOnlyConfigurationChange({
                  ...scriptOnlyConfiguration,
                  button: {
                    ...scriptOnlyConfiguration.button,
                    label: event.target.value,
                  },
                })
              }
            />
          </label>
          <label className="lab-field">
            <span>className</span>
            <input
              className="lab-input"
              value={scriptOnlyConfiguration.button?.className || ""}
              onChange={(event) =>
                onScriptOnlyConfigurationChange({
                  ...scriptOnlyConfiguration,
                  button: {
                    ...scriptOnlyConfiguration.button,
                    className: event.target.value,
                  },
                })
              }
            />
          </label>
        </AccordionSection>

      </div>

      <div className="lab-panel-stack">
        <AccordionSection
          id="json"
          title="Raw JSON editor"
          isOpen={openSections.json}
          onToggle={toggleSection}
        >
          <MonacoJsonEditor
            value={rawConfiguration}
            onChange={onRawConfigurationChange}
          />
          <div className="lab-row">
            <button type="button" className="lab-button" onClick={onApplyRawConfiguration}>
              Apply JSON
            </button>
            <span className={`lab-status-inline ${lastValidation.valid ? "ok" : "error"}`}>
              {lastValidation.valid ? "Configuration valid" : lastValidation.message || "Invalid configuration"}
            </span>
          </div>
        </AccordionSection>

        <AccordionSection
          id="css"
          title="CSS overrides (:root)"
          isOpen={openSections.css}
          onToggle={toggleSection}
          badge={implementation === "script" ? "active" : "inactive"}
          disabled={implementation !== "script"}
        >
          <div className="lab-css-layout">
            <div className="lab-css-editor-stack">
              {implementation !== "script" ? (
                <p className="lab-muted-note">
                  CSS overrides are available only in Script implementation.
                </p>
              ) : (
                <p className="lab-muted-note">
                  Add one declaration per line using the properties listed in the sidebar. The
                  <code>--gitbook-widget-</code> prefix is added automatically.
                </p>
              )}
              <label className="lab-field">
                <span>Declarations</span>
                <textarea
                  className="lab-textarea"
                  rows={8}
                  value={rootCssOverrides}
                  disabled={implementation !== "script"}
                  onChange={(event) => onRootCssOverridesChange(event.target.value)}
                  placeholder={
                    "background-solid: #111111;\ntext-color: #f9f9f9;"
                  }
                />
              </label>
              {implementation === "script" ? (
                <span className={`lab-status-inline ${rootCssValidation.valid ? "ok" : "error"}`}>
                  {rootCssValidation.valid
                    ? "CSS overrides valid"
                    : rootCssValidation.message || "Invalid CSS overrides"}
                </span>
              ) : (
                <span className="lab-status-inline">Inactive in this mode.</span>
              )}
            </div>

            <aside className="lab-css-sidebar">
              <div className="lab-css-sidebar-header">
                <span>Available properties</span>
                <span className="lab-accordion-badge">{EDITABLE_ROOT_CSS_REFERENCE.length}</span>
              </div>
              <div className="lab-css-sidebar-scroll">
                <div className="lab-property-grid">
                  {EDITABLE_ROOT_CSS_REFERENCE.map((item) => (
                    <article key={item.property} className="lab-property-item">
                      <code className="lab-property-name">{item.suffix}</code>
                      <div className="lab-property-value">
                        <span className="lab-property-label">Default</span>
                        <code>{item.defaultValue}</code>
                      </div>
                      {item.darkModeDefault ? (
                        <div className="lab-property-value">
                          <span className="lab-property-label">Dark mode</span>
                          <code>{item.darkModeDefault}</code>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </AccordionSection>
      </div>
    </div>
  );
}
