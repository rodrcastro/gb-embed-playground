import {
  ActionConfig,
  EmbedColorScheme,
  EmbedTab,
  PlaygroundState,
  ScriptButtonIcon,
  ScriptOnlyConfiguration,
  SharedConfiguration,
  ToolConfig,
  ValidationResult,
  VisitorAuthMode,
  VisitorConfig,
} from "./types";

export const ASSISTANT_NAME_MAX_LENGTH = 32;
export const SCRIPT_BUTTON_ICONS: ScriptButtonIcon[] = ["assistant", "sparkle", "help", "book"];
export const EMBED_TABS: EmbedTab[] = ["assistant", "docs", "search"];
export const EMBED_COLOR_SCHEMES: EmbedColorScheme[] = ["light", "dark"];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJsonObject(input: string | undefined): Record<string, unknown> | undefined {
  if (!input || !input.trim()) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(input);
    return isObject(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function parseToolInputSchema(tool: ToolConfig): Record<string, unknown> | undefined {
  const parsed = parseJsonObject(tool.inputSchemaJson);
  if (parsed) {
    return parsed;
  }

  return {
    type: "object",
    properties: {
      query: { type: "string" },
    },
  };
}

export interface EditableRootCssPropertyReference {
  property: string;
  suffix: string;
  defaultValue: string;
  darkModeDefault?: string;
}

export const EDITABLE_ROOT_CSS_REFERENCE: EditableRootCssPropertyReference[] = [
  {
    property: "--gitbook-widget-top",
    suffix: "top",
    defaultValue: "1rem",
  },
  {
    property: "--gitbook-widget-bottom",
    suffix: "bottom",
    defaultValue: "1rem",
  },
  {
    property: "--gitbook-widget-right",
    suffix: "right",
    defaultValue: "1rem",
  },
  {
    property: "--gitbook-widget-left",
    suffix: "left",
    defaultValue: "1rem",
  },
  {
    property: "--gitbook-widget-button-height",
    suffix: "button-height",
    defaultValue: "46px",
  },
  {
    property: "--gitbook-widget-radius",
    suffix: "radius",
    defaultValue: ".5rem",
  },
  {
    property: "--gitbook-widget-text-size",
    suffix: "text-size",
    defaultValue: "1rem",
  },
  {
    property: "--gitbook-widget-text-color",
    suffix: "text-color",
    defaultValue: "#656973",
    darkModeDefault: "#fff",
  },
  {
    property: "--gitbook-widget-border-color",
    suffix: "border-color",
    defaultValue: "#e5e5e5",
    darkModeDefault: "#202020",
  },
  {
    property: "--gitbook-widget-background-translucent",
    suffix: "background-translucent",
    defaultValue: "#ffffffe6",
    darkModeDefault: "#0f0f0fe6",
  },
  {
    property: "--gitbook-widget-background-translucent-hover",
    suffix: "background-translucent-hover",
    defaultValue: "#fafafae6",
    darkModeDefault: "#141414e6",
  },
  {
    property: "--gitbook-widget-background-solid",
    suffix: "background-solid",
    defaultValue: "#fff",
    darkModeDefault: "#f0f0f0",
  },
  {
    property: "--gitbook-widget-background-solid-hover",
    suffix: "background-solid-hover",
    defaultValue: "#fbfbfb",
  },
  {
    property: "--gitbook-widget-icon-size",
    suffix: "icon-size",
    defaultValue: "1.25rem",
  },
  {
    property: "--gitbook-widget-window-width",
    suffix: "window-width",
    defaultValue: "28rem",
  },
  {
    property: "--gitbook-widget-window-height",
    suffix: "window-height",
    defaultValue: "40rem",
  },
  {
    property: "--gitbook-widget-window-spacing",
    suffix: "window-spacing",
    defaultValue: ".5rem",
  },
  {
    property: "--gitbook-widget-window-bottom",
    suffix: "window-bottom",
    defaultValue:
      "calc(var(--gitbook-widget-bottom) + var(--gitbook-widget-button-height) + var(--gitbook-widget-window-spacing))",
  },
  {
    property: "--gitbook-widget-transition-duration-fast",
    suffix: "transition-duration-fast",
    defaultValue: ".2s",
  },
  {
    property: "--gitbook-widget-transition-duration-slow",
    suffix: "transition-duration-slow",
    defaultValue: ".5s",
  },
  {
    property: "--gitbook-widget-easing",
    suffix: "easing",
    defaultValue: "cubic-bezier(.25,1,.5,1)",
  },
  {
    property: "--gitbook-widget-easing-bounce",
    suffix: "easing-bounce",
    defaultValue: "cubic-bezier(.34,1.56,.64,1)",
  },
];
export const EDITABLE_ROOT_CSS_PROPERTIES = EDITABLE_ROOT_CSS_REFERENCE.map((item) => item.property);
const ROOT_CSS_PROPERTY_LOOKUP = new Map<string, string>(
  EDITABLE_ROOT_CSS_REFERENCE.flatMap((item) => [
    [item.property, item.property],
    [item.suffix, item.property],
  ]),
);

export function normalizeRootCssDeclarations(input: string): string[] {
  const normalizedDeclarations: string[] = [];

  for (const rawLine of input.split("\n")) {
    const line = rawLine.trim();
    if (!line || !line.endsWith(";") || line.includes("{") || line.includes("}")) {
      continue;
    }

    const colonIndex = line.indexOf(":");
    if (colonIndex <= 0) {
      continue;
    }

    const rawProperty = line.slice(0, colonIndex).trim();
    const property = ROOT_CSS_PROPERTY_LOOKUP.get(rawProperty);
    const value = line.slice(colonIndex + 1, -1).trim();

    if (!property || !value) {
      continue;
    }

    normalizedDeclarations.push(`${property}: ${value};`);
  }

  return normalizedDeclarations;
}

export function validateRootCssOverrides(input: string): ValidationResult {
  const lines = input.split("\n");

  for (const [index, rawLine] of lines.entries()) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const lineNumber = index + 1;

    if (line.includes("{") || line.includes("}")) {
      return {
        valid: false,
        message: `Line ${lineNumber}: selectors and braces are not allowed.`,
      };
    }

    if (!line.endsWith(";")) {
      return {
        valid: false,
        message: `Line ${lineNumber}: declaration must end with ';'.`,
      };
    }

    const colonIndex = line.indexOf(":");
    if (colonIndex <= 0) {
      return {
        valid: false,
        message: `Line ${lineNumber}: declaration must use 'property: value;'.`,
      };
    }

    const property = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1, -1).trim();

    if (!ROOT_CSS_PROPERTY_LOOKUP.has(property)) {
      return {
        valid: false,
        message: `Line ${lineNumber}: '${property}' is not an editable GitBook widget property.`,
      };
    }

    if (!value) {
      return {
        valid: false,
        message: `Line ${lineNumber}: custom property value cannot be empty.`,
      };
    }

    if (value.includes(";")) {
      return {
        valid: false,
        message: `Line ${lineNumber}: use one declaration per line.`,
      };
    }
  }

  return { valid: true };
}

