import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConfigEditor } from "./ConfigEditor";
import { ScriptOnlyConfiguration, SharedConfiguration } from "../types";

// Enable React act() checks for createRoot-based tests.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function createSharedConfiguration(): SharedConfiguration {
  return {
    tabs: ["assistant", "docs"],
    closeButton: true,
    actions: [],
    greeting: {
      title: "Hello",
      subtitle: "World",
    },
    suggestions: [],
    tools: [],
    visitor: {
      authMode: "manual-jwt",
    },
  };
}

describe("ConfigEditor", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("updates shared configuration when closeButton is toggled", async () => {
    const onSharedConfigurationChange = vi.fn();
    const sharedConfiguration = createSharedConfiguration();
    const scriptOnlyConfiguration: ScriptOnlyConfiguration = {};

    await act(async () => {
      root.render(
        <ConfigEditor
          implementation="react"
          siteURL="https://docs.example.com"
          onSiteURLChange={vi.fn()}
          rootCssOverrides=""
          onRootCssOverridesChange={vi.fn()}
          rootCssValidation={{ valid: true }}
          sharedConfiguration={sharedConfiguration}
          scriptOnlyConfiguration={scriptOnlyConfiguration}
          onSharedConfigurationChange={onSharedConfigurationChange}
          onScriptOnlyConfigurationChange={vi.fn()}
          rawConfiguration="{}"
          onRawConfigurationChange={vi.fn()}
          onApplyRawConfiguration={vi.fn()}
          lastValidation={{ valid: true }}
        />,
      );
      await Promise.resolve();
    });

    const label = Array.from(container.querySelectorAll("label")).find((node) =>
      node.textContent?.includes("Show close button"),
    );
    expect(label).toBeTruthy();

    const checkbox = label?.querySelector("input[type=checkbox]") as HTMLInputElement | null;
    expect(checkbox).not.toBeNull();
    expect(checkbox?.checked).toBe(true);

    await act(async () => {
      checkbox!.click();
      await Promise.resolve();
    });

    expect(onSharedConfigurationChange).toHaveBeenCalledWith(
      expect.objectContaining({
        closeButton: false,
      }),
    );
  });
});
