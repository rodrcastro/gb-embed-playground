import { beforeEach, describe, expect, it } from "vitest";
import { LOCAL_STORAGE_KEY, URL_STATE_PARAM } from "../defaults";
import { PlaygroundState } from "../types";
import {
  deserializeStateFromParam,
  serializeStateToParam,
  stripSensitiveStateForPersistence,
  writeStateToLocalStorage,
  writeStateToUrl,
} from "./persistence";

function createStateWithToken(): PlaygroundState {
  return {
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
        authMode: "manual-jwt",
        jwt_token: "sensitive-token",
      },
    },
    scriptOnlyConfiguration: {},
    ui: {
      activePanel: "controls",
      codeTab: "react",
    },
  };
}

describe("state persistence security", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
        clear: () => store.clear(),
      },
    });
    window.localStorage.clear();
    window.history.replaceState({}, "", "/lab");
  });

  it("strips token values before persistence", () => {
    const state = createStateWithToken();
    const safeState = stripSensitiveStateForPersistence(state);

    expect(safeState.sharedConfiguration.visitor.jwt_token).toBeUndefined();
    expect(safeState.sharedConfiguration.visitor.token).toBeUndefined();
  });

  it("never serializes jwt token into URL parameter", () => {
    const state = createStateWithToken();
    const encoded = serializeStateToParam(state);
    const decoded = deserializeStateFromParam(encoded);

    expect(decoded).not.toBeNull();
    expect(decoded?.sharedConfiguration.visitor.jwt_token).toBeUndefined();
    expect(decoded?.sharedConfiguration.visitor.token).toBeUndefined();
  });

  it("writes redacted state to localStorage", () => {
    const state = createStateWithToken();
    writeStateToLocalStorage(state);

    const persisted = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    expect(persisted).toBeTruthy();
    expect(persisted).not.toContain("sensitive-token");
  });

  it("writes redacted state to URL", () => {
    const state = createStateWithToken();
    writeStateToUrl(state);

    const currentURL = new URL(window.location.href);
    const encoded = currentURL.searchParams.get(URL_STATE_PARAM);

    expect(encoded).toBeTruthy();
    const decoded = deserializeStateFromParam(encoded!);
    expect(decoded?.sharedConfiguration.visitor.jwt_token).toBeUndefined();
    expect(decoded?.sharedConfiguration.visitor.token).toBeUndefined();
  });
});
