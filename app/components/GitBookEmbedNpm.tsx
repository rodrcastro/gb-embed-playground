"use client";

import { createGitBook } from "@gitbook/embed";
import { useEffect, useRef } from "react";

const SITE_URL = "https://stage.docs.rodrcastro.dev";

export default function GitBookEmbedNpm() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mountNode = mountRef.current;
    if (!mountNode) {
      return;
    }

    const gitbook = createGitBook({ siteURL: SITE_URL });
    const iframe = document.createElement("iframe");

    iframe.className = "gitbook-embed";
    iframe.src = gitbook.getFrameURL({});
    iframe.title = "GitBook Embed (NPM)";
    iframe.loading = "lazy";

    mountNode.appendChild(iframe);

    return () => {
      iframe.remove();
    };
  }, []);

  return <div ref={mountRef} />;
}
