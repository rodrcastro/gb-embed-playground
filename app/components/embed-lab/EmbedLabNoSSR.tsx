"use client";

import { useSyncExternalStore } from "react";
import EmbedLab from "./EmbedLab";

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export default function EmbedLabNoSSR() {
  const isClient = useIsClient();
  if (!isClient) {
    return null;
  }

  return <EmbedLab />;
}