export function resolveVisitorAuthMode(visitor: VisitorConfig | undefined): VisitorAuthMode {
  return visitor?.authMode === "provider-integration" ? "provider-integration" : "manual-jwt";
}

function normalizeVisitorConfig(visitor: VisitorConfig | undefined): VisitorConfig {
  if (!visitor) {
    return {
      authMode: "manual-jwt",
    };
  }

  const jwtToken = typeof visitor.jwt_token === "string" ? visitor.jwt_token : visitor.token;
  const normalized: VisitorConfig = {
    ...visitor,
    authMode: resolveVisitorAuthMode(visitor),
    jwt_token: jwtToken,
  };

  delete normalized.token;
  return normalized;
}

export function resolveVisitorJWTToken(visitor: VisitorConfig | undefined): string | undefined {
  const token = typeof visitor?.jwt_token === "string" ? visitor.jwt_token : visitor?.token;
  const trimmed = token?.trim();
  return trimmed ? trimmed : undefined;
}

export function withJWTTokenQueryParameter(frameURL: string, jwtToken?: string): string {
  if (!jwtToken) {
    return frameURL;
  }

  try {
    const url = new URL(frameURL);
    url.searchParams.delete("token");
    url.searchParams.set("jwt_token", jwtToken);
    return url.toString();
  } catch {
    return frameURL;
  }
}

