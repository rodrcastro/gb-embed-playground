"use client";

import { useEffect, useState } from "react";
import { ScriptOnlyConfiguration, SharedConfiguration } from "../types";
import { resolveVisitorAuthMode, resolveVisitorJWTToken } from "../utils";

interface CodeSnippetsProps {
  siteURL: string;
  mode: "assistant" | "docs";
  sharedConfiguration: SharedConfiguration;
  scriptOnlyConfiguration: ScriptOnlyConfiguration;
}

type CodeLanguage = "tsx" | "ts" | "html";

const SHIKI_URL = "https://esm.sh/shiki@1.29.2/bundle/web";
let shikiHighlighterPromise: Promise<{
  codeToHtml: (code: string, options: { lang: CodeLanguage; theme: string }) => string;
}> | null = null;

function toJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function normalizeSharedConfiguration(sharedConfiguration: SharedConfiguration) {
  const visitor = {
    ...sharedConfiguration.visitor,
    authMode: resolveVisitorAuthMode(sharedConfiguration.visitor),
    jwt_token: resolveVisitorJWTToken(sharedConfiguration.visitor),
  };

  delete visitor.token;

  return {
    ...sharedConfiguration,
    visitor,
  };
}

function buildProviderAuthHelpers(siteURL: string, typed: boolean) {
  const cookieArg = typed ? "cookieName: string" : "cookieName";
  const cookieReturn = typed ? ": string | undefined" : "";
  const resolveArg = typed ? "siteURL: string" : "siteURL";
  const resolveReturn = typed ? ": string" : "";
  const signInArg = typed ? "siteURL: string" : "siteURL";
  const signInReturn = typed ? ": Promise<string>" : "";

  return `const GITBOOK_VISITOR_COOKIE_NAME = "gitbook-visitor-token";
const AUTH_POLL_INTERVAL_MS = 800;
const AUTH_TIMEOUT_MS = 120000;

function readCookieValue(${cookieArg})${cookieReturn} {
  const target = \`\${cookieName}=\`;
  for (const cookie of document.cookie.split(";")) {
    const trimmed = cookie.trim();
    if (!trimmed.startsWith(target)) continue;
    const value = trimmed.slice(target.length);
    if (!value) return undefined;
    return decodeURIComponent(value);
  }
  return undefined;
}

function resolveSignInURL(${resolveArg})${resolveReturn} {
  const url = new URL(siteURL);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("siteURL must use https (or http for localhost).");
  }
  if (
    url.protocol === "http:" &&
    url.hostname !== "localhost" &&
    url.hostname !== "127.0.0.1"
  ) {
    throw new Error("siteURL must use https outside localhost.");
  }
  url.pathname = url.pathname.endsWith("/") ? url.pathname : \`\${url.pathname}/\`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

function signInWithProvider(${signInArg})${signInReturn} {
  return new Promise((resolve, reject) => {
    const popup = window.open(
      resolveSignInURL(siteURL),
      "gitbook-provider-auth",
      "popup,width=520,height=760"
    );
    if (!popup) {
      reject(new Error("Sign-in popup was blocked."));
      return;
    }
    try {
      popup.opener = null;
    } catch {}

    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      const token = readCookieValue(GITBOOK_VISITOR_COOKIE_NAME);
      if (token) {
        window.clearInterval(interval);
        try {
          popup.close();
        } catch {}
        resolve(token);
        return;
      }

      if (Date.now() - startedAt >= AUTH_TIMEOUT_MS) {
        window.clearInterval(interval);
        try {
          popup.close();
        } catch {}
        reject(new Error("Timed out waiting for provider authentication."));
      }
    }, AUTH_POLL_INTERVAL_MS);
  });
}`;
}

