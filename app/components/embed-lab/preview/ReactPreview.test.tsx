import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReactPreview } from "./ReactPreview";
import { SharedConfiguration } from "../types";

// Enable React act() checks for createRoot-based tests.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const configureMock = vi.fn();
const navigateToAssistantMock = vi.fn();
const navigateToPageMock = vi.fn();
const onMock = vi.fn();
const getFrameURLMock = vi.fn();
const createFrameMock = vi.fn();
const unsubscribeMock = vi.fn();

let closeListener: (() => void) | undefined;

vi.mock("@gitbook/embed/react", () => {
  return {
    GitBookProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useGitBook: () => ({
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
    suggestions: ["How to start?"],
    tools: [],
    visitor: {
      authMode: "manual-jwt",
    },
  };
}

describe("ReactPreview", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    closeListener = undefined;
    configureMock.mockReset();
    navigateToAssistantMock.mockReset();
    navigateToPageMock.mockReset();
    onMock.mockReset();
    getFrameURLMock.mockReset();
    createFrameMock.mockReset();
    unsubscribeMock.mockReset();

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

  it("configures frame with closeButton and handles close event", async () => {
    const onStatus = vi.fn();

    await act(async () => {
      root.render(
        <ReactPreview
          siteURL="https://docs.example.com"
          mode="assistant"
          sharedConfiguration={createSharedConfiguration()}
          effectiveJWTToken="jwt-value"
          onStatus={onStatus}
        />,
      );
      await Promise.resolve();
    });

    expect(configureMock).toHaveBeenCalledTimes(1);
    expect(configureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tabs: ["assistant", "docs"],
        closeButton: true,
        suggestions: ["How to start?"],
      }),
    );
    expect(navigateToAssistantMock).toHaveBeenCalledTimes(1);

    const iframe = container.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.src).toContain("jwt_token=jwt-value");

    closeListener?.();
    expect(iframe?.style.display).toBe("none");
    expect(onStatus).toHaveBeenCalledWith("React embed close event received. Frame hidden.", "info");
  });

  it("navigates to docs page in docs mode", async () => {
    await act(async () => {
      root.render(
        <ReactPreview
          siteURL="https://docs.example.com"
          mode="docs"
          sharedConfiguration={createSharedConfiguration()}
          onStatus={vi.fn()}
        />,
      );
      await Promise.resolve();
    });

    expect(navigateToPageMock).toHaveBeenCalledWith("/");
    expect(navigateToAssistantMock).not.toHaveBeenCalled();
  });
});
