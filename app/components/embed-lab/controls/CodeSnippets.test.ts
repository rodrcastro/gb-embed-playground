import { describe, expect, it } from "vitest";
import { GITBOOK_SCRIPT_URL } from "../defaults";
import { buildNpmSnippet, buildReactSnippet, buildScriptSnippet } from "./CodeSnippets";
import { ScriptOnlyConfiguration, SharedConfiguration } from "../types";

function createSharedConfiguration(): SharedConfiguration {
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

  it("omits the :root CSS block when there is nothing to declare", () => {
    const reactSnippet = buildReactSnippet("https://docs.example.com", createSharedConfiguration(), "assistant");
    const npmSnippet = buildNpmSnippet("https://docs.example.com", createSharedConfiguration(), "assistant");
    const scriptSnippet = buildScriptSnippet(
      "https://docs.example.com",
      { ...createSharedConfiguration(), colorScheme: undefined },
      {},
      "assistant",
      "",
    );

    expect(reactSnippet).not.toContain(":root");
    expect(npmSnippet).not.toContain(":root");
    expect(scriptSnippet).not.toContain("<style>");
  });

  it("themes the script widget chrome when colorScheme is set, even without overrides", () => {
    const snippet = buildScriptSnippet(
      "https://docs.example.com",
      createSharedConfiguration(),
      {},
      "assistant",
      "",
    );

    // The widget's own stylesheet only flips these inside a
    // `prefers-color-scheme: dark` query, so the snippet has to force them.
    expect(snippet).toContain("<style>");
    expect(snippet).toContain(":root:root {");
    expect(snippet).toContain("--gitbook-widget-background-translucent: #0f0f0fe6;");
    expect(snippet).toContain("--gitbook-widget-text-color: #fff;");
  });
});