async function getShikiHighlighter() {
  if (!shikiHighlighterPromise) {
    shikiHighlighterPromise = import(
      /* webpackIgnore: true */
      SHIKI_URL
    ).then(async (mod) => {
      const createHighlighter =
        (mod as { createHighlighter?: (input: unknown) => Promise<unknown> }).createHighlighter;

      if (typeof createHighlighter !== "function") {
        throw new Error("Shiki createHighlighter was not found.");
      }

      const highlighter = (await createHighlighter({
        themes: ["github-dark"],
        langs: ["tsx", "ts", "html", "javascript"],
      })) as {
        codeToHtml: (code: string, options: { lang: CodeLanguage; theme: string }) => string;
      };

      return highlighter;
    });
  }

  return shikiHighlighterPromise;
}

interface CodeSnippetBlockProps {
  title: string;
  language: CodeLanguage;
  code: string;
}

function CodeSnippetBlock({ title, language, code }: CodeSnippetBlockProps) {
  const [copied, setCopied] = useState(false);
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const highlight = async () => {
      try {
        const highlighter = await getShikiHighlighter();
        if (cancelled) {
          return;
        }
        setHighlightedHtml(highlighter.codeToHtml(code, { lang: language, theme: "github-dark" }));
      } catch {
        if (cancelled) {
          return;
        }
        setHighlightedHtml(null);
      }
    };

    highlight();

    return () => {
      cancelled = true;
    };
  }, [code, language]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="lab-code-card">
      <div className="lab-code-header">
        <p className="lab-code-title">{title}</p>
        <button
          type="button"
          className={`lab-copy-button ${copied ? "is-copied" : ""}`}
          onClick={onCopy}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {highlightedHtml ? (
        <div className="lab-code-block shiki-host" dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
      ) : (
        <pre className="lab-code-block">{code}</pre>
      )}
    </div>
  );
}

export function buildReactSnippet(
  siteURL: string,
  sharedConfiguration: SharedConfiguration,
  mode: "assistant" | "docs",
) {
  const authMode = resolveVisitorAuthMode(sharedConfiguration.visitor);
  const normalizedConfiguration = normalizeSharedConfiguration(sharedConfiguration);
  const unsignedClaimsExpression = normalizedConfiguration.visitor.unsignedClaimsJson
    ? `JSON.parse(config.visitor.unsignedClaimsJson)`
    : "undefined";

  if (authMode === "provider-integration") {
    const modeNavigation =
      mode === "assistant"
        ? "frame.navigateToAssistant();"
        : "frame.navigateToPage(\"/\");";

    return `import { GitBookProvider, useGitBook } from "@gitbook/embed/react";
import { useEffect, useMemo, useRef, useState } from "react";

const config = ${toJson(normalizedConfiguration)};
${buildProviderAuthHelpers(siteURL, true)}

function ProviderFrame() {
  const gitbook = useGitBook();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const frameRef = useRef<ReturnType<typeof gitbook.createFrame> | null>(null);
  const [jwtToken, setJwtToken] = useState<string | undefined>(() =>
    readCookieValue(GITBOOK_VISITOR_COOKIE_NAME)
  );
  const [authState, setAuthState] = useState<"needs-signin" | "authenticating" | "ready" | "error">(
    jwtToken ? "ready" : "needs-signin"
  );
  const [error, setError] = useState<string | null>(null);

  const frameURL = useMemo(() => {
    const url = new URL(
      gitbook.getFrameURL({
        visitor: {
          unsignedClaims: ${unsignedClaimsExpression}
        }
      })
    );
    if (jwtToken) url.searchParams.set("jwt_token", jwtToken);
    return url.toString();
  }, [gitbook, jwtToken]);

  useEffect(() => {
    if (!iframeRef.current) return;
    frameRef.current = gitbook.createFrame(iframeRef.current);
  }, [gitbook, frameURL]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    frame.configure({
      tabs: config.tabs,
      actions: config.actions,
      greeting: config.greeting,
      suggestions: config.suggestions,
      tools: config.tools
    });
    ${modeNavigation}
  }, [authState]);

  const startSignIn = async () => {
    setAuthState("authenticating");
    setError(null);
    try {
      const token = await signInWithProvider("${siteURL}");
      setJwtToken(token);
      setAuthState("ready");
    } catch (error) {
      setAuthState("error");
      setError(error instanceof Error ? error.message : "Authentication failed.");
    }
  };

  return (
    <div>
      {authState !== "ready" ? (
        <button type="button" onClick={startSignIn} disabled={authState === "authenticating"}>
          {authState === "authenticating" ? "Waiting for sign-in..." : "Sign in with provider"}
        </button>
      ) : null}
      {error ? <p>{error}</p> : null}
      <iframe ref={iframeRef} title="GitBook" src={frameURL} width="100%" height="100%" />
    </div>
  );
}

export function Preview() {
  return (
    <GitBookProvider siteURL="${siteURL}">
      <ProviderFrame />
    </GitBookProvider>
  );
}`;
  }

  return `import { GitBookProvider, GitBookFrame } from "@gitbook/embed/react";

export function Preview() {
  return (
    <GitBookProvider siteURL="${siteURL}">
      <GitBookFrame
        className="gitbook-embed"
        configuration={${toJson(normalizedConfiguration)}}
        mode="${mode}"
      />
    </GitBookProvider>
  );
}`;
}

