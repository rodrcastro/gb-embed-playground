import { EmbedImplementation } from "../types";

const OPTIONS: Array<{ value: EmbedImplementation; label: string }> = [
  { value: "react", label: "React" },
  { value: "npm", label: "NPM" },
  { value: "script", label: "Script" },
];

interface ImplementationSwitcherProps {
  value: EmbedImplementation;
  onChange: (value: EmbedImplementation) => void;
}

export function ImplementationSwitcher({ value, onChange }: ImplementationSwitcherProps) {
  return (
    <div className="lab-segment" role="radiogroup" aria-label="Embed implementation">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`lab-segment-item ${value === option.value ? "is-active" : ""}`}
          onClick={() => onChange(option.value)}
          role="radio"
          aria-checked={value === option.value}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
