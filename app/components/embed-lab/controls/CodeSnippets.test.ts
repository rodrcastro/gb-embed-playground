import { describe, expect, it } from "vitest";
import { GITBOOK_SCRIPT_URL } from "../defaults";
import { buildNpmSnippet, buildReactSnippet, buildScriptSnippet } from "./CodeSnippets";
import { ScriptOnlyConfiguration, SharedConfiguration } from "../types";

function createSharedConfiguration(
  overrides: Partial<SharedConfiguration> = {},
): SharedConfiguration {
  return {
    tabs: ["assistant", "docs", "search"],
    closeButton: true,
    trademark: false,
    assistantName: "Nova",
    colorScheme: "dark",
    actions: [],
    greeting: {
      title: "Hello",
      subtitle: "World",
    },
    suggestions: ["How does this work?"],
    tools: [],
    visitor: {
      authMode: "manual-jwt",
      jwt_token: "jwt-value",
    },
    ...overrides,
  };
}

describe("CodeSnippets", () => {
  it("includes closeButton, trademark and assistantName in the NPM snippet", () => {
    const snippet = buildNpmSnippet("https://docs.example.com", createSharedConfiguration(), "assistant");

    expect(snippet).toContain("closeButton: config.closeButton");
    expect(snippet).toContain("trademark: config.trademark");
    expect(snippet).toContain("assistantName: config.assistantName");
    expect(snippet).toContain("colorScheme: config.colorScheme");
    expect(snippet).not.toContain(":root {");
  });

  it("uses fallback script sources and includes new config in script snippet", () => {
    const scriptOnlyConfiguration: ScriptOnlyConfiguration = {
      button: {
        icon: "sparkle",
      },
    };

    const snippet = buildScriptSnippet(
      "https://docs.example.com",
      createSharedConfiguration(),
      scriptOnlyConfiguration,
      "assistant",
      "window-height: 30px;",
    );

    expect(snippet).toContain(GITBOOK_SCRIPT_URL);
    expect(snippet).toContain("~gitbook/embed/script.js");
    expect(snippet).toContain('"closeButton": true');
    expect(snippet).toContain('"search"');
    expect(snippet).toContain('const colorScheme = "dark";');
    expect(snippet).toContain("<style>");
    expect(snippet).toContain("--gitbook-widget-window-height: 30px;");
  });

  it("omits :root CSS block when no overrides are provided", () => {
    const reactSnippet = buildReactSnippet("https://docs.example.com", createSharedConfiguration(), "assistant");
    const npmSnippet = buildNpmSnippet("https://docs.example.com", createSharedConfiguration(), "assistant");
    const scriptSnippet = buildScriptSnippet(
      "https://docs.example.com",
      createSharedConfiguration(),
      {},
      "assistant",
      "",
    );

    expect(reactSnippet).not.toContain(":root {");
    expect(npmSnippet).not.toContain(":root {");
    expect(scriptSnippet).not.toContain("<style>");
  });

  it("passes the configuration to GitBookFrame as props", () => {
    const snippet = buildReactSnippet("https://docs.example.com", createSharedConfiguration(), "assistant");

    expect(snippet).toContain("const configuration = {");
    expect(snippet).toContain("<GitBookFrame className=\"gitbook-embed\" {...configuration} />");
    // <GitBookFrame> has no mode prop in @gitbook/embed 0.7.
    expect(snippet).not.toContain('mode="assistant"');
  });

  it("includes defaultTab and defaultPage in the NPM snippet", () => {
    const snippet = buildNpmSnippet(
      "https://docs.example.com",
      createSharedConfiguration({ defaultTab: "search", defaultPage: "/start" }),
      "assistant",
    );

    expect(snippet).toContain("defaultTab: config.defaultTab");
    expect(snippet).toContain("defaultPage: config.defaultPage");
    expect(snippet).toContain('"defaultTab": "search"');
    expect(snippet).toContain('"defaultPage": "/start"');
  });

  it("drops the navigation call when the embed opens on defaultTab or defaultPage", () => {
    const withDefaults = createSharedConfiguration({ defaultTab: "search" });

    const npmSnippet = buildNpmSnippet("https://docs.example.com", withDefaults, "assistant");
    expect(npmSnippet).not.toContain("frame.navigateToAssistant();");
    expect(npmSnippet).toContain("// The embed opens on defaultTab/defaultPage.");

    const scriptSnippet = buildScriptSnippet("https://docs.example.com", withDefaults, {}, "docs", "");
    expect(scriptSnippet).not.toContain('window.GitBook("navigateToPage", "/")');
    expect(scriptSnippet).toContain("// The embed opens on defaultTab/defaultPage.");
  });

  it("keeps the navigation call when no opening option is set", () => {
    const snippet = buildNpmSnippet("https://docs.example.com", createSharedConfiguration(), "assistant");

    expect(snippet).toContain("frame.navigateToAssistant();");
  });

  it("ignores a defaultTab that is not among the enabled tabs", () => {
    const snippet = buildNpmSnippet(
      "https://docs.example.com",
      createSharedConfiguration({ tabs: ["assistant"], defaultTab: "search" }),
      "assistant",
    );

    expect(snippet).toContain("frame.navigateToAssistant();");
  });
});
