"use client";

import { type ReactNode } from "react";
import { createPortal } from "react-dom";

export default function FloatingEmbedPortal({
  children,
}: {
  children: ReactNode;
}) {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="floating-embed-shell">{children}</div>,
    document.body,
  );
}
