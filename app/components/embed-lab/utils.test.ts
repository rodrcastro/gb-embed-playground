import { describe, expect, it } from "vitest";
import { PlaygroundState } from "./types";
import {
  resolveVisitorAuthMode,
  resolveVisitorJWTToken,
  sanitizeState,
  withJWTTokenQueryParameter,
} from "./utils";

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
  });
});
