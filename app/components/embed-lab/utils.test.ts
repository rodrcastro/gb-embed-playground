import { describe, expect, it } from "vitest";
import { PlaygroundState, SharedConfiguration } from "./types";
import {
  CONFIRMATION_CONTEXT_MAX_LENGTH,
  buildSharedConfiguration,
  buildTools,
  interpolateConfirmationContext,
  normalizeRootCssDeclarations,
  resolveDefaultPage,
  resolveDefaultTab,
  resolveAssistantName,
  resolveColorScheme,
  resolveVisitorAuthMode,
  resolveVisitorJWTToken,
  sanitizeState,
  validateConfiguration,
  validateRootCssOverrides,
  withJWTTokenQueryParameter,
} from "./utils";

function createSharedConfiguration(overrides: Partial<SharedConfiguration> = {}): SharedConfiguration {
  return {
    tabs: ["assistant", "docs", "search"],
    closeButton: true,
    trademark: true,
    assistantName: "Nova",
    colorScheme: "dark",
    actions: [],
    greeting: { title: "Hi", subtitle: "There" },
    suggestions: [],
    tools: [],
    visitor: { authMode: "manual-jwt" },
    ...overrides,
  };
}

describe("embed utils", () => {
  it("defaults authMode to manual-jwt", () => {
    expect(resolveVisitorAuthMode(undefined)).toBe("manual-jwt");
    expect(resolveVisitorAuthMode({})).toBe("manual-jwt");
  });

  it("resolves authMode to provider integration when selected", () => {
    expect(resolveVisitorAuthMode({ authMode: "provider-integration" })).toBe("provider-integration");
  });

  it("prefers jwt_token over legacy token and trims", () => {
    expect(resolveVisitorJWTToken({ jwt_token: "  jwt-value  ", token: "legacy" })).toBe("jwt-value");
    expect(resolveVisitorJWTToken({ token: " legacy-only " })).toBe("legacy-only");
    expect(resolveVisitorJWTToken({ jwt_token: "   " })).toBeUndefined();
  });

  it("rewrites token query parameter as jwt_token", () => {
    const result = withJWTTokenQueryParameter(
      "https://docs.example.com/~gitbook/embed?token=old&x=1",
      "new-jwt",
    );
    const url = new URL(result);

    expect(url.searchParams.get("token")).toBeNull();
    expect(url.searchParams.get("jwt_token")).toBe("new-jwt");
    expect(url.searchParams.get("x")).toBe("1");
  });

  it("normalizes missing visitor auth mode during state sanitization", () => {
    const rawState = {
      implementation: "react",
      siteURL: "https://docs.example.com",
      mode: "assistant",
      sharedConfiguration: {
        tabs: ["assistant", "docs"],
        closeButton: false,
        actions: [],
        greeting: {},
        suggestions: [],
        tools: [],
        visitor: {
          token: "legacy-token",
        },
      },
      scriptOnlyConfiguration: {},
      ui: {
        activePanel: "controls",
        codeTab: "react",
      },
    } as PlaygroundState;

    const sanitized = sanitizeState(rawState);
    expect(sanitized.sharedConfiguration.visitor.authMode).toBe("manual-jwt");
    expect(sanitized.sharedConfiguration.visitor.jwt_token).toBe("legacy-token");
    expect(sanitized.sharedConfiguration.visitor.token).toBeUndefined();
    expect(sanitized.rootCssOverrides).toBe("");
  });

  it("accepts valid gitbook root CSS overrides", () => {
    const validation = validateRootCssOverrides(
      "background-solid: #111;\n\ntext-color: rgba(255, 255, 255, 0.9);",
    );
    expect(validation.valid).toBe(true);
  });

  it("rejects root CSS overrides without semicolon", () => {
    const validation = validateRootCssOverrides("window-height: 30px");
    expect(validation.valid).toBe(false);
    expect(validation.message).toContain("must end with ';'");
  });

  it("rejects non-gitbook custom properties in root CSS overrides", () => {
    const validation = validateRootCssOverrides("--background: #111;");
    expect(validation.valid).toBe(false);
    expect(validation.message).toContain("not an editable GitBook widget property");
  });

  it("rejects selectors and braces in root CSS overrides", () => {
    const validation = validateRootCssOverrides(":root { --gitbook-widget-background-solid: #111; }");
    expect(validation.valid).toBe(false);
    expect(validation.message).toContain("selectors and braces");
  });

  it("normalizes root CSS declarations by trimming and removing blank lines", () => {
    const normalized = normalizeRootCssDeclarations(
      "\n  background-solid: #111;  \n\ntext-color: #fff;\n",
    );
    expect(normalized).toEqual([
      "--gitbook-widget-background-solid: #111;",
      "--gitbook-widget-text-color: #fff;",
    ]);
  });

  it("rejects unknown gitbook-widget properties that are not editable", () => {
    const validation = validateRootCssOverrides("--gitbook-widget-primary: #111;");
    expect(validation.valid).toBe(false);
    expect(validation.message).toContain("not an editable GitBook widget property");
  });

  it("accepts full property names for backward compatibility", () => {
    const validation = validateRootCssOverrides("--gitbook-widget-window-height: 30px;");
    expect(validation.valid).toBe(true);
  });

  it("resolves colorScheme only for valid values", () => {
    expect(resolveColorScheme("light")).toBe("light");
    expect(resolveColorScheme("dark")).toBe("dark");
    expect(resolveColorScheme(undefined)).toBeUndefined();
    expect(resolveColorScheme("neon" as never)).toBeUndefined();
  });

  it("trims and caps assistant name to 32 characters", () => {
    expect(resolveAssistantName("  Nova  ")).toBe("Nova");
    expect(resolveAssistantName("")).toBeUndefined();
    expect(resolveAssistantName("x".repeat(40))).toHaveLength(32);
  });

  it("emits a confirmation only when a label is provided", () => {
    const [withConfirmation, withoutConfirmation] = buildTools([
      {
        id: "t1",
        name: "run",
        confirmationLabel: "  Run it  ",
        confirmationIcon: "rocket",
      },
      { id: "t2", name: "noop" },
    ]) as Array<{ confirmation?: { label: string; icon?: string } }>;

    expect(withConfirmation.confirmation).toEqual({ label: "Run it", icon: "rocket" });
    expect(withoutConfirmation.confirmation).toBeUndefined();
  });

  it("defaults trademark to true and forwards colorScheme in built config", () => {
    const built = buildSharedConfiguration(createSharedConfiguration({ trademark: undefined }));
    expect(built.trademark).toBe(true);
    expect(built.colorScheme).toBe("dark");
    expect(built.assistantName).toBe("Nova");
  });

  it("keeps the search tab through state sanitization", () => {
    const sanitized = sanitizeState({
      implementation: "react",
      siteURL: "https://docs.example.com",
      mode: "assistant",
      sharedConfiguration: createSharedConfiguration({ tabs: ["assistant", "docs", "search"] }),
      scriptOnlyConfiguration: {},
      ui: { activePanel: "controls", codeTab: "react" },
    } as PlaygroundState);
    expect(sanitized.sharedConfiguration.tabs).toContain("search");
  });

  it("validates new configuration fields", () => {
    expect(validateConfiguration(createSharedConfiguration(), {}).valid).toBe(true);
    expect(
      validateConfiguration(createSharedConfiguration({ colorScheme: "neon" as never }), {}).valid,
    ).toBe(false);
    expect(
      validateConfiguration(createSharedConfiguration({ assistantName: "x".repeat(33) }), {}).valid,
    ).toBe(false);
    expect(
      validateConfiguration(createSharedConfiguration({ tabs: ["invalid" as never] }), {}).valid,
    ).toBe(false);
    expect(
      validateConfiguration(createSharedConfiguration(), { button: { icon: "sparkles" as never } })
        .valid,
    ).toBe(false);
    expect(
      validateConfiguration(createSharedConfiguration(), { button: { icon: "sparkle" } }).valid,
    ).toBe(true);
  });

  it("keeps a default tab only when it is one of the enabled tabs", () => {
    expect(resolveDefaultTab(["assistant", "docs"], "docs")).toBe("docs");
    expect(resolveDefaultTab(["assistant", "docs"], "search")).toBeUndefined();
    expect(resolveDefaultTab(["assistant"], undefined)).toBeUndefined();
    expect(resolveDefaultTab(["assistant"], "nope" as never)).toBeUndefined();
  });

  it("trims the default page and drops empty values", () => {
    expect(resolveDefaultPage("  /guides/start  ")).toBe("/guides/start");
    expect(resolveDefaultPage("   ")).toBeUndefined();
    expect(resolveDefaultPage(undefined)).toBeUndefined();
  });

  it("includes defaultTab and defaultPage in the built configuration", () => {
    const built = buildSharedConfiguration(
      createSharedConfiguration({ defaultTab: "search", defaultPage: " /start " }),
    ) as { defaultTab?: string; defaultPage?: string };

    expect(built.defaultTab).toBe("search");
    expect(built.defaultPage).toBe("/start");
  });

  it("omits a defaultTab that is not enabled", () => {
    const built = buildSharedConfiguration(
      createSharedConfiguration({ tabs: ["assistant"], defaultTab: "docs" }),
    ) as { defaultTab?: string };

    expect(built.defaultTab).toBeUndefined();
  });

  it("rejects a defaultTab outside the enabled tabs", () => {
    expect(
      validateConfiguration(createSharedConfiguration({ tabs: ["assistant"], defaultTab: "docs" }), {}),
    ).toEqual({
      valid: false,
      message: "defaultTab 'docs' must be one of the enabled tabs.",
    });

    expect(
      validateConfiguration(createSharedConfiguration({ defaultTab: "chat" as never }), {}),
    ).toEqual({
      valid: false,
      message: "defaultTab must be one of assistant, docs, search.",
    });
  });

  it("drops a stale defaultTab when sanitizing persisted state", () => {
    const sanitized = sanitizeState({
      sharedConfiguration: createSharedConfiguration({ tabs: ["assistant"], defaultTab: "search" }),
      scriptOnlyConfiguration: {},
    } as PlaygroundState);

    expect(sanitized.sharedConfiguration.defaultTab).toBeUndefined();
    expect(sanitized.sharedConfiguration.defaultPage).toBeUndefined();
  });

  it("resolves placeholders in a confirmation context against the tool input", () => {
    expect(
      interpolateConfirmationContext("Deploy {{service}} to {{env.name}}?", {
        service: "api",
        env: { name: "production" },
      }),
    ).toBe("Deploy api to production?");
  });

  it("renders unknown placeholders as empty and serializes objects", () => {
    expect(interpolateConfirmationContext("[{{missing}}]", {})).toBe("[]");
    expect(interpolateConfirmationContext("{{a}}", { a: { b: 1 } })).toBe('{"b":1}');
    expect(interpolateConfirmationContext("{{n}}", { n: 0 })).toBe("0");
  });

  it("truncates an interpolated context to the embed limit", () => {
    const resolved = interpolateConfirmationContext("{{value}}", {
      value: "x".repeat(CONFIRMATION_CONTEXT_MAX_LENGTH + 50),
    });

    expect(resolved).toHaveLength(CONFIRMATION_CONTEXT_MAX_LENGTH);
  });

  it("builds a static confirmation context", () => {
    const [tool] = buildTools([
      {
        id: "t1",
        name: "deploy",
        confirmationLabel: "Deploy",
        confirmationContext: "  Ships to production.  ",
      },
    ]) as Array<{ confirmation?: { label: string; context?: string } }>;

    expect(tool.confirmation).toEqual({ label: "Deploy", context: "Ships to production." });
  });

  it("builds a function confirmation when the context is dynamic", () => {
    const [tool] = buildTools([
      {
        id: "t1",
        name: "deploy",
        confirmationLabel: "Deploy",
        confirmationIcon: "rocket",
        confirmationContext: "Deploy {{service}}?",
        confirmationDynamic: true,
      },
    ]) as Array<{ confirmation?: (input: object) => { label: string; icon?: string; context?: string } }>;

    expect(typeof tool.confirmation).toBe("function");
    expect(tool.confirmation?.({ service: "api" })).toEqual({
      label: "Deploy",
      icon: "rocket",
      context: "Deploy api?",
    });
  });

  it("ignores a dynamic confirmation without a context template", () => {
    const [tool] = buildTools([
      { id: "t1", name: "deploy", confirmationLabel: "Deploy", confirmationDynamic: true },
    ]) as Array<{ confirmation?: unknown }>;

    expect(tool.confirmation).toEqual({ label: "Deploy" });
  });

  it("rejects a confirmation context longer than the embed limit", () => {
    const result = validateConfiguration(
      createSharedConfiguration({
        tools: [
          {
            id: "t1",
            name: "deploy",
            confirmationLabel: "Deploy",
            confirmationContext: "x".repeat(CONFIRMATION_CONTEXT_MAX_LENGTH + 1),
          },
        ],
      }),
      {},
    );

    expect(result.valid).toBe(false);
    expect(result.message).toContain("512 characters or fewer");
  });

  it("passes the tool input schema under inputSchema", () => {
    const [tool] = buildTools([
      { id: "t1", name: "lookup", inputSchemaJson: '{"type":"object","properties":{}}' },
    ]) as Array<{ inputSchema?: Record<string, unknown> }>;

    expect(tool.inputSchema).toEqual({ type: "object", properties: {} });
  });

  it("returns the mock response as a tool output object", async () => {
    const [jsonTool, textTool] = buildTools([
      { id: "t1", name: "status", response: '{"status":"ok"}' },
      { id: "t2", name: "text", response: "all good" },
    ]) as Array<{ execute: () => Promise<{ output: unknown }> }>;

    expect(await jsonTool.execute()).toEqual({ output: { status: "ok" } });
    expect(await textTool.execute()).toEqual({ output: { result: "all good" } });
  });
});
