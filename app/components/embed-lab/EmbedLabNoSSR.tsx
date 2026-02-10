"use client";

import dynamic from "next/dynamic";

const EmbedLab = dynamic(() => import("./EmbedLab"), {
  ssr: false,
});

export default function EmbedLabNoSSR() {
  return <EmbedLab />;
}
