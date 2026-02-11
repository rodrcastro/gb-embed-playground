"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { VisitorConfig } from "../types";
import { resolveVisitorAuthMode, resolveVisitorJWTToken } from "../utils";

export const GITBOOK_VISITOR_COOKIE_NAME = "gitbook-visitor-token";
export const AUTH_POLL_INTERVAL_MS = 800;
export const AUTH_TIMEOUT_MS = 120000;
const AUTH_POPUP_FEATURES = "popup,width=520,height=760";

export type ProviderAuthState = "ready" | "needs-signin" | "authenticating" | "error";

interface UseProviderAuthBootstrapInput {
  siteURL: string;
  visitor: VisitorConfig;
  onStatus: (message: string, level?: "info" | "success" | "error") => void;
}

interface UseProviderAuthBootstrapResult {
  effectiveJWTToken?: string;
  state: ProviderAuthState;
  message?: string;
  authRevision: number;
  startSignIn: () => void;
}

export function readCookieValueFromString(cookieString: string, cookieName: string): string | undefined {
  const target = `${cookieName}=`;
  for (const cookie of cookieString.split(";")) {
    const trimmed = cookie.trim();
    if (!trimmed.startsWith(target)) {
      continue;
    }

    const value = trimmed.slice(target.length);
    if (!value) {
      return undefined;
    }

    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  return undefined;
}

function readCookieValue(cookieName: string): string | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }

  return readCookieValueFromString(document.cookie, cookieName);
}

export function resolveSignInURL(siteURL: string): string | undefined {
  try {
    const url = new URL(siteURL);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return undefined;
    }
    if (
      url.protocol === "http:" &&
      url.hostname !== "localhost" &&
      url.hostname !== "127.0.0.1"
    ) {
      return undefined;
    }

    url.pathname = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return undefined;
  }
}

