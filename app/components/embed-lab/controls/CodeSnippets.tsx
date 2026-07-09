"use client";

import { useEffect, useState } from "react";
import { GITBOOK_SCRIPT_URL } from "../defaults";
import { ScriptOnlyConfiguration, SharedConfiguration } from "../types";
import { resolveColorScheme, resolveVisitorJWTToken } from "../utils";

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
    jwt_token: resolveVisitorJWTToken(sharedConfiguration.visitor),
  };

  delete visitor.token;

  return {
    ...sharedConfiguration,
    visitor,
  };
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
  const normalizedConfiguration = normalizeSharedConfiguration(sharedConfiguration);

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
  const normalizedConfiguration = normalizeSharedConfiguration(sharedConfiguration);
  const modeNavigation =
    mode === "assistant"
      ? "frame.navigateToAssistant();"
      : "frame.navigateToPage(\"/\");";

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
const frameURL = new URL(
  client.getFrameURL({ colorScheme: config.colorScheme, visitor: { unsignedClaims } })
);
if (jwtToken) frameURL.searchParams.set("jwt_token", jwtToken);
iframe.src = frameURL.toString();
document.querySelector("#gitbook-target")?.append(iframe);

const frame = client.createFrame(iframe);
frame.configure({
  tabs: config.tabs,
  closeButton: config.closeButton,
  trademark: config.trademark,
  assistantName: config.assistantName,
  actions: config.actions,
  greeting: config.greeting,
  suggestions: config.suggestions,
  tools: config.tools
});
const unsubscribe = frame.on("close", () => {
  iframe.style.display = "none";
});
${modeNavigation}`;
}

export function buildScriptSnippet(
  siteURL: string,
  sharedConfiguration: SharedConfiguration,
  scriptOnlyConfiguration: ScriptOnlyConfiguration,
  mode: "assistant" | "docs",
) {
  const normalizedConfiguration = normalizeSharedConfiguration(sharedConfiguration);
  const siteScriptURL = (() => {
    try {
      const url = new URL(siteURL);
      url.pathname = `${url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`}~gitbook/embed/script.js`;
      url.search = "";
      url.hash = "";
      return url.toString();
    } catch {
      return "";
    }
  })();
  const unsignedClaimsJson = sharedConfiguration.visitor.unsignedClaimsJson?.trim();
  const unsignedClaimsExpression = unsignedClaimsJson
    ? `JSON.parse(${JSON.stringify(unsignedClaimsJson)})`
    : "undefined";
  const jwtToken = resolveVisitorJWTToken(sharedConfiguration.visitor) || "";
  const colorScheme = resolveColorScheme(sharedConfiguration.colorScheme);

  return `<script>
  const loadScript = (src) =>
    new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.async = true;
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load " + src));
      document.head.appendChild(script);
    });

  const bootstrapGitBook = async () => {
    const scriptSources = [${JSON.stringify(siteScriptURL)}, ${JSON.stringify(GITBOOK_SCRIPT_URL)}].filter(Boolean);
    for (const src of scriptSources) {
      try {
        await loadScript(src);
        if (window.GitBook) break;
      } catch (err) {
        console.error(err);
      }
    }

    if (!window.GitBook) {
      console.error("GitBook script failed to load from all sources.");
      return;
    }

    const jwtToken = ${JSON.stringify(jwtToken)}.trim();
    const unsignedClaims = ${unsignedClaimsExpression};
    const colorScheme = ${colorScheme ? JSON.stringify(colorScheme) : "undefined"};
    const frameOptions = {};
    if (jwtToken || unsignedClaims) {
      frameOptions.visitor = { jwt_token: jwtToken || undefined, unsignedClaims };
    }
    if (colorScheme) {
      frameOptions.colorScheme = colorScheme;
    }
    window.GitBook(
      "init",
      { siteURL: "${siteURL}" },
      Object.keys(frameOptions).length ? frameOptions : undefined
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
  };

  bootstrapGitBook();
</script>
`;
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