export function buildActions(actions: ActionConfig[]) {
  return actions
    .filter((action) => action.label.trim().length > 0)
    .map((action) => {
      const label = action.label.trim();
      const icon = action.icon?.trim() || "circle-question";
      const value = action.value?.trim();

      return {
        icon,
        label,
        onClick: (api: {
          navigateToAssistant?: () => void;
          navigateToPage?: (path: string) => void;
        }) => {
          if (action.variant === "navigateToAssistant") {
            api.navigateToAssistant?.();
            return;
          }

          if (action.variant === "navigateToPage" && value) {
            api.navigateToPage?.(value);
            return;
          }

          if (action.variant === "openUrl" && value) {
            window.open(value, "_blank", "noopener,noreferrer");
          }
        },
      };
    });
}

export function buildTools(tools: ToolConfig[]) {
  return tools
    .filter((tool) => tool.name.trim().length > 0)
    .map((tool) => {
      const schema = parseToolInputSchema(tool);
      const response = tool.response || `{"tool":"${tool.name}","ok":true}`;
      const confirmationLabel = tool.confirmationLabel?.trim();
      const confirmationIcon = tool.confirmationIcon?.trim();

      return {
        name: tool.name,
        description: tool.description,
        input: schema,
        ...(confirmationLabel
          ? {
              confirmation: {
                label: confirmationLabel,
                ...(confirmationIcon ? { icon: confirmationIcon } : {}),
              },
            }
          : {}),
        execute: async () => response,
      };
    });
}

export function resolveColorScheme(
  colorScheme: EmbedColorScheme | undefined,
): EmbedColorScheme | undefined {
  return colorScheme === "light" || colorScheme === "dark" ? colorScheme : undefined;
}

export function resolveAssistantName(assistantName: string | undefined): string | undefined {
  const trimmed = assistantName?.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed.slice(0, ASSISTANT_NAME_MAX_LENGTH);
}

export function buildVisitor(visitor: VisitorConfig) {
  const jwtToken = resolveVisitorJWTToken(visitor);
  const traits = parseJsonObject(visitor.traitsJson);
  const unsignedClaims = parseJsonObject(visitor.unsignedClaimsJson);

  return {
    authMode: resolveVisitorAuthMode(visitor),
    jwt_token: jwtToken,
    user: {
      uuid: visitor.uuid || undefined,
      traits,
      unsignedClaims,
    },
  };
}

export function buildSharedConfiguration(sharedConfiguration: SharedConfiguration) {
  const assistantName = resolveAssistantName(sharedConfiguration.assistantName);
  const colorScheme = resolveColorScheme(sharedConfiguration.colorScheme);

  return {
    tabs: sharedConfiguration.tabs,
    closeButton: sharedConfiguration.closeButton,
    trademark: sharedConfiguration.trademark ?? true,
    assistantName,
    colorScheme,
    actions: buildActions(sharedConfiguration.actions),
    greeting: sharedConfiguration.greeting,
    suggestions: sharedConfiguration.suggestions.filter((value) => value.trim().length > 0),
    tools: buildTools(sharedConfiguration.tools),
    visitor: buildVisitor(sharedConfiguration.visitor),
  };
}

export function buildScriptConfiguration(
  sharedConfiguration: SharedConfiguration,
  scriptOnlyConfiguration: ScriptOnlyConfiguration,
) {
  return {
    ...buildSharedConfiguration(sharedConfiguration),
    button: scriptOnlyConfiguration.button,
  };
}

