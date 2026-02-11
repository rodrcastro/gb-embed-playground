import { LOCAL_STORAGE_KEY, URL_STATE_PARAM } from "../defaults";
import { PlaygroundState } from "../types";
import { sanitizeState } from "../utils";

function encodeBase64Url(input: string): string {
  const encoded = btoa(unescape(encodeURIComponent(input)));
  return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  const decoded = atob(padded);
  return decodeURIComponent(escape(decoded));
}

export function serializeStateToParam(state: PlaygroundState): string {
  return encodeBase64Url(JSON.stringify(stripSensitiveStateForPersistence(state)));
}

export function deserializeStateFromParam(value: string): PlaygroundState | null {
  try {
    const json = decodeBase64Url(value);
    const parsed = JSON.parse(json) as PlaygroundState;
    return sanitizeState(parsed);
  } catch {
    return null;
  }
}

export function readStateFromUrl(): PlaygroundState | null {
  if (typeof window === "undefined") {
    return null;
  }

  const url = new URL(window.location.href);
  const value = url.searchParams.get(URL_STATE_PARAM);
  if (!value) {
    return null;
  }

  return deserializeStateFromParam(value);
}

export function writeStateToUrl(state: PlaygroundState): void {
  if (typeof window === "undefined") {
    return;
  }

  const safeState = stripSensitiveStateForPersistence(state);
  const url = new URL(window.location.href);
  url.searchParams.set(URL_STATE_PARAM, serializeStateToParam(safeState));
  window.history.replaceState({}, "", url.toString());
}

export function readStateFromLocalStorage(): PlaygroundState | null {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!value) {
    return null;
  }

  try {
    return sanitizeState(JSON.parse(value) as PlaygroundState);
  } catch {
    return null;
  }
}

export function writeStateToLocalStorage(state: PlaygroundState): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stripSensitiveStateForPersistence(state)));
}

export function clearPersistedState(): void {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.delete(URL_STATE_PARAM);
  window.history.replaceState({}, "", url.toString());
  window.localStorage.removeItem(LOCAL_STORAGE_KEY);
}

export function stripSensitiveStateForPersistence(state: PlaygroundState): PlaygroundState {
  return {
    ...state,
    sharedConfiguration: {
      ...state.sharedConfiguration,
      visitor: {
        ...state.sharedConfiguration.visitor,
        jwt_token: undefined,
        token: undefined,
      },
    },
  };
}
