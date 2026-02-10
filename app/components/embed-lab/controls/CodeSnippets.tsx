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

const iframe = document.createElement("iframe");
iframe.style.width = "100%";
iframe.style.height = "100%";
document.querySelector("#gitbook-target")?.append(iframe);

const client = createGitBook({ siteURL: "${siteURL}" });
const frame = client.createFrame(iframe);
frame.configure({
  mode: "${mode}",
  ...${toJson(sharedConfiguration)}
});
${modeNavigation}`;
}

export function buildScriptSnippet(
  siteURL: string,
  sharedConfiguration: SharedConfiguration,
  scriptOnlyConfiguration: ScriptOnlyConfiguration,
  mode: "assistant" | "docs",
) {
  return `<script async src="https://cdn.jsdelivr.net/npm/@gitbook/embed/dist/script.js"></script>
<script>
  window.GitBook = window.GitBook || [];
  window.GitBook.push((api) => {
    api.configure({
      siteURL: "${siteURL}",
      mode: "${mode}",
      ...${toJson(sharedConfiguration)},
      ...${toJson(scriptOnlyConfiguration)}
    });
  });
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