export function validateConfiguration(
  sharedConfiguration: SharedConfiguration,
  scriptOnlyConfiguration: ScriptOnlyConfiguration,
): ValidationResult {
  if (!Array.isArray(sharedConfiguration.tabs) || sharedConfiguration.tabs.length === 0) {
    return { valid: false, message: "tabs must contain at least one tab." };
  }

  if (sharedConfiguration.tabs.some((tab) => !EMBED_TABS.includes(tab))) {
    return { valid: false, message: `tabs may only contain ${EMBED_TABS.join(", ")}.` };
  }

  if (!Array.isArray(sharedConfiguration.suggestions)) {
    return { valid: false, message: "suggestions must be an array." };
  }

  if (typeof sharedConfiguration.closeButton !== "boolean") {
    return { valid: false, message: "closeButton must be a boolean." };
  }

  if (
    typeof sharedConfiguration.trademark !== "undefined" &&
    typeof sharedConfiguration.trademark !== "boolean"
  ) {
    return { valid: false, message: "trademark must be a boolean." };
  }

  if (
    typeof sharedConfiguration.assistantName === "string" &&
    sharedConfiguration.assistantName.trim().length > ASSISTANT_NAME_MAX_LENGTH
  ) {
    return {
      valid: false,
      message: `assistantName must be ${ASSISTANT_NAME_MAX_LENGTH} characters or fewer.`,
    };
  }

  if (
    typeof sharedConfiguration.colorScheme !== "undefined" &&
    !EMBED_COLOR_SCHEMES.includes(sharedConfiguration.colorScheme)
  ) {
    return { valid: false, message: "colorScheme must be 'light' or 'dark'." };
  }

  for (const tool of sharedConfiguration.tools) {
    if (tool.inputSchemaJson && tool.inputSchemaJson.trim()) {
      try {
        const schema = JSON.parse(tool.inputSchemaJson);
        if (!isObject(schema)) {
          return {
            valid: false,
            message: `Tool '${tool.name || tool.id}' input schema must be an object JSON value.`,
          };
        }
      } catch {
        return {
          valid: false,
          message: `Tool '${tool.name || tool.id}' input schema must be valid JSON.`,
        };
      }
    }
  }

  const visitorJsonFields = [
    {
      label: "visitor.traits",
      value: sharedConfiguration.visitor.traitsJson,
    },
    {
      label: "visitor.unsignedClaims",
      value: sharedConfiguration.visitor.unsignedClaimsJson,
    },
  ];

  for (const field of visitorJsonFields) {
    if (!field.value || !field.value.trim()) {
      continue;
    }

    try {
      const parsed = JSON.parse(field.value);
      if (!isObject(parsed)) {
        return { valid: false, message: `${field.label} must be a JSON object.` };
      }
    } catch {
      return { valid: false, message: `${field.label} must be valid JSON.` };
    }
  }

  if (scriptOnlyConfiguration.button?.icon) {
    if (!SCRIPT_BUTTON_ICONS.includes(scriptOnlyConfiguration.button.icon)) {
      return {
        valid: false,
        message: `script button icon must be one of ${SCRIPT_BUTTON_ICONS.join(", ")}.`,
      };
    }
  }

  return { valid: true };
}

export function parseConfigurationJson(input: string): {
  sharedConfiguration: SharedConfiguration;
  scriptOnlyConfiguration: ScriptOnlyConfiguration;
} {
  const parsed = JSON.parse(input);
  if (!isObject(parsed)) {
    throw new Error("Configuration JSON must be an object.");
  }

  const nextSharedRaw = (parsed.sharedConfiguration ?? parsed) as SharedConfiguration;
  const nextShared = {
    ...nextSharedRaw,
    closeButton: typeof nextSharedRaw.closeButton === "boolean" ? nextSharedRaw.closeButton : false,
    visitor: normalizeVisitorConfig(nextSharedRaw.visitor),
  } as SharedConfiguration;
  const nextScriptOnly = (parsed.scriptOnlyConfiguration ?? {
    button: parsed.button,
  }) as ScriptOnlyConfiguration;

  return {
    sharedConfiguration: nextShared,
    scriptOnlyConfiguration: nextScriptOnly,
  };
}

