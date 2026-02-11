import { describe, expect, it } from "vitest";
import { readCookieValueFromString, resolveSignInURL } from "./useProviderAuthBootstrap";

describe("provider auth helpers", () => {
  it("extracts and decodes cookie values", () => {
    const cookieString = "foo=1; gitbook-visitor-token=abc%20123; bar=2";
    expect(readCookieValueFromString(cookieString, "gitbook-visitor-token")).toBe("abc 123");
  });

  it("returns undefined when cookie is missing", () => {
    expect(readCookieValueFromString("foo=1; bar=2", "gitbook-visitor-token")).toBeUndefined();
  });

  it("normalizes sign-in url from siteURL", () => {
    expect(resolveSignInURL("https://docs.example.com/path?a=1#hash")).toBe("https://docs.example.com/path/");
    expect(resolveSignInURL("https://docs.example.com/path/")).toBe("https://docs.example.com/path/");
  });

  it("rejects unsafe protocols", () => {
    expect(resolveSignInURL("javascript:alert(1)")).toBeUndefined();
    expect(resolveSignInURL("data:text/html,hello")).toBeUndefined();
  });

  it("rejects insecure http outside localhost", () => {
    expect(resolveSignInURL("http://docs.example.com/path")).toBeUndefined();
    expect(resolveSignInURL("http://localhost:3000/path")).toBe("http://localhost:3000/path/");
  });
});
