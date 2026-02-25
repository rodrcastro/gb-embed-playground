import { describe, expect, it } from "vitest";
import { PlaygroundState } from "./types";
import {
  normalizeRootCssDeclarations,
  resolveVisitorAuthMode,
  resolveVisitorJWTToken,
  sanitizeState,
  validateRootCssOverrides,
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
      "--gitbook-widget-background-solid: #111;\n\n--gitbook-widget-text-color: rgba(255, 255, 255, 0.9);",
    );
    expect(validation.valid).toBe(true);
  });

  it("rejects root CSS overrides without semicolon", () => {
    const validation = validateRootCssOverrides("--gitbook-widget-primary: #111");
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
      "\n  --gitbook-widget-background-solid: #111;  \n\n--gitbook-widget-text-color: #fff;\n",
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
});