export function buildNpmSnippet(
  siteURL: string,
  sharedConfiguration: SharedConfiguration,
  mode: "assistant" | "docs",
) {
  const authMode = resolveVisitorAuthMode(sharedConfiguration.visitor);
  const normalizedConfiguration = normalizeSharedConfiguration(sharedConfiguration);
  const modeNavigation =
    mode === "assistant"
      ? "frame.navigateToAssistant();"
      : "frame.navigateToPage(\"/\");";

  if (authMode === "provider-integration") {
    return `import { createGitBook } from "@gitbook/embed";

const config = ${toJson(normalizedConfiguration)};
${buildProviderAuthHelpers(siteURL, true)}

async function mountGitBook() {
  const iframe = document.createElement("iframe");
  iframe.style.width = "100%";
  iframe.style.height = "100%";

  const client = createGitBook({ siteURL: "${siteURL}" });
  const unsignedClaims = config.visitor.unsignedClaimsJson
    ? JSON.parse(config.visitor.unsignedClaimsJson)
    : undefined;

  let jwtToken = readCookieValue(GITBOOK_VISITOR_COOKIE_NAME);
  if (!jwtToken) {
    jwtToken = await signInWithProvider("${siteURL}");
  }

  const frameURL = new URL(client.getFrameURL({ visitor: { unsignedClaims } }));
  if (jwtToken) frameURL.searchParams.set("jwt_token", jwtToken);
  iframe.src = frameURL.toString();
  document.querySelector("#gitbook-target")?.append(iframe);

  const frame = client.createFrame(iframe);
  frame.configure({
    tabs: config.tabs,
    actions: config.actions,
    greeting: config.greeting,
    suggestions: config.suggestions,
    tools: config.tools
  });
  ${modeNavigation}
}

mountGitBook().catch(console.error);`;
  }

  return `import { createGitBook } from "@gitbook/embed";

const config = ${toJson(normalizedConfiguration)};
const iframe = document.createElement("iframe");
iframe.style.width = "100%";
iframe.style.height = "100%";
const client = createGitBook({ siteURL: "${siteURL}" });
const jwtToken = (config.visitor.jwt_token || "").trim();
const unsignedClaims = config.visitor.unsignedClaimsJson
  ? JSON.parse(config.visitor.unsignedClaimsJson)
  : undefined;
const frameURL = new URL(client.getFrameURL({ visitor: { unsignedClaims } }));
if (jwtToken) frameURL.searchParams.set("jwt_token", jwtToken);
iframe.src = frameURL.toString();
document.querySelector("#gitbook-target")?.append(iframe);

const frame = client.createFrame(iframe);
frame.configure({
  tabs: config.tabs,
  actions: config.actions,
  greeting: config.greeting,
  suggestions: config.suggestions,
  tools: config.tools
});
${modeNavigation}`;
}