export function useProviderAuthBootstrap({
  siteURL,
  visitor,
  onStatus,
}: UseProviderAuthBootstrapInput): UseProviderAuthBootstrapResult {
  const authMode = resolveVisitorAuthMode(visitor);
  const manualJWTToken = resolveVisitorJWTToken(visitor);
  const initialProviderToken =
    authMode === "provider-integration"
      ? readCookieValue(GITBOOK_VISITOR_COOKIE_NAME)
      : undefined;
  const [providerJWTToken, setProviderJWTToken] = useState<string | undefined>(initialProviderToken);
  const [authRevision, setAuthRevision] = useState(0);
  const [state, setState] = useState<ProviderAuthState>(() => {
    if (authMode === "manual-jwt") {
      return "ready";
    }
    return initialProviderToken ? "ready" : "needs-signin";
  });
  const [message, setMessage] = useState<string | undefined>(() => {
    if (authMode === "manual-jwt") {
      return undefined;
    }
    return initialProviderToken
      ? "Authenticated with provider."
      : "Sign in with your provider to load authenticated content.";
  });
  const popupRef = useRef<Window | null>(null);
  const intervalRef = useRef<number | undefined>(undefined);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
  }, []);

  const closePopup = useCallback(() => {
    if (popupRef.current) {
      try {
        popupRef.current.close();
      } catch {
        // Best effort close when cross-origin policies sever opener state.
      }
    }
    popupRef.current = null;
  }, []);

  const completeWithProviderToken = useCallback(
    (token: string, statusMessage?: string) => {
      setProviderJWTToken(token);
      setAuthRevision((previous) => previous + 1);
      setState("ready");
      setMessage("Authenticated with provider.");
      if (statusMessage) {
        onStatus(statusMessage, "success");
      }
      stopPolling();
      closePopup();
    },
    [closePopup, onStatus, stopPolling],
  );

  const handlePopupClosedWithoutDetectedToken = useCallback(() => {
    stopPolling();
    popupRef.current = null;
    setAuthRevision((previous) => previous + 1);
    setState("needs-signin");
    setMessage("Sign-in window closed. Session refresh applied. If still unauthenticated, try again.");
    onStatus("Sign-in window closed. Refreshed embed session.", "info");
  }, [onStatus, stopPolling]);

  const tryCompleteWithCookieToken = useCallback(
    (statusMessage?: string) => {
      const cookieToken = readCookieValue(GITBOOK_VISITOR_COOKIE_NAME);
      if (!cookieToken) {
        return false;
      }

      completeWithProviderToken(cookieToken, statusMessage);
      return true;
    },
    [completeWithProviderToken],
  );

  useEffect(() => {
    stopPolling();
    closePopup();
  }, [authMode, closePopup, siteURL, stopPolling]);

  useEffect(() => {
    return () => {
      stopPolling();
      closePopup();
    };
  }, [closePopup, stopPolling]);

  useEffect(() => {
    if (authMode !== "provider-integration") {
      return;
    }

    const syncOnReturn = () => {
      if (tryCompleteWithCookieToken("Authenticated with provider. Preview refreshed.")) {
        return;
      }

      if (state === "authenticating" && popupRef.current?.closed) {
        handlePopupClosedWithoutDetectedToken();
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncOnReturn();
      }
    };

    window.addEventListener("focus", syncOnReturn);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", syncOnReturn);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [authMode, handlePopupClosedWithoutDetectedToken, state, tryCompleteWithCookieToken]);

  const startSignIn = useCallback(() => {
    if (authMode === "manual-jwt") {
      return;
    }
    if (state === "authenticating") {
      return;
    }

    const signInURL = resolveSignInURL(siteURL);
    if (!signInURL) {
      setState("error");
      setMessage("Invalid siteURL. Enter a valid docs URL before signing in.");
      onStatus("Unable to open provider sign-in because siteURL is invalid.", "error");
      return;
    }

    stopPolling();
    closePopup();

    const popup = window.open(signInURL, "gitbook-provider-auth", AUTH_POPUP_FEATURES);
    if (!popup) {
      setState("error");
      setMessage("Sign-in popup was blocked. Allow popups and try again.");
      onStatus("Provider sign-in popup was blocked by the browser.", "error");
      return;
    }

    try {
      popup.opener = null;
    } catch {
      // Best effort hardening against opener access.
    }

    popupRef.current = popup;
    popup.focus();
    setState("authenticating");
    setMessage("Waiting for provider sign-in to complete...");
    onStatus("Provider sign-in popup opened. Complete authentication to continue.", "info");

    const startedAt = Date.now();
    intervalRef.current = window.setInterval(() => {
      if (tryCompleteWithCookieToken("Authenticated with provider. Preview refreshed.")) {
        return;
      }

      if (popup.closed) {
        handlePopupClosedWithoutDetectedToken();
        return;
      }

      if (Date.now() - startedAt >= AUTH_TIMEOUT_MS) {
        stopPolling();
        closePopup();
        setState("error");
        setMessage("Timed out waiting for provider authentication. Try again.");
        onStatus("Timed out waiting for provider authentication.", "error");
      }
    }, AUTH_POLL_INTERVAL_MS);
  }, [
    authMode,
    closePopup,
    handlePopupClosedWithoutDetectedToken,
    onStatus,
    siteURL,
    state,
    stopPolling,
    tryCompleteWithCookieToken,
  ]);

  const effectiveJWTToken = useMemo(() => {
    if (authMode === "provider-integration") {
      const cookieToken = readCookieValue(GITBOOK_VISITOR_COOKIE_NAME);
      return providerJWTToken || cookieToken;
    }
    return manualJWTToken;
  }, [authMode, manualJWTToken, providerJWTToken]);

  const resolvedState: ProviderAuthState = useMemo(() => {
    if (authMode === "manual-jwt") {
      return "ready";
    }

    if (effectiveJWTToken) {
      return "ready";
    }

    return state;
  }, [authMode, effectiveJWTToken, state]);

  const resolvedMessage = useMemo(() => {
    if (authMode === "manual-jwt") {
      return undefined;
    }

    if (effectiveJWTToken) {
      return "Authenticated with provider.";
    }

    return message || "Sign in with your provider to load authenticated content.";
  }, [authMode, effectiveJWTToken, message]);

  return {
    effectiveJWTToken,
    state: resolvedState,
    message: resolvedMessage,
    authRevision,
    startSignIn,
  };
}
