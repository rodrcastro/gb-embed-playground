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

    iframe.className = "gb-demo-frame";
    iframe.src = gitbook.getFrameURL({});
    iframe.title = "GitBook Embed (NPM)";
    iframe.loading = "lazy";
    iframe.style.width = "100%";
    iframe.style.height = "100%";

    mountNode.appendChild(iframe);
    const frame = gitbook.createFrame(iframe);
    frame.configure({ closeButton: true } as never);
    const unsubscribe = frame.on("close", () => {
      iframe.style.display = "none";
    });

    return () => {
      unsubscribe();
      iframe.remove();
    };
  }, []);

  return <div ref={mountRef} className="gb-demo-frame-mount" />;
}
