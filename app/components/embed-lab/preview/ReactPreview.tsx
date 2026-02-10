"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { SharedConfiguration } from "../types";
import { buildSharedConfiguration } from "../utils";

const GitBookProvider = dynamic(
  () => import("@gitbook/embed/react").then((mod) => mod.GitBookProvider),
  { ssr: false },
);

const GitBookFrame = dynamic(
  () => import("@gitbook/embed/react").then((mod) => mod.GitBookFrame),
  { ssr: false },
);

interface ReactPreviewProps {
  siteURL: string;
  sharedConfiguration: SharedConfiguration;
  className?: string;
}

export function ReactPreview({ siteURL, sharedConfiguration, className }: ReactPreviewProps) {
  const configuration = useMemo(() => buildSharedConfiguration(sharedConfiguration), [sharedConfiguration]);

  return (
    <GitBookProvider siteURL={siteURL}>
      <GitBookFrame
        className={className}
        tabs={configuration.tabs}
        actions={configuration.actions}
        greeting={configuration.greeting}
        suggestions={configuration.suggestions}
        tools={configuration.tools}
        visitor={configuration.visitor}
      />
    </GitBookProvider>
  );
}