export function formatConfigurationJson(
  sharedConfiguration: SharedConfiguration,
  scriptOnlyConfiguration: ScriptOnlyConfiguration,
): string {
  return JSON.stringify(
    {
      sharedConfiguration,
      scriptOnlyConfiguration,
    },
    null,
    2,
  );
}

export function sanitizeState(input: PlaygroundState): PlaygroundState {
  const sharedConfiguration = input.sharedConfiguration || {
    tabs: ["assistant", "docs"],
    closeButton: false,
    actions: [],
    greeting: {},
    suggestions: [],
    tools: [],
    visitor: {},
  };

  return {
    ...input,
    implementation:
      input.implementation === "react" || input.implementation === "npm" || input.implementation === "script"
        ? input.implementation
        : "react",
    mode: input.mode === "assistant" || input.mode === "docs" ? input.mode : "assistant",
    rootCssOverrides: typeof input.rootCssOverrides === "string" ? input.rootCssOverrides : "",
    sharedConfiguration: {
      ...sharedConfiguration,
      tabs: Array.isArray(sharedConfiguration.tabs)
        ? sharedConfiguration.tabs.filter((tab) => EMBED_TABS.includes(tab))
        : ["assistant", "docs"],
      closeButton: typeof sharedConfiguration.closeButton === "boolean" ? sharedConfiguration.closeButton : false,
      trademark:
        typeof sharedConfiguration.trademark === "boolean" ? sharedConfiguration.trademark : true,
      assistantName:
        typeof sharedConfiguration.assistantName === "string" ? sharedConfiguration.assistantName : undefined,
      colorScheme: resolveColorScheme(sharedConfiguration.colorScheme),
      actions: Array.isArray(sharedConfiguration.actions)
        ? sharedConfiguration.actions
        : [],
      suggestions: Array.isArray(sharedConfiguration.suggestions)
        ? sharedConfiguration.suggestions
        : [],
      tools: Array.isArray(sharedConfiguration.tools) ? sharedConfiguration.tools : [],
      visitor: normalizeVisitorConfig(sharedConfiguration.visitor),
    },
    scriptOnlyConfiguration: input.scriptOnlyConfiguration || {},
    ui: input.ui || {
      activePanel: "controls",
      codeTab: "react",
    },
  };
}

/**
 * `:root:root` outranks the widget stylesheet's
 * `@media (prefers-color-scheme: dark) :root` block whichever order the
 * <style> and the widget's <link> end up in.
 */
export function buildRootCssRule(declarations: string[]): string {
  if (declarations.length === 0) {
    return "";
  }

  return [":root:root {", ...declarations.map((declaration) => `  ${declaration}`), "}"].join("\n");
}

/**
 * The script widget only flips its chrome variables inside a
 * `@media (prefers-color-scheme: dark)` block, so an explicit `colorScheme`
 * themes the iframe (via `?theme=`) but leaves `#gitbook-widget-window` and
 * `#gitbook-widget-button` on the host's own preference. Re-emit the widget's
 * own defaults for the variables that block touches so the chrome follows the
 * configured scheme too.
 */
export function resolveWidgetChromeDeclarations(
  colorScheme: EmbedColorScheme | undefined,
): string[] {
  const scheme = resolveColorScheme(colorScheme);
  if (!scheme) {
    return [];
  }

  return EDITABLE_ROOT_CSS_REFERENCE.filter((item) => item.darkModeDefault).map(
    (item) => `${item.property}: ${scheme === "dark" ? item.darkModeDefault : item.defaultValue};`,
  );
}