export function buildScriptSnippet(
  siteURL: string,
  sharedConfiguration: SharedConfiguration,
  scriptOnlyConfiguration: ScriptOnlyConfiguration,
  mode: "assistant" | "docs",
) {
  const authMode = resolveVisitorAuthMode(sharedConfiguration.visitor);
  const normalizedConfiguration = normalizeSharedConfiguration(sharedConfiguration);
  const normalizedSiteURL = siteURL.endsWith("/") ? siteURL.slice(0, -1) : siteURL;
  const unsignedClaimsJson = sharedConfiguration.visitor.unsignedClaimsJson?.trim();
  const unsignedClaimsExpression = unsignedClaimsJson
    ? `JSON.parse(${JSON.stringify(unsignedClaimsJson)})`
    : "undefined";
  const jwtToken = resolveVisitorJWTToken(sharedConfiguration.visitor) || "";

  if (authMode === "provider-integration") {
    return `<script async src="${normalizedSiteURL}/~gitbook/embed/script.js"></script>
<script>
  ${buildProviderAuthHelpers(siteURL, false)}
  const unsignedClaims = ${unsignedClaimsExpression};

  (async () => {
    let jwtToken = readCookieValue(GITBOOK_VISITOR_COOKIE_NAME);
    if (!jwtToken) {
      jwtToken = await signInWithProvider("${siteURL}");
    }

    window.GitBook(
      "init",
      { siteURL: "${siteURL}" },
      jwtToken || unsignedClaims
        ? { visitor: { jwt_token: jwtToken || undefined, unsignedClaims } }
        : undefined
    );
    window.GitBook("configure", {
      ...${toJson(normalizedConfiguration)},
      ...${toJson(scriptOnlyConfiguration)}
    });
    window.GitBook("show");
    window.GitBook("open");
    ${
      mode === "assistant"
        ? 'window.GitBook("navigateToAssistant");'
        : 'window.GitBook("navigateToPage", "/");'
    }
  })().catch(console.error);
</script>`;
  }

  return `<script async src="${normalizedSiteURL}/~gitbook/embed/script.js"></script>
<script>
  const jwtToken = ${JSON.stringify(jwtToken)}.trim();
  const unsignedClaims = ${unsignedClaimsExpression};
  window.GitBook(
    "init",
    { siteURL: "${siteURL}" },
    jwtToken || unsignedClaims
      ? { visitor: { jwt_token: jwtToken || undefined, unsignedClaims } }
      : undefined
  );
  window.GitBook("configure", {
    ...${toJson(normalizedConfiguration)},
    ...${toJson(scriptOnlyConfiguration)}
  });
  window.GitBook("show");
  window.GitBook("open");
  ${
    mode === "assistant"
      ? 'window.GitBook("navigateToAssistant");'
      : 'window.GitBook("navigateToPage", "/");'
  }
</script>`;
}

export function CodeSnippets({
  siteURL,
  mode,
  sharedConfiguration,
  scriptOnlyConfiguration,
}: CodeSnippetsProps) {
  const reactSnippet = buildReactSnippet(siteURL, sharedConfiguration, mode);
  const npmSnippet = buildNpmSnippet(siteURL, sharedConfiguration, mode);
  const scriptSnippet = buildScriptSnippet(siteURL, sharedConfiguration, scriptOnlyConfiguration, mode);

  return (
    <div className="lab-code-stack">
      <CodeSnippetBlock title="React" language="tsx" code={reactSnippet} />
      <CodeSnippetBlock title="NPM" language="ts" code={npmSnippet} />
      <CodeSnippetBlock title="Script" language="html" code={scriptSnippet} />
    </div>
  );
}
