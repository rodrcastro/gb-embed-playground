"use client";

import dynamic from "next/dynamic";
import { type ComponentType } from "react";

const GitBookProvider = dynamic(
  () => import("@gitbook/embed/react").then((mod) => mod.GitBookProvider),
  { ssr: false },
);

const GitBookFrame = dynamic(
  () => import("@gitbook/embed/react").then((mod) => mod.GitBookFrame),
  { ssr: false },
);
const GitBookFrameWithCloseButton = GitBookFrame as unknown as ComponentType<Record<string, unknown>>;

export default function GitBookEmbed() {
  return (
    <GitBookProvider siteURL="https://stage.docs.rodrcastro.dev">
      <GitBookFrameWithCloseButton
        className="gb-demo-frame"
        tabs={["assistant", "docs"]}
        closeButton
        actions={[]}
        greeting={{
          title: "Hey! 👋",
          subtitle: "How can we help?",
        }}
        suggestions={[]}
        tools={[]}
      />
    </GitBookProvider>
  );
}
