import { EmbedMode } from "../types";

interface ModeSwitcherProps {
  value: EmbedMode;
  onChange: (value: EmbedMode) => void;
}

export function ModeSwitcher({ value, onChange }: ModeSwitcherProps) {
  return (
    <div className="lab-segment" role="radiogroup" aria-label="Initial embed mode">
      <button
        type="button"
        className={`lab-segment-item ${value === "assistant" ? "is-active" : ""}`}
        onClick={() => onChange("assistant")}
        role="radio"
        aria-checked={value === "assistant"}
      >
        Assistant
      </button>
      <button
        type="button"
        className={`lab-segment-item ${value === "docs" ? "is-active" : ""}`}
        onClick={() => onChange("docs")}
        role="radio"
        aria-checked={value === "docs"}
      >
        Docs
      </button>
    </div>
  );
}
