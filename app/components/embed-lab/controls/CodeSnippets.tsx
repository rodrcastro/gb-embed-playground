"use client";

import { useEffect, useState } from "react";
import { ScriptOnlyConfiguration, SharedConfiguration } from "../types";

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
  return `import { GitBookProvider, GitBookFrame } from "@gitbook/embed/react";

export function Preview() {
  return (
    <GitBookProvider siteURL="${siteURL}">
      <GitBookFrame
        className="gitbook-embed"
        configuration={${toJson(sharedConfiguration)}}
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
  const modeNavigation =
    mode === "assistant"
      ? "frame.navigateToAssistant();"
      : "frame.navigateToPage(\"/\");";

  return `import { createGitBook } from "@gitbook/embed";

const config = ${toJson(sharedConfiguration)};
const iframe = document.createElement("iframe");
iframe.style.width = "100%";
iframe.style.height = "100%";
const client = createGitBook({ siteURL: "${siteURL}" });
iframe.src = client.getFrameURL({
  visitor: {
    token: config.visitor.token,
    unsignedClaims: config.visitor.unsignedClaimsJson
      ? JSON.parse(config.visitor.unsignedClaimsJson)
      : undefined
  }
});
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
  const normalizedSiteURL = siteURL.endsWith("/") ? siteURL.slice(0, -1) : siteURL;
  const unsignedClaimsJson = sharedConfiguration.visitor.unsignedClaimsJson?.trim();
  const unsignedClaimsExpression = unsignedClaimsJson
    ? `JSON.parse(${JSON.stringify(unsignedClaimsJson)})`
    : "undefined";

  return `<script async src="${normalizedSiteURL}/~gitbook/embed/script.js"></script>
<script>
  const token = ${JSON.stringify(sharedConfiguration.visitor.token ?? "")}.trim();
  const unsignedClaims = ${unsignedClaimsExpression};
  window.GitBook(
    "init",
    { siteURL: "${siteURL}" },
    token || unsignedClaims
      ? { visitor: { token: token || undefined, unsignedClaims } }
      : undefined
  );
  window.GitBook("configure", {
    ...${toJson(sharedConfiguration)},
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
