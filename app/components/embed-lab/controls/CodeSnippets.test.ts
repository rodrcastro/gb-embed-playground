import { describe, expect, it } from "vitest";
import { GITBOOK_SCRIPT_URL } from "../defaults";
import { buildNpmSnippet, buildReactSnippet, buildScriptSnippet } from "./CodeSnippets";
import { ScriptOnlyConfiguration, SharedConfiguration } from "../types";

function createSharedConfiguration(): SharedConfiguration {
  return {
    tabs: ["assistant", "docs"],
    closeButton: true,
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
  it("includes closeButton in the NPM snippet", () => {
    const snippet = buildNpmSnippet("https://docs.example.com", createSharedConfiguration(), "assistant");

    expect(snippet).toContain("closeButton: config.closeButton");
    expect(snippet).not.toContain(":root {");
  });

  it("uses fallback script sources and includes closeButton in script snippet", () => {
    const scriptOnlyConfiguration: ScriptOnlyConfiguration = {
      button: {
        icon: "sparkles",
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
});
