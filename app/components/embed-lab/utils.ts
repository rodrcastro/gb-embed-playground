import {
  ActionConfig,
  PlaygroundState,
  ScriptOnlyConfiguration,
  SharedConfiguration,
  ToolConfig,
  ValidationResult,
  VisitorConfig,
} from "./types";

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

export function buildActions(actions: ActionConfig[]) {
  return actions
    .filter((action) => action.label.trim().length > 0)
    .map((action) => {
      const label = action.label.trim();
      const value = action.value?.trim();

      return {
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

      return {
        name: tool.name,
        description: tool.description,
        input: schema,
        execute: async () => response,
      };
    });
}

export function buildVisitor(visitor: VisitorConfig) {
  const traits = parseJsonObject(visitor.traitsJson);
  const unsignedClaims = parseJsonObject(visitor.unsignedClaimsJson);

  return {
    token: visitor.token || undefined,
    user: {
      uuid: visitor.uuid || undefined,
      traits,
      unsignedClaims,
    },
  };
}

export function buildSharedConfiguration(sharedConfiguration: SharedConfiguration) {
  return {
    tabs: sharedConfiguration.tabs,
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

  if (!Array.isArray(sharedConfiguration.suggestions)) {
    return { valid: false, message: "suggestions must be an array." };
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
    const validIcons = ["question", "sparkles"];
    if (!validIcons.includes(scriptOnlyConfiguration.button.icon)) {
      return { valid: false, message: "script button icon must be 'question' or 'sparkles'." };
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

  const nextShared = (parsed.sharedConfiguration ?? parsed) as SharedConfiguration;
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
    sharedConfiguration: {
      ...sharedConfiguration,
      tabs: Array.isArray(sharedConfiguration.tabs)
        ? sharedConfiguration.tabs.filter((tab) => tab === "assistant" || tab === "docs")
        : ["assistant", "docs"],
      actions: Array.isArray(sharedConfiguration.actions)
        ? sharedConfiguration.actions
        : [],
      suggestions: Array.isArray(sharedConfiguration.suggestions)
        ? sharedConfiguration.suggestions
        : [],
      tools: Array.isArray(sharedConfiguration.tools) ? sharedConfiguration.tools : [],
      visitor: sharedConfiguration.visitor || {},
    },
    scriptOnlyConfiguration: input.scriptOnlyConfiguration || {},
    ui: input.ui || {
      activePanel: "controls",
      codeTab: "react",
    },
  };
}
