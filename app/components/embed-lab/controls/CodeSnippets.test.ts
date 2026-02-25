import { describe, expect, it } from "vitest";
import { GITBOOK_SCRIPT_URL } from "../defaults";
import { buildNpmSnippet, buildScriptSnippet } from "./CodeSnippets";
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
    );

    expect(snippet).toContain(GITBOOK_SCRIPT_URL);
    expect(snippet).toContain("~gitbook/embed/script.js");
    expect(snippet).toContain('"closeButton": true');
  });
});
