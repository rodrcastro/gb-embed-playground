"use client";

import dynamic from "next/dynamic";

const GitBookProvider = dynamic(
  () => import("@gitbook/embed/react").then((mod) => mod.GitBookProvider),
  { ssr: false },
);

const GitBookFrame = dynamic(
  () => import("@gitbook/embed/react").then((mod) => mod.GitBookFrame),
  { ssr: false },
);

export default function GitBookEmbed() {
  return (
    <GitBookProvider siteURL="https://stage.docs.rodrcastro.dev">
      <GitBookFrame
        className="gitbook-embed"
        tabs={["assistant", "docs"]}
        actions={[]}
        greeting={{
          title: "GitBook Assistant",
          subtitle: "Ask about docs and product usage.",
        }}
        suggestions={[]}
        tools={[]}
      />
    </GitBookProvider>
  );
}
