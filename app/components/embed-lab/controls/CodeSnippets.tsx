import { ScriptOnlyConfiguration, SharedConfiguration } from "../types";

interface CodeSnippetsProps {
  siteURL: string;
  mode: "assistant" | "docs";
  sharedConfiguration: SharedConfiguration;
  scriptOnlyConfiguration: ScriptOnlyConfiguration;
}

function toJson(value: unknown) {
  return JSON.stringify(value, null, 2);
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
  return (
    <div className="lab-code-stack">
      <div>
        <p className="lab-code-title">React</p>
        <pre className="lab-code-block">{buildReactSnippet(siteURL, sharedConfiguration, mode)}</pre>
      </div>
      <div>
        <p className="lab-code-title">NPM</p>
        <pre className="lab-code-block">{buildNpmSnippet(siteURL, sharedConfiguration, mode)}</pre>
      </div>
      <div>
        <p className="lab-code-title">Script</p>
        <pre className="lab-code-block">
          {buildScriptSnippet(siteURL, sharedConfiguration, scriptOnlyConfiguration, mode)}
        </pre>
      </div>
    </div>
  );
}
