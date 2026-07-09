import { PlaygroundState } from "./types";

export const DEFAULT_PLAYGROUND_STATE: PlaygroundState = {
  implementation: "react",
  siteURL: "https://stage.docs.rodrcastro.dev",
  mode: "assistant",
  rootCssOverrides: "",
  sharedConfiguration: {
    tabs: ["assistant", "docs", "search"],
    closeButton: true,
    trademark: true,
    assistantName: "Nebula Assistant",
    colorScheme: undefined,
    actions: [
      {
        id: "a1",
        label: "Open docs home",
        icon: "circle-question",
        variant: "navigateToPage",
        value: "/",
      },
    ],
    greeting: {
      title: "Nebula Sync Assistant",
      subtitle: "Ask anything about syncing, APIs, or onboarding.",
    },
    suggestions: [
      "How do I connect a workspace?",
      "Show me the sync status API",
      "Where do I configure roles?",
    ],
    tools: [
      {
        id: "t1",
        name: "release_status",
        description: "Return a mocked release status payload",
        inputSchemaJson:
          '{"type":"object","properties":{"releaseId":{"type":"string"}},"required":["releaseId"]}',
        response: '{"status":"healthy","eta":"2h"}',
        confirmationLabel: "Check release status",
        confirmationIcon: "rocket",
      },
    ],
    visitor: {
      authMode: "manual-jwt",
      uuid: "embed-lab-visitor",
      traitsJson: '{"plan":"free","team":"qa"}',
      unsignedClaimsJson: '',
    },
  },
  scriptOnlyConfiguration: {
    button: {
      icon: "sparkle",
      label: "Help",
      className: "bg-white text-black",
    },
  },
  ui: {
    activePanel: "controls",
    codeTab: "react",
  },
};

export const GITBOOK_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/@gitbook/embed@0.5.1/dist/script.js";

export const URL_STATE_PARAM = "gb";
export const LOCAL_STORAGE_KEY = "gitbook-embed-lab-state";
