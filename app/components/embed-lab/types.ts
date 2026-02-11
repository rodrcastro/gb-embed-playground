export type EmbedImplementation = "react" | "npm" | "script";

export type EmbedMode = "assistant" | "docs";

export interface GreetingConfig {
  title?: string;
  subtitle?: string;
}

export interface ActionConfig {
  id: string;
  label: string;
  icon?: string;
  variant: "navigateToAssistant" | "navigateToPage" | "openUrl";
  value?: string;
}

export interface ToolConfig {
  id: string;
  name: string;
  description?: string;
  inputSchemaJson?: string;
  response?: string;
}

export interface VisitorConfig {
  token?: string;
  uuid?: string;
  traitsJson?: string;
  unsignedClaimsJson?: string;
}

export interface SharedConfiguration {
  tabs: Array<"assistant" | "docs">;
  actions: ActionConfig[];
  greeting: GreetingConfig;
  suggestions: string[];
  tools: ToolConfig[];
  visitor: VisitorConfig;
}

export interface ScriptButtonConfiguration {
  icon?: "question" | "sparkles";
  label?: string;
  className?: string;
}

export interface ScriptOnlyConfiguration {
  button?: ScriptButtonConfiguration;
}

export interface ReactConfig {
  siteURL: string;
  mode: EmbedMode;
  configuration: SharedConfiguration;
  className?: string;
}

export interface NpmConfig {
  siteURL: string;
  targetSelector: string;
  mode: EmbedMode;
  configuration: SharedConfiguration;
}

export interface ScriptConfig {
  siteURL: string;
  mode: EmbedMode;
  configuration: SharedConfiguration & ScriptOnlyConfiguration;
}

export interface PlaygroundUIState {
  activePanel: "controls" | "json" | "code";
  codeTab: EmbedImplementation;
}

export interface PlaygroundState {
  implementation: EmbedImplementation;
  siteURL: string;
  mode: EmbedMode;
  sharedConfiguration: SharedConfiguration;
  scriptOnlyConfiguration: ScriptOnlyConfiguration;
  ui: PlaygroundUIState;
}

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export interface EmbedLabStatus {
  level: "info" | "success" | "error";
  message: string;
}
