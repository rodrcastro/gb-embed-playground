"use client";

import dynamic from "next/dynamic";
import { memo, useMemo } from "react";
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

function ReactPreviewComponent({ siteURL, sharedConfiguration, className }: ReactPreviewProps) {
  const configuration = useMemo(() => buildSharedConfiguration(sharedConfiguration), [sharedConfiguration]);
  const greeting = useMemo(
    () => ({
      title: configuration.greeting?.title ?? "",
      subtitle: configuration.greeting?.subtitle ?? "",
    }),
    [configuration.greeting?.title, configuration.greeting?.subtitle],
  );
  const frameClassName = [className, "gitbook-embed-light-surface"].filter(Boolean).join(" ");

  return (
    <GitBookProvider siteURL={siteURL}>
      <GitBookFrame
        className={frameClassName}
        tabs={configuration.tabs}
        actions={configuration.actions as never}
        greeting={greeting}
        suggestions={configuration.suggestions}
        tools={configuration.tools as never}
        visitor={configuration.visitor as never}
      />
    </GitBookProvider>
  );
}

export const ReactPreview = memo(ReactPreviewComponent);
