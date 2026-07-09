export type EmbedImplementation = "react" | "npm" | "script";

export type EmbedMode = "assistant" | "docs";
export type EmbedTab = "assistant" | "docs" | "search";
export type EmbedColorScheme = "light" | "dark";
export type VisitorAuthMode = "manual-jwt" | "provider-integration";

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
  confirmationLabel?: string;
  confirmationIcon?: string;
}

export interface VisitorConfig {
  authMode?: VisitorAuthMode;
  jwt_token?: string;
  // Backward compatibility for older persisted payloads.
  token?: string;
  uuid?: string;
  traitsJson?: string;
  unsignedClaimsJson?: string;
}

export interface SharedConfiguration {
  tabs: EmbedTab[];
  closeButton: boolean;
  trademark?: boolean;
  assistantName?: string;
  colorScheme?: EmbedColorScheme;
  actions: ActionConfig[];
  greeting: GreetingConfig;
  suggestions: string[];
  tools: ToolConfig[];
  visitor: VisitorConfig;
}

export type ScriptButtonIcon = "assistant" | "sparkle" | "help" | "book";

export interface ScriptButtonConfiguration {
  icon?: ScriptButtonIcon;
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

export interface EmbedRuntimeControls {
  postUserMessage: (message: string) => void;
  clearChat: () => void;
  toggle: () => void;
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
