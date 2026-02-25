import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NpmPreview } from "./NpmPreview";
import { SharedConfiguration } from "../types";

// Enable React act() checks for createRoot-based tests.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const configureMock = vi.fn();
const navigateToAssistantMock = vi.fn();
const navigateToPageMock = vi.fn();
const onMock = vi.fn();
const unsubscribeMock = vi.fn();
const getFrameURLMock = vi.fn();
const createFrameMock = vi.fn();

let closeListener: (() => void) | undefined;

vi.mock("@gitbook/embed", () => {
  return {
    createGitBook: () => ({
      getFrameURL: getFrameURLMock,
      createFrame: createFrameMock,
    }),
  };
});

function createSharedConfiguration(): SharedConfiguration {
  return {
    tabs: ["assistant", "docs"],
    closeButton: true,
    actions: [],
    greeting: {
      title: "Hello",
      subtitle: "World",
    },
    suggestions: ["What can you do?"],
    tools: [],
    visitor: {
      authMode: "manual-jwt",
    },
  };
}

async function waitFor(check: () => boolean, timeoutMs = 1600): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (check()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("Timed out waiting for expected state.");
}

describe("NpmPreview", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    closeListener = undefined;
    configureMock.mockReset();
    navigateToAssistantMock.mockReset();
    navigateToPageMock.mockReset();
    onMock.mockReset();
    unsubscribeMock.mockReset();
    getFrameURLMock.mockReset();
    createFrameMock.mockReset();

    onMock.mockImplementation((event: string, listener: () => void) => {
      if (event === "close") {
        closeListener = listener;
      }
      return unsubscribeMock;
    });

    getFrameURLMock.mockReturnValue("https://docs.example.com/~gitbook/embed?foo=1");
    createFrameMock.mockReturnValue({
      configure: configureMock,
      navigateToAssistant: navigateToAssistantMock,
      navigateToPage: navigateToPageMock,
      on: onMock,
    });

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

  it("configures frame with closeButton and hides iframe on close event", async () => {
    await act(async () => {
      root.render(
        <NpmPreview
          siteURL="https://docs.example.com"
          mode="assistant"
          sharedConfiguration={createSharedConfiguration()}
          effectiveJWTToken="jwt-value"
          onStatus={vi.fn()}
        />,
      );
    });

    await act(async () => {
      await waitFor(() => configureMock.mock.calls.length > 0);
    });

    expect(configureMock).toHaveBeenCalledTimes(1);
    expect(configureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tabs: ["assistant", "docs"],
        closeButton: true,
        suggestions: ["What can you do?"],
      }),
    );
    expect(navigateToAssistantMock).toHaveBeenCalledTimes(1);

    const iframe = container.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.src).toContain("jwt_token=jwt-value");

    expect(closeListener).toBeTypeOf("function");
    closeListener?.();
    expect(iframe?.style.display).toBe("none");
  });

  it("navigates to docs page in docs mode", async () => {
    await act(async () => {
      root.render(
        <NpmPreview
          siteURL="https://docs.example.com"
          mode="docs"
          sharedConfiguration={createSharedConfiguration()}
          onStatus={vi.fn()}
        />,
      );
    });

    await act(async () => {
      await waitFor(() => navigateToPageMock.mock.calls.length > 0);
    });

    expect(navigateToPageMock).toHaveBeenCalledWith("/");
    expect(navigateToAssistantMock).not.toHaveBeenCalled();
  });
});
